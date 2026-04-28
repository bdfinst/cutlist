import type { PieceDefinition, PlacedPiece, SheetConfig, SheetLayout, CutlistResult } from './types';

interface FreeRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface Sheet {
	freeRects: FreeRect[];
	placed: PlacedPiece[];
}

interface ExpandedPiece {
	id: string;
	label: string;
	width: number;
	height: number;
	color: string;
}

interface Placement {
	sheetIndex: number;
	rectIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
	rotated: boolean;
	score: number;
}

type SortStrategy = (a: ExpandedPiece, b: ExpandedPiece) => number;
type ScoreFn = (rectW: number, rectH: number, pieceW: number, pieceH: number) => number;
type SplitFn = (rectW: number, rectH: number, rightW: number, bottomH: number) => boolean;

const SORT_STRATEGIES: SortStrategy[] = [
	// Area descending
	(a, b) => b.width * b.height - a.width * a.height,
	// Height descending (tall pieces first)
	(a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height),
	// Width descending
	(a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height),
	// Perimeter descending
	(a, b) => (b.width + b.height) - (a.width + a.height)
];

// Lower score = better placement.
const SCORE_FNS: ScoreFn[] = [
	// Best Area Fit — minimize leftover area
	(rw, rh, pw, ph) => rw * rh - pw * ph,
	// Best Short Side Fit — minimize the smaller leftover dimension
	(rw, rh, pw, ph) => Math.min(rw - pw, rh - ph),
	// Best Long Side Fit — minimize the larger leftover dimension
	(rw, rh, pw, ph) => Math.max(rw - pw, rh - ph)
];

// Returns true when the right rect should take the parent's full height
// (preserving a tall vertical strip); false to give the bottom rect the full width.
const SPLIT_FNS: SplitFn[] = [
	// Heuristic: keep the larger of the two leftover regions intact
	(rectW, rectH, rightW, bottomH) => rightW * rectH >= rectW * bottomH,
	// Always preserve a tall right strip — good for narrow long pieces (cleats)
	() => true,
	// Always preserve a wide bottom strip — good for wide short pieces
	() => false
];

const EPSILON = 0.0001;

const MAX_EXPANDED_PIECES = 500;

export function calculateCutlist(pieces: PieceDefinition[], config: SheetConfig): CutlistResult {
	const expanded = expandPieces(pieces);

	if (expanded.length > MAX_EXPANDED_PIECES) {
		return {
			sheets: [],
			totalSheets: 0,
			totalWastePercent: 0,
			unfitPieces: pieces
		};
	}

	let bestResult: CutlistResult | null = null;

	for (const sortStrategy of SORT_STRATEGIES) {
		const sorted = expanded.toSorted(sortStrategy);
		for (const scoreFn of SCORE_FNS) {
			for (const splitFn of SPLIT_FNS) {
				const result = runPacking(sorted, pieces, config, scoreFn, splitFn);
				if (!bestResult || isBetterResult(result, bestResult)) {
					bestResult = result;
				}
			}
		}
	}

	return bestResult!;
}

function isBetterResult(a: CutlistResult, b: CutlistResult): boolean {
	// Fewer unfit pieces is always better
	if (a.unfitPieces.length !== b.unfitPieces.length) {
		return a.unfitPieces.length < b.unfitPieces.length;
	}
	// Fewer sheets is better
	if (a.totalSheets !== b.totalSheets) {
		return a.totalSheets < b.totalSheets;
	}
	// Same sheet count — less waste is better
	return a.totalWastePercent < b.totalWastePercent;
}

function runPacking(
	expanded: ExpandedPiece[],
	originalPieces: PieceDefinition[],
	config: SheetConfig,
	scoreFn: ScoreFn,
	splitFn: SplitFn
): CutlistResult {
	const sheets: Sheet[] = [];
	const unfitPieces: PieceDefinition[] = [];

	for (const piece of expanded) {
		const placement = findBestPlacement(piece, sheets, config, scoreFn);

		if (placement) {
			placePiece(piece, placement, sheets, config, splitFn);
		} else {
			sheets.push({
				freeRects: [{ x: 0, y: 0, width: config.width, height: config.height }],
				placed: []
			});

			const newPlacement = findBestPlacement(piece, sheets, config, scoreFn);
			if (newPlacement) {
				placePiece(piece, newPlacement, sheets, config, splitFn);
			} else {
				sheets.pop();
				if (!unfitPieces.find((p) => p.id === piece.id)) {
					unfitPieces.push(originalPieces.find((p) => p.id === piece.id)!);
				}
			}
		}
	}

	const sheetArea = config.width * config.height;
	const sheetLayouts: SheetLayout[] = sheets.map((sheet, i) => {
		const usedArea = sheet.placed.reduce((sum, p) => sum + p.width * p.height, 0);
		return {
			sheetIndex: i,
			pieces: sheet.placed,
			wastePercent: (1 - usedArea / sheetArea) * 100
		};
	});

	const totalUsedArea = sheetLayouts.reduce(
		(sum, s) => sum + s.pieces.reduce((ps, p) => ps + p.width * p.height, 0),
		0
	);
	const totalArea = sheetLayouts.length * sheetArea;

	return {
		sheets: sheetLayouts,
		totalSheets: sheetLayouts.length,
		totalWastePercent: totalArea > 0 ? (1 - totalUsedArea / totalArea) * 100 : 0,
		unfitPieces
	};
}

function expandPieces(pieces: PieceDefinition[]): ExpandedPiece[] {
	const result: ExpandedPiece[] = [];
	for (const piece of pieces) {
		if (piece.width <= 0 || piece.height <= 0 || piece.quantity <= 0) continue;
		for (let i = 0; i < piece.quantity; i++) {
			result.push({
				id: piece.id,
				label: piece.label,
				width: piece.width,
				height: piece.height,
				color: piece.color
			});
		}
	}
	return result;
}

function fitsInRect(
	pieceW: number,
	pieceH: number,
	rect: FreeRect,
	kerf: number,
	tolerance: number
): boolean {
	// Kerf is needed on right/bottom only when the piece doesn't fill the rect
	// (a cut is required to separate the piece from remaining material)
	const needKerfRight = pieceW < rect.width - EPSILON;
	const needKerfBottom = pieceH < rect.height - EPSILON;
	const totalW = pieceW + (needKerfRight ? kerf : 0);
	const totalH = pieceH + (needKerfBottom ? kerf : 0);
	return totalW <= rect.width + tolerance + EPSILON && totalH <= rect.height + tolerance + EPSILON;
}

function findBestPlacement(
	piece: { width: number; height: number },
	sheets: Sheet[],
	config: SheetConfig,
	scoreFn: ScoreFn
): Placement | null {
	let best: Placement | null = null;
	const tolerance = config.oversizeTolerance ?? 0;

	for (let si = 0; si < sheets.length; si++) {
		const rects = sheets[si].freeRects;
		for (let ri = 0; ri < rects.length; ri++) {
			const rect = rects[ri];

			// Try normal orientation
			if (fitsInRect(piece.width, piece.height, rect, config.kerf, tolerance)) {
				const score = scoreFn(rect.width, rect.height, piece.width, piece.height);
				if (!best || score < best.score) {
					best = {
						sheetIndex: si,
						rectIndex: ri,
						x: rect.x,
						y: rect.y,
						width: piece.width,
						height: piece.height,
						rotated: false,
						score
					};
				}
			}

			// Try rotated orientation (only if grain direction doesn't matter)
			if (!config.grainDirection && piece.width !== piece.height) {
				if (fitsInRect(piece.height, piece.width, rect, config.kerf, tolerance)) {
					const score = scoreFn(rect.width, rect.height, piece.height, piece.width);
					if (!best || score < best.score) {
						best = {
							sheetIndex: si,
							rectIndex: ri,
							x: rect.x,
							y: rect.y,
							width: piece.height,
							height: piece.width,
							rotated: true,
							score
						};
					}
				}
			}
		}
	}

	return best;
}

function placePiece(
	piece: { id: string; label: string; color: string },
	placement: Placement,
	sheets: Sheet[],
	config: SheetConfig,
	splitFn: SplitFn
): void {
	const sheet = sheets[placement.sheetIndex];
	const rect = sheet.freeRects[placement.rectIndex];

	sheet.placed.push({
		pieceId: piece.id,
		label: piece.label,
		x: placement.x,
		y: placement.y,
		width: placement.width,
		height: placement.height,
		rotated: placement.rotated,
		color: piece.color
	});

	// Remove the used free rect
	sheet.freeRects.splice(placement.rectIndex, 1);

	// Guillotine split: create two new free rects from remaining space
	const kerf = config.kerf;
	const needKerfRight = placement.width < rect.width - EPSILON;
	const needKerfBottom = placement.height < rect.height - EPSILON;
	const consumedW = placement.width + (needKerfRight ? kerf : 0);
	const consumedH = placement.height + (needKerfBottom ? kerf : 0);

	// Clamp to non-negative — under tolerance, consumed* may exceed rect bounds
	const rightW = Math.max(0, rect.width - consumedW);
	const bottomH = Math.max(0, rect.height - consumedH);

	const splitHoriz = splitFn(rect.width, rect.height, rightW, bottomH);

	if (splitHoriz) {
		// Right rect: full height of parent
		if (rightW > kerf) {
			sheet.freeRects.push({
				x: rect.x + consumedW,
				y: rect.y,
				width: rightW,
				height: rect.height
			});
		}
		// Bottom rect: width of placed piece only
		if (bottomH > kerf) {
			sheet.freeRects.push({
				x: rect.x,
				y: rect.y + consumedH,
				width: placement.width,
				height: bottomH
			});
		}
	} else {
		// Bottom rect: full width of parent
		if (bottomH > kerf) {
			sheet.freeRects.push({
				x: rect.x,
				y: rect.y + consumedH,
				width: rect.width,
				height: bottomH
			});
		}
		// Right rect: height of placed piece only
		if (rightW > kerf) {
			sheet.freeRects.push({
				x: rect.x + consumedW,
				y: rect.y,
				width: rightW,
				height: placement.height
			});
		}
	}
}

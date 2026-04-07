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

	for (const strategy of SORT_STRATEGIES) {
		const sorted = expanded.toSorted(strategy);
		const result = runPacking(sorted, pieces, config);

		if (!bestResult || isBetterResult(result, bestResult)) {
			bestResult = result;
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
	config: SheetConfig
): CutlistResult {
	const sheets: Sheet[] = [];
	const unfitPieces: PieceDefinition[] = [];

	for (const piece of expanded) {
		const placement = findBestPlacement(piece, sheets, config);

		if (placement) {
			placePiece(piece, placement, sheets, config);
		} else {
			const newSheetIndex = sheets.length;
			sheets.push({
				freeRects: [{ x: 0, y: 0, width: config.width, height: config.height }],
				placed: []
			});

			const newPlacement = findBestPlacement(piece, sheets, config);
			if (newPlacement) {
				placePiece(piece, newPlacement, sheets, config);
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
	kerf: number
): boolean {
	// Kerf is needed on right/bottom only when the piece doesn't fill the rect
	// (a cut is required to separate the piece from remaining material)
	const needKerfRight = pieceW < rect.width - EPSILON;
	const needKerfBottom = pieceH < rect.height - EPSILON;
	const totalW = pieceW + (needKerfRight ? kerf : 0);
	const totalH = pieceH + (needKerfBottom ? kerf : 0);
	return totalW <= rect.width + EPSILON && totalH <= rect.height + EPSILON;
}

function findBestPlacement(
	piece: { width: number; height: number },
	sheets: Sheet[],
	config: SheetConfig
): Placement | null {
	let best: Placement | null = null;

	for (let si = 0; si < sheets.length; si++) {
		const rects = sheets[si].freeRects;
		for (let ri = 0; ri < rects.length; ri++) {
			const rect = rects[ri];

			// Try normal orientation
			if (fitsInRect(piece.width, piece.height, rect, config.kerf)) {
				const score = rect.width * rect.height - piece.width * piece.height;
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
				if (fitsInRect(piece.height, piece.width, rect, config.kerf)) {
					const score = rect.width * rect.height - piece.height * piece.width;
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
	config: SheetConfig
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

	const rightW = rect.width - consumedW;
	const bottomH = rect.height - consumedH;

	// Choose split direction: prefer the split that produces more usable area
	const splitHoriz = rightW * rect.height >= rect.width * bottomH;

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

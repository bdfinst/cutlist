import type { PieceDefinition, PlacedPiece, SheetConfig, SheetLayout, CutlistResult } from './types';

interface FreeRect {
	x: number;
	y: number;
	width: number;
	height: number;
	rightEdge: boolean;
	bottomEdge: boolean;
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

export function calculateCutlist(pieces: PieceDefinition[], config: SheetConfig): CutlistResult {
	const expanded = expandPieces(pieces);
	// Sort by area descending (largest first)
	expanded.sort((a, b) => b.width * b.height - a.width * a.height);

	const sheets: { freeRects: FreeRect[]; placed: PlacedPiece[] }[] = [];
	const unfitPieces: PieceDefinition[] = [];

	for (const piece of expanded) {
		const placement = findBestPlacement(piece, sheets, config);

		if (placement) {
			placePiece(piece, placement, sheets, config);
		} else {
			// Try a new sheet
			const newSheetIndex = sheets.length;
			sheets.push({
				freeRects: [
					{
						x: 0,
						y: 0,
						width: config.width,
						height: config.height,
						rightEdge: true,
						bottomEdge: true
					}
				],
				placed: []
			});

			const newPlacement = findBestPlacement(piece, sheets, config);
			if (newPlacement) {
				placePiece(piece, newPlacement, sheets, config);
			} else {
				// Piece doesn't fit on an empty sheet
				sheets.pop();
				if (!unfitPieces.find((p) => p.id === piece.id)) {
					unfitPieces.push(pieces.find((p) => p.id === piece.id)!);
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
			wastePercent: ((1 - usedArea / sheetArea) * 100)
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

function expandPieces(
	pieces: PieceDefinition[]
): { id: string; label: string; width: number; height: number; color: string }[] {
	const result: { id: string; label: string; width: number; height: number; color: string }[] = [];
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
	const needKerfRight = !rect.rightEdge;
	const needKerfBottom = !rect.bottomEdge;
	const totalW = pieceW + (needKerfRight ? kerf : 0);
	const totalH = pieceH + (needKerfBottom ? kerf : 0);
	return totalW <= rect.width + 0.0001 && totalH <= rect.height + 0.0001;
}

function findBestPlacement(
	piece: { width: number; height: number },
	sheets: { freeRects: FreeRect[]; placed: PlacedPiece[] }[],
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
	sheets: { freeRects: FreeRect[]; placed: PlacedPiece[] }[],
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
	const needKerfRight = !rect.rightEdge;
	const needKerfBottom = !rect.bottomEdge;
	const consumedW = placement.width + (needKerfRight ? kerf : 0);
	const consumedH = placement.height + (needKerfBottom ? kerf : 0);

	const rightW = rect.width - consumedW;
	const bottomH = rect.height - consumedH;

	// Choose split direction: prefer the split that produces more usable rectangles
	// Split horizontally (right rect gets full remaining height) vs
	// Split vertically (bottom rect gets full remaining width)
	const splitHoriz = rightW * rect.height >= rect.width * bottomH;

	if (splitHoriz) {
		// Right rect: full height of parent
		if (rightW > kerf) {
			sheet.freeRects.push({
				x: rect.x + consumedW,
				y: rect.y,
				width: rightW,
				height: rect.height,
				rightEdge: rect.rightEdge,
				bottomEdge: rect.bottomEdge
			});
		}
		// Bottom rect: width of placed piece only
		if (bottomH > kerf) {
			sheet.freeRects.push({
				x: rect.x,
				y: rect.y + consumedH,
				width: consumedW - (needKerfRight ? kerf : 0),
				height: bottomH,
				rightEdge: false,
				bottomEdge: rect.bottomEdge
			});
		}
	} else {
		// Bottom rect: full width of parent
		if (bottomH > kerf) {
			sheet.freeRects.push({
				x: rect.x,
				y: rect.y + consumedH,
				width: rect.width,
				height: bottomH,
				rightEdge: rect.rightEdge,
				bottomEdge: rect.bottomEdge
			});
		}
		// Right rect: height of placed piece only
		if (rightW > kerf) {
			sheet.freeRects.push({
				x: rect.x + consumedW,
				y: rect.y,
				width: rightW,
				height: consumedH - (needKerfBottom ? kerf : 0),
				rightEdge: rect.rightEdge,
				bottomEdge: false
			});
		}
	}
}

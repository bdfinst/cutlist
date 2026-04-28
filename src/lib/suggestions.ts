import type { CutlistResult, PieceDefinition, SheetConfig } from './types';
import { calculateCutlist } from './algorithm';

const EPSILON = 0.0001;

export interface PairingHint {
	pieceA: { id: string; label: string; width: number; height: number };
	pieceB: { id: string; label: string; width: number; height: number };
	/** Stacking direction: 'column' = pieces share width and stack along sheet height,
	 * 'row' = pieces share height and stack along sheet width. */
	axis: 'column' | 'row';
	/** The dimension the two pieces share (column width or row height). */
	sharedDim: number;
	/** Sum of the two pieces' lengths along the stacking axis. */
	pairedLength: number;
	/** The sheet dimension being checked (height for 'column', width for 'row'). */
	sheetDim: number;
	kerf: number;
	/** How much over the sheet dimension the pair lands once kerf is added. */
	overshoot: number;
	/** True if same piece pairs with itself (quantity ≥ 2). */
	selfPair: boolean;
}

/**
 * A sheet whose contents fit within a smaller bounding box than the configured
 * stock size. The user could substitute a smaller offcut and save the difference.
 */
export interface SmallStockSuggestion {
	sheetIndex: number;
	wastePercent: number;
	minWidth: number;
	minHeight: number;
	stockWidth: number;
	stockHeight: number;
	pieceCount: number;
}

/**
 * A config change that, if applied, reduces the total sheet count.
 */
export interface ConfigSuggestion {
	kind: 'enable-tolerance' | 'unlock-grain';
	sheetsSaved: number;
	wasteBefore: number;
	wasteAfter: number;
}

/**
 * A design change to a single piece dimension that, if applied, reduces sheet count.
 */
export interface TrimSuggestion {
	pieceId: string;
	pieceLabel: string;
	dimension: 'width' | 'height';
	originalValue: number;
	trimmedValue: number;
	sheetsSaved: number;
	wasteBefore: number;
	wasteAfter: number;
}

interface Candidate {
	w: number;
	h: number;
	piece: PieceDefinition;
}

/**
 * Find pairs of pieces that just barely overflow a sheet axis when stacked
 * with a kerf between them. These are the "trim 0.125 to save a sheet" cases.
 *
 * Only flags pairs where overshoot is in (0, kerf]. A larger overshoot means
 * the pieces wouldn't pair even with shared cuts; a non-overshoot means they
 * already fit.
 */
export function findPairingHints(
	pieces: PieceDefinition[],
	config: SheetConfig
): PairingHint[] {
	const kerf = config.kerf;
	const tolerance = config.oversizeTolerance ?? 0;
	const valid = pieces.filter((p) => p.width > 0 && p.height > 0 && p.quantity > 0);

	const candidates: Candidate[] = [];
	for (const p of valid) {
		candidates.push({ w: p.width, h: p.height, piece: p });
		if (!config.grainDirection && p.width !== p.height) {
			candidates.push({ w: p.height, h: p.width, piece: p });
		}
	}

	const hints: PairingHint[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < candidates.length; i++) {
		for (let j = i; j < candidates.length; j++) {
			const a = candidates[i];
			const b = candidates[j];
			const samePiece = a.piece.id === b.piece.id;
			if (samePiece && a.piece.quantity < 2) continue;

			tryPair(a, b, 'column', config, kerf, tolerance, hints, seen);
			tryPair(a, b, 'row', config, kerf, tolerance, hints, seen);
		}
	}

	return hints;
}

function tryPair(
	a: Candidate,
	b: Candidate,
	axis: 'column' | 'row',
	config: SheetConfig,
	kerf: number,
	tolerance: number,
	hints: PairingHint[],
	seen: Set<string>
): void {
	// 'column' = pieces share width, stack vertically (sum heights)
	// 'row'    = pieces share height, stack horizontally (sum widths)
	const aShared = axis === 'column' ? a.w : a.h;
	const bShared = axis === 'column' ? b.w : b.h;
	const summedA = axis === 'column' ? a.h : a.w;
	const summedB = axis === 'column' ? b.h : b.w;
	const sheetCrossDim = axis === 'column' ? config.width : config.height;
	const sheetSumDim = axis === 'column' ? config.height : config.width;

	if (aShared !== bShared) return;
	if (aShared > sheetCrossDim + EPSILON) return;

	const total = summedA + summedB;
	const overshoot = total + kerf - sheetSumDim;
	if (overshoot <= EPSILON) return;
	if (overshoot > kerf + EPSILON) return;
	// If tolerance already covers it, no hint needed
	if (overshoot <= tolerance + EPSILON) return;

	const samePiece = a.piece.id === b.piece.id;
	const ids = [a.piece.id, b.piece.id].sort();
	const key = `${ids[0]}|${ids[1]}|${axis}|${aShared}|${summedA}|${summedB}`;
	if (seen.has(key)) return;
	seen.add(key);

	hints.push({
		pieceA: {
			id: a.piece.id,
			label: a.piece.label,
			width: a.piece.width,
			height: a.piece.height
		},
		pieceB: {
			id: b.piece.id,
			label: b.piece.label,
			width: b.piece.width,
			height: b.piece.height
		},
		axis,
		sharedDim: aShared,
		pairedLength: total,
		sheetDim: sheetSumDim,
		kerf,
		overshoot,
		selfPair: samePiece
	});
}

const SMALL_STOCK_WASTE_THRESHOLD_PERCENT = 40;

/**
 * For each sheet whose pieces occupy a fraction of its area, return the smallest
 * bounding box that would fit them — a candidate offcut size.
 */
export function findSmallStockSuggestions(
	result: CutlistResult,
	config: SheetConfig
): SmallStockSuggestion[] {
	const out: SmallStockSuggestion[] = [];
	for (const sheet of result.sheets) {
		if (sheet.pieces.length === 0) continue;
		if (sheet.wastePercent < SMALL_STOCK_WASTE_THRESHOLD_PERCENT) continue;

		let maxX = 0;
		let maxY = 0;
		for (const p of sheet.pieces) {
			maxX = Math.max(maxX, p.x + p.width);
			maxY = Math.max(maxY, p.y + p.height);
		}

		// Only suggest if the bounding box is meaningfully smaller than the stock
		if (maxX > config.width - 1 && maxY > config.height - 1) continue;

		out.push({
			sheetIndex: sheet.sheetIndex,
			wastePercent: sheet.wastePercent,
			minWidth: roundUpQuarter(maxX),
			minHeight: roundUpQuarter(maxY),
			stockWidth: config.width,
			stockHeight: config.height,
			pieceCount: sheet.pieces.length
		});
	}
	return out;
}

function roundUpQuarter(n: number): number {
	return Math.ceil(n * 4) / 4;
}

/**
 * Try toggling tolerance and grain direction. If either change reduces sheet count,
 * surface as a one-line suggestion.
 */
export function findConfigSuggestions(
	pieces: PieceDefinition[],
	config: SheetConfig
): ConfigSuggestion[] {
	const out: ConfigSuggestion[] = [];
	const baseline = calculateCutlist(pieces, config);
	if (baseline.totalSheets === 0) return out;

	const tolerance = config.oversizeTolerance ?? 0;
	if (tolerance < config.kerf - EPSILON) {
		const candidate = calculateCutlist(pieces, {
			...config,
			oversizeTolerance: config.kerf
		});
		if (candidate.totalSheets < baseline.totalSheets) {
			out.push({
				kind: 'enable-tolerance',
				sheetsSaved: baseline.totalSheets - candidate.totalSheets,
				wasteBefore: baseline.totalWastePercent,
				wasteAfter: candidate.totalWastePercent
			});
		}
	}

	if (config.grainDirection) {
		const candidate = calculateCutlist(pieces, { ...config, grainDirection: false });
		if (candidate.totalSheets < baseline.totalSheets) {
			out.push({
				kind: 'unlock-grain',
				sheetsSaved: baseline.totalSheets - candidate.totalSheets,
				wasteBefore: baseline.totalWastePercent,
				wasteAfter: candidate.totalWastePercent
			});
		}
	}

	return out;
}

const TRIM_INCREMENTS = [0.0625, 0.125, 0.25, 0.5, 1.0];

/**
 * For each piece, try shrinking each dimension by small amounts. If a trim
 * reduces total sheet count, surface the smallest effective trim.
 *
 * Skips pieces with quantity 0, dimensions ≤ a few inches, and capped at
 * piece-count × 2 dimensions × TRIM_INCREMENTS.length packing runs.
 */
export function findTrimSuggestions(
	pieces: PieceDefinition[],
	config: SheetConfig
): TrimSuggestion[] {
	const out: TrimSuggestion[] = [];
	const baseline = calculateCutlist(pieces, config);
	if (baseline.totalSheets === 0) return out;

	for (const piece of pieces) {
		if (piece.quantity <= 0) continue;
		for (const dim of ['width', 'height'] as const) {
			const original = piece[dim];
			if (original < 4) continue;

			let found: TrimSuggestion | null = null;
			for (const trim of TRIM_INCREMENTS) {
				const trimmed = original - trim;
				if (trimmed <= 0) continue;
				const modified = pieces.map((p) =>
					p.id === piece.id ? { ...p, [dim]: trimmed } : p
				);
				const candidate = calculateCutlist(modified, config);
				if (candidate.totalSheets < baseline.totalSheets) {
					found = {
						pieceId: piece.id,
						pieceLabel: piece.label,
						dimension: dim,
						originalValue: original,
						trimmedValue: trimmed,
						sheetsSaved: baseline.totalSheets - candidate.totalSheets,
						wasteBefore: baseline.totalWastePercent,
						wasteAfter: candidate.totalWastePercent
					};
					break;
				}
			}
			if (found) out.push(found);
		}
	}

	return out;
}

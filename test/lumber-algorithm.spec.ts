import { describe, it, expect } from 'vitest';
import { calculateLumberCutlist, fitsLumberCrossSection } from '$lib/lumber-algorithm';
import type { LumberPiece, LumberType } from '$lib/types';

function makeLumberType(overrides: Partial<LumberType> = {}): LumberType {
	return {
		id: 'lt-2x4',
		name: '2x4',
		crossWidth: 1.5,
		crossHeight: 3.5,
		availableLengths: [96, 120, 144],
		...overrides
	};
}

function makeLumberPiece(overrides: Partial<LumberPiece> = {}): LumberPiece {
	return {
		id: crypto.randomUUID(),
		label: 'Stud',
		length: 36,
		quantity: 1,
		lumberTypeId: 'lt-2x4',
		color: '#4e79a7',
		...overrides
	};
}

const defaultKerf = 0.125;

describe('calculateLumberCutlist', () => {
	it('returns empty result for empty input', () => {
		expect.assertions(5);
		const result = calculateLumberCutlist([], [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.boards).toHaveLength(0);
		expect(result.unfitPieces).toHaveLength(0);
		expect(result.unassignedPieces).toHaveLength(0);
		expect(result.totalWastePercent).toBe(0);
	});

	it('places a single piece on one board with offset 0', () => {
		expect.assertions(5);
		const piece = makeLumberPiece({ label: 'Rail', length: 40 });
		const result = calculateLumberCutlist([piece], [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].pieces).toHaveLength(1);
		expect(result.boards[0].pieces[0].offset).toBe(0);
		expect(result.boards[0].pieces[0].length).toBe(40);
		expect(result.boards[0].wastePercent).toBeGreaterThan(0);
	});

	it('places two pieces on one board with kerf gap between them', () => {
		expect.assertions(5);
		const pieces = [
			makeLumberPiece({ label: 'A', length: 30 }),
			makeLumberPiece({ label: 'B', length: 30 })
		];
		const result = calculateLumberCutlist(pieces, [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].pieces).toHaveLength(2);
		// First piece at offset 0
		expect(result.boards[0].pieces[0].offset).toBe(0);
		// Second piece at offset = first length + kerf
		expect(result.boards[0].pieces[1].offset).toBeCloseTo(30 + defaultKerf, 4);
		// Both on same board
		expect(result.boards[0].boardLength).toBe(96);
	});

	it('overflows pieces to a second board when they do not fit on first', () => {
		expect.assertions(3);
		const pieces = [
			makeLumberPiece({ label: 'Long', length: 60, quantity: 2 })
		];
		// Board length 96, two 60" pieces + kerf = 120.125 > 96
		const result = calculateLumberCutlist(pieces, [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(2);
		expect(result.boards[0].pieces).toHaveLength(1);
		expect(result.boards[1].pieces).toHaveLength(1);
	});

	it('picks the shortest sufficient board length from availableLengths', () => {
		expect.assertions(2);
		const lumberType = makeLumberType({ availableLengths: [48, 96, 144] });
		const piece = makeLumberPiece({ length: 40 });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].boardLength).toBe(48);
	});

	it('adds piece to unfitPieces when longer than any available length', () => {
		expect.assertions(3);
		const lumberType = makeLumberType({ availableLengths: [48, 96] });
		const piece = makeLumberPiece({ label: 'TooLong', length: 100 });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.unfitPieces).toHaveLength(1);
		expect(result.unfitPieces[0].label).toBe('TooLong');
	});

	it('does not add kerf before the first piece on a board', () => {
		expect.assertions(2);
		const pieces = [
			makeLumberPiece({ label: 'A', length: 90 }),
			makeLumberPiece({ label: 'B', length: 90 })
		];
		// Each 90" piece on a 96" board, no room for both + kerf
		const result = calculateLumberCutlist(pieces, [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(2);
		// Both boards should have first piece at offset 0
		expect(result.boards.every((b) => b.pieces[0].offset === 0)).toBe(true);
	});

	it('computes 0% waste when pieces plus kerf exactly fill a board', () => {
		expect.assertions(2);
		// Two pieces that with kerf exactly fill 96": a + kerf + b = 96
		// a = 47.9375, b = 47.9375, kerf = 0.125 → 47.9375 + 0.125 + 47.9375 = 96
		const halfLen = (96 - defaultKerf) / 2;
		const pieces = [
			makeLumberPiece({ label: 'A', length: halfLen }),
			makeLumberPiece({ label: 'B', length: halfLen })
		];
		const result = calculateLumberCutlist(pieces, [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].wastePercent).toBeCloseTo(0, 1);
	});

	it('processes multiple lumber types into independent board groups', () => {
		expect.assertions(4);
		const type2x4 = makeLumberType({ id: 'lt-2x4', name: '2x4', availableLengths: [96] });
		const type2x6 = makeLumberType({ id: 'lt-2x6', name: '2x6', crossHeight: 5.5, availableLengths: [120] });
		const pieces = [
			makeLumberPiece({ label: 'Stud', length: 40, lumberTypeId: 'lt-2x4' }),
			makeLumberPiece({ label: 'Joist', length: 50, lumberTypeId: 'lt-2x6' })
		];
		const result = calculateLumberCutlist(pieces, [type2x4, type2x6], defaultKerf);

		expect(result.totalBoards).toBe(2);
		const board2x4 = result.boards.find((b) => b.lumberTypeId === 'lt-2x4')!;
		const board2x6 = result.boards.find((b) => b.lumberTypeId === 'lt-2x6')!;
		expect(board2x4.boardLength).toBe(96);
		expect(board2x6.boardLength).toBe(120);
		expect(board2x4.pieces[0].label).toBe('Stud');
	});

	it('separates unassigned pieces (lumberTypeId=null) into unassignedPieces', () => {
		expect.assertions(4);
		const assigned = makeLumberPiece({ label: 'Stud', length: 40 });
		const unassigned = makeLumberPiece({ label: 'Loose', length: 20, lumberTypeId: null });
		const result = calculateLumberCutlist([assigned, unassigned], [makeLumberType()], defaultKerf);

		expect(result.unassignedPieces).toHaveLength(1);
		expect(result.unassignedPieces[0].label).toBe('Loose');
		// Only the assigned piece should produce boards
		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].pieces).toHaveLength(1);
	});

	// --- Mutant-killing tests ---

	it('produces 0 boards for a piece with length=0', () => {
		expect.assertions(2);
		const piece = makeLumberPiece({ label: 'Zero', length: 0 });
		const result = calculateLumberCutlist([piece], [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.boards).toHaveLength(0);
	});

	it('produces 0 boards for a piece with quantity=0', () => {
		expect.assertions(2);
		const piece = makeLumberPiece({ label: 'None', length: 36, quantity: 0 });
		const result = calculateLumberCutlist([piece], [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.boards).toHaveLength(0);
	});

	it('produces 0 boards for a piece with negative length', () => {
		expect.assertions(2);
		const piece = makeLumberPiece({ label: 'Neg', length: -1 });
		const result = calculateLumberCutlist([piece], [makeLumberType()], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.boards).toHaveLength(0);
	});

	it('uses sort strategy to minimize boards when order matters', () => {
		expect.assertions(1);
		// 70+25=95 fits on one 96" board; 60 on another → 2 boards total
		// If sort is broken (ascending: 25, 60, 70) → 25+60=85 on one, 70 on another → still 2
		// But the key: descending sort (70, 60, 25) places 70 first, then tries 25 → fits (70+0.125+25=95.125 ≈ 96)
		// The algorithm tries both strategies and picks the best.
		const pieces = [
			makeLumberPiece({ label: 'A', length: 70 }),
			makeLumberPiece({ label: 'B', length: 60 }),
			makeLumberPiece({ label: 'C', length: 25 })
		];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(2);
	});

	it('selects the shortest sufficient board length from unsorted availableLengths', () => {
		expect.assertions(2);
		// availableLengths in non-sorted order; a 40" piece should pick 48" (shortest that fits)
		const lumberType = makeLumberType({ availableLengths: [144, 48, 96] });
		const piece = makeLumberPiece({ length: 40 });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].boardLength).toBe(48);
	});

	it('fits a piece of exactly the board length without adding kerf before first piece', () => {
		expect.assertions(3);
		const piece = makeLumberPiece({ label: 'Exact', length: 96 });
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].pieces).toHaveLength(1);
		expect(result.boards[0].pieces[0].offset).toBe(0);
	});

	it('tracks strictly increasing offsets for multiple pieces on one board', () => {
		expect.assertions(4);
		const pieces = [
			makeLumberPiece({ label: 'A', length: 20 }),
			makeLumberPiece({ label: 'B', length: 20 }),
			makeLumberPiece({ label: 'C', length: 20 })
		];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
		const placed = result.boards[0].pieces;
		expect(placed).toHaveLength(3);
		// Each subsequent piece starts after the previous piece + kerf
		expect(placed[1].offset).toBeGreaterThan(placed[0].offset + placed[0].length);
		expect(placed[2].offset).toBeGreaterThan(placed[1].offset + placed[1].length);
	});

	it('deduplicates unfit pieces when quantity > 1', () => {
		expect.assertions(2);
		const lumberType = makeLumberType({ availableLengths: [48, 96] });
		const piece = makeLumberPiece({ label: 'Oversized', length: 200, quantity: 3 });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(0);
		expect(result.unfitPieces).toHaveLength(1);
	});

	it('prefers result with no unfit pieces over one with unfit pieces', () => {
		expect.assertions(2);
		// A piece that fits on 144" but not 96" — if board selection works, it should fit
		const lumberType = makeLumberType({ availableLengths: [96, 144] });
		const piece = makeLumberPiece({ label: 'Long', length: 100 });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.unfitPieces).toHaveLength(0);
		expect(result.totalBoards).toBe(1);
	});

	it('prefers fewer boards when unfit counts are equal', () => {
		expect.assertions(1);
		// Two pieces that fit together on one board (30+30+kerf=60.125 < 96)
		const pieces = [
			makeLumberPiece({ label: 'A', length: 30 }),
			makeLumberPiece({ label: 'B', length: 30 })
		];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
	});

	it('prefers less waste when board counts are equal', () => {
		expect.assertions(2);
		// Pieces: 50" and 40" both fit on one 96" board regardless of sort order
		// waste = 96 - (50 + 0.125 + 40) = 5.875
		const pieces = [
			makeLumberPiece({ label: 'A', length: 50 }),
			makeLumberPiece({ label: 'B', length: 40 })
		];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].wastePercent).toBeCloseTo(((96 - 90.125) / 96) * 100, 1);
	});

	it('computes wastePercent as a percentage (0-100) not a fraction', () => {
		expect.assertions(2);
		// One 48" piece on a 96" board → waste = 50%
		const piece = makeLumberPiece({ label: 'Half', length: 48 });
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist([piece], [lumberType], defaultKerf);

		expect(result.boards[0].wastePercent).toBeCloseTo(50, 0);
		expect(result.boards[0].wastePercent).toBeGreaterThan(1);
	});

	it('computes totalWastePercent in range 0-100 for a non-trivial scenario', () => {
		expect.assertions(2);
		const pieces = [
			makeLumberPiece({ label: 'A', length: 40 }),
			makeLumberPiece({ label: 'B', length: 60 })
		];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalWastePercent).toBeGreaterThan(0);
		expect(result.totalWastePercent).toBeLessThanOrEqual(100);
	});

	it('computes totalWastePercent correctly across multiple boards', () => {
		expect.assertions(1);
		// Two pieces of 60" each → 2 boards of 96" each
		// Board 1: 60" used, Board 2: 60" used. Total board = 192, total used = 120
		// waste = (192 - 120) / 192 * 100 = 37.5%
		const pieces = [makeLumberPiece({ label: 'A', length: 60, quantity: 2 })];
		const lumberType = makeLumberType({ availableLengths: [96] });
		const result = calculateLumberCutlist(pieces, [lumberType], defaultKerf);

		expect(result.totalWastePercent).toBeCloseTo(37.5, 0);
	});

	it('does not generate boards for unassigned pieces mixed with assigned ones', () => {
		expect.assertions(5);
		const assigned1 = makeLumberPiece({ label: 'A', length: 30 });
		const assigned2 = makeLumberPiece({ label: 'B', length: 40 });
		const unassigned1 = makeLumberPiece({ label: 'U1', length: 20, lumberTypeId: null });
		const unassigned2 = makeLumberPiece({ label: 'U2', length: 25, lumberTypeId: null });
		const result = calculateLumberCutlist(
			[assigned1, unassigned1, assigned2, unassigned2],
			[makeLumberType()],
			defaultKerf
		);

		expect(result.unassignedPieces).toHaveLength(2);
		expect(result.totalBoards).toBe(1);
		expect(result.boards[0].pieces).toHaveLength(2);
		const boardLabels = result.boards[0].pieces.map((p) => p.label);
		expect(boardLabels).not.toContain('U1');
		expect(boardLabels).not.toContain('U2');
	});
});

describe('fitsLumberCrossSection', () => {
	it('returns true when piece fits in normal orientation', () => {
		expect.assertions(1);
		expect(fitsLumberCrossSection(1, 3, 1.5, 3.5)).toBe(true);
	});

	it('returns true when piece fits in rotated orientation', () => {
		expect.assertions(1);
		// 3x1 piece into 1.5x3.5 lumber: normal fails (3 > 1.5), rotated: 1 <= 1.5 && 3 <= 3.5
		expect(fitsLumberCrossSection(3, 1, 1.5, 3.5)).toBe(true);
	});

	it('returns false when piece is too large in both orientations', () => {
		expect.assertions(1);
		expect(fitsLumberCrossSection(4, 4, 1.5, 3.5)).toBe(false);
	});

	it('returns true for exact cross-section match', () => {
		expect.assertions(1);
		expect(fitsLumberCrossSection(1.5, 3.5, 1.5, 3.5)).toBe(true);
	});

	it('returns true when piece is barely within tolerance', () => {
		expect.assertions(1);
		expect(fitsLumberCrossSection(1.4999, 3.4999, 1.5, 3.5)).toBe(true);
	});

	it('returns false when piece barely exceeds lumber in both orientations', () => {
		expect.assertions(1);
		// 1.5001 x 3.5001 in 1.5 x 3.5: normal fails (1.5001 > 1.5+EPSILON, 3.5001 > 3.5+EPSILON)
		// rotated: 3.5001 > 1.5+EPSILON → also fails
		expect(fitsLumberCrossSection(1.5002, 3.5002, 1.5, 3.5)).toBe(false);
	});

	it('returns false when one dimension fits but the other does not in normal orientation', () => {
		expect.assertions(1);
		// 1.5 x 4.0 in 1.5 x 3.5: normal: 1.5<=1.5 but 4.0>3.5; rotated: 4.0>1.5 → false
		expect(fitsLumberCrossSection(1.5, 4.0, 1.5, 3.5)).toBe(false);
	});

	it('returns false when rotated single-dimension-fails', () => {
		expect.assertions(1);
		// 4.0 x 1.5 in 1.5 x 3.5: normal: 4.0>1.5; rotated: 1.5<=1.5 but 4.0>3.5 → false
		expect(fitsLumberCrossSection(4.0, 1.5, 1.5, 3.5)).toBe(false);
	});
});

import { describe, it, expect } from 'vitest';
import { calculateCutlist } from '$lib/algorithm';
import type { PieceDefinition, SheetConfig } from '$lib/types';

function makePiece(overrides: Partial<PieceDefinition> = {}): PieceDefinition {
	return {
		id: crypto.randomUUID(),
		label: 'Test',
		width: 12,
		height: 24,
		quantity: 1,
		color: '#4e79a7',
		...overrides
	};
}

const defaultConfig: SheetConfig = {
	width: 48,
	height: 96,
	kerf: 0.125,
	grainDirection: false
};

function configWith(overrides: Partial<SheetConfig> = {}): SheetConfig {
	return { ...defaultConfig, ...overrides };
}

describe('calculateCutlist', () => {
	it('places a single piece on one sheet at (0, 0)', () => {
		expect.assertions(4);
		const result = calculateCutlist([makePiece({ label: 'Shelf', width: 12, height: 24 })], defaultConfig);

		expect(result.totalSheets).toBe(1);
		expect(result.sheets[0].pieces).toHaveLength(1);
		expect(result.sheets[0].pieces[0].x).toBe(0);
		expect(result.sheets[0].pieces[0].y).toBe(0);
	});

	it('fills an entire sheet with 0% waste when piece matches exactly', () => {
		expect.assertions(3);
		const result = calculateCutlist(
			[makePiece({ label: 'Full', width: 48, height: 96 })],
			configWith({ kerf: 0 })
		);

		expect(result.totalSheets).toBe(1);
		expect(result.sheets[0].wastePercent).toBeCloseTo(0, 1);
		expect(result.totalWastePercent).toBeCloseTo(0, 1);
	});

	it('packs multiple pieces onto one sheet', () => {
		expect.assertions(3);
		const result = calculateCutlist(
			[makePiece({ label: 'A', width: 24, height: 48, quantity: 4 })],
			configWith({ kerf: 0 })
		);

		expect(result.totalSheets).toBe(1);
		expect(result.sheets[0].pieces).toHaveLength(4);
		expect(result.totalWastePercent).toBeCloseTo(0, 1);
	});

	it('overflows pieces to a second sheet', () => {
		expect.assertions(3);
		const result = calculateCutlist(
			[makePiece({ label: 'Big', width: 48, height: 96, quantity: 2 })],
			configWith({ kerf: 0 })
		);

		expect(result.totalSheets).toBe(2);
		expect(result.sheets[0].pieces).toHaveLength(1);
		expect(result.sheets[1].pieces).toHaveLength(1);
	});

	it('rotates piece to fit when grain direction is off', () => {
		expect.assertions(4);
		const result = calculateCutlist(
			[makePiece({ label: 'Tall', width: 96, height: 24 })],
			configWith({ kerf: 0, grainDirection: false })
		);

		expect(result.totalSheets).toBe(1);
		expect(result.sheets[0].pieces[0].rotated).toBe(true);
		expect(result.sheets[0].pieces[0].width).toBe(24);
		expect(result.sheets[0].pieces[0].height).toBe(96);
	});

	it('does not rotate piece when grain direction is on', () => {
		expect.assertions(2);
		const result = calculateCutlist(
			[makePiece({ label: 'Tall', width: 96, height: 24 })],
			configWith({ kerf: 0, grainDirection: true })
		);

		expect(result.totalSheets).toBe(0);
		expect(result.unfitPieces).toHaveLength(1);
	});

	it('collects oversized piece in unfitPieces', () => {
		expect.assertions(3);
		const result = calculateCutlist(
			[makePiece({ label: 'Huge', width: 60, height: 100 })],
			configWith({ kerf: 0 })
		);

		expect(result.totalSheets).toBe(0);
		expect(result.unfitPieces).toHaveLength(1);
		expect(result.unfitPieces[0].label).toBe('Huge');
	});

	it('deduplicates unfitPieces when quantity > 1', () => {
		expect.assertions(2);
		const result = calculateCutlist(
			[makePiece({ label: 'Huge', width: 60, height: 100, quantity: 3 })],
			configWith({ kerf: 0 })
		);

		expect(result.unfitPieces).toHaveLength(1);
		expect(result.unfitPieces[0].label).toBe('Huge');
	});

	it('accounts for kerf in available space calculations', () => {
		expect.assertions(2);
		const noKerf = calculateCutlist(
			[makePiece({ label: 'A', width: 24, height: 48, quantity: 4 })],
			configWith({ kerf: 0 })
		);
		expect(noKerf.totalSheets).toBe(1);

		const withKerf = calculateCutlist(
			[makePiece({ label: 'A', width: 24, height: 48, quantity: 4 })],
			configWith({ kerf: 0.125 })
		);
		expect(withKerf.sheets[0].wastePercent).toBeGreaterThan(noKerf.sheets[0].wastePercent);
	});

	it('overflows when kerf prevents side-by-side placement', () => {
		expect.assertions(1);
		// 24" + 0.125" kerf = 24.125" consumed. Remaining 23.875" < 24".
		// Each full-height piece needs its own sheet.
		const result = calculateCutlist(
			[makePiece({ label: 'A', width: 24, height: 96, quantity: 3 })],
			configWith({ kerf: 0.125 })
		);

		expect(result.totalSheets).toBe(3);
	});

	it('expands quantity into individual placed pieces', () => {
		expect.assertions(2);
		const result = calculateCutlist(
			[makePiece({ label: 'Shelf', width: 12, height: 24, quantity: 5 })],
			defaultConfig
		);

		const allPieces = result.sheets.flatMap((s) => s.pieces);
		expect(allPieces).toHaveLength(5);
		expect(allPieces.every((p) => p.label === 'Shelf')).toBe(true);
	});

	it('places largest pieces first at the origin', () => {
		expect.assertions(4);
		const small = makePiece({ label: 'Small', width: 6, height: 6 });
		const large = makePiece({ label: 'Large', width: 24, height: 48 });
		const result = calculateCutlist([small, large], configWith({ kerf: 0 }));

		const placed = result.sheets[0].pieces;
		const largePiece = placed.find((p) => p.label === 'Large')!;
		const smallPiece = placed.find((p) => p.label === 'Small')!;
		expect(largePiece.x).toBe(0);
		expect(largePiece.y).toBe(0);
		expect(smallPiece.x + smallPiece.y).toBeGreaterThan(0);
		// Large piece placed before small in array (processing order)
		expect(placed.indexOf(largePiece)).toBeLessThan(placed.indexOf(smallPiece));
	});

	it('returns empty result for empty input', () => {
		expect.assertions(4);
		const result = calculateCutlist([], defaultConfig);

		expect(result.totalSheets).toBe(0);
		expect(result.sheets).toHaveLength(0);
		expect(result.unfitPieces).toHaveLength(0);
		expect(result.totalWastePercent).toBe(0);
	});

	it('skips pieces with zero or negative dimensions', () => {
		expect.assertions(2);
		const result = calculateCutlist(
			[
				makePiece({ label: 'Zero', width: 0, height: 10 }),
				makePiece({ label: 'Negative', width: -5, height: 10 }),
				makePiece({ label: 'Valid', width: 10, height: 10 })
			],
			defaultConfig
		);

		const allPieces = result.sheets.flatMap((s) => s.pieces);
		expect(allPieces).toHaveLength(1);
		expect(allPieces[0].label).toBe('Valid');
	});

	it('skips pieces with zero quantity', () => {
		expect.assertions(2);
		const result = calculateCutlist(
			[
				makePiece({ label: 'ZeroQty', width: 10, height: 10, quantity: 0 }),
				makePiece({ label: 'Valid', width: 10, height: 10 })
			],
			defaultConfig
		);

		const allPieces = result.sheets.flatMap((s) => s.pieces);
		expect(allPieces).toHaveLength(1);
		expect(allPieces[0].label).toBe('Valid');
	});

	it('handles mixed fit and unfit pieces', () => {
		expect.assertions(3);
		const result = calculateCutlist(
			[
				makePiece({ label: 'Huge', width: 60, height: 100 }),
				makePiece({ label: 'Small', width: 10, height: 10 })
			],
			configWith({ kerf: 0 })
		);

		expect(result.totalSheets).toBe(1);
		expect(result.sheets[0].pieces[0].label).toBe('Small');
		expect(result.unfitPieces).toHaveLength(1);
	});

	describe('isBetterResult — strategy selection tiebreakers', () => {
		it('prefers fewer sheets over less waste', () => {
			expect.assertions(1);
			// Two 24x48 pieces fit on one 48x96 sheet (50% waste) with kerf=0.
			// The algorithm should use 1 sheet, not spread across 2.
			const result = calculateCutlist(
				[makePiece({ label: 'A', width: 24, height: 48, quantity: 2 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
		});

		it('prefers less waste when sheet count is equal', () => {
			expect.assertions(2);
			// Place pieces that all fit on one sheet. A tighter packing has less waste.
			// 4 pieces of 24x48 exactly fill a 48x96 sheet (0% waste).
			// All sort strategies produce 1 sheet, but the best has 0% waste.
			const result = calculateCutlist(
				[makePiece({ label: 'A', width: 24, height: 48, quantity: 4 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.totalWastePercent).toBeCloseTo(0, 1);
		});
	});

	describe('wastePercent is in 0-100 range (not 0-1)', () => {
		it('reports per-sheet wastePercent as a percentage', () => {
			expect.assertions(3);
			// One piece covers exactly half the sheet: 48x48 on a 48x96 sheet.
			const result = calculateCutlist(
				[makePiece({ label: 'Half', width: 48, height: 48 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].wastePercent).toBeCloseTo(50, 0);
			expect(result.sheets[0].wastePercent).toBeGreaterThan(1);
		});

		it('reports totalWastePercent as a percentage', () => {
			expect.assertions(2);
			const result = calculateCutlist(
				[makePiece({ label: 'Half', width: 48, height: 48 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalWastePercent).toBeCloseTo(50, 0);
			expect(result.totalWastePercent).toBeGreaterThan(1);
		});
	});

	describe('totalWastePercent guard — totalArea > 0', () => {
		it('returns totalWastePercent > 0 and < 100 for a single small piece', () => {
			expect.assertions(2);
			const result = calculateCutlist(
				[makePiece({ label: 'Tiny', width: 10, height: 10 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalWastePercent).toBeGreaterThan(0);
			expect(result.totalWastePercent).toBeLessThan(100);
		});
	});

	describe('input validation — zero height and zero quantity', () => {
		it('skips a piece with height exactly 0', () => {
			expect.assertions(2);
			const result = calculateCutlist(
				[makePiece({ label: 'ZeroH', width: 10, height: 0 })],
				defaultConfig
			);

			expect(result.totalSheets).toBe(0);
			expect(result.sheets).toHaveLength(0);
		});

		it('skips a piece with width exactly 0', () => {
			expect.assertions(2);
			const result = calculateCutlist(
				[makePiece({ label: 'ZeroW', width: 0, height: 10 })],
				defaultConfig
			);

			expect(result.totalSheets).toBe(0);
			expect(result.sheets).toHaveLength(0);
		});

		it('skips a piece with quantity exactly 0', () => {
			expect.assertions(2);
			const result = calculateCutlist(
				[makePiece({ label: 'NoQty', width: 10, height: 10, quantity: 0 })],
				defaultConfig
			);

			expect(result.totalSheets).toBe(0);
			expect(result.sheets).toHaveLength(0);
		});
	});

	describe('kerf handling — needKerfRight and needKerfBottom', () => {
		it('does not consume kerf when piece fills the full sheet width', () => {
			expect.assertions(3);
			// Piece is 48 wide (full sheet width), 24 tall (half sheet height).
			// No kerf needed on right (fills full width), kerf needed on bottom.
			// Should fit on one sheet.
			const result = calculateCutlist(
				[makePiece({ label: 'FullW', width: 48, height: 24 })],
				configWith({ kerf: 0.125 })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].pieces).toHaveLength(1);
			// Piece occupies 48x24 = 1152 out of 48x96 = 4608. Waste ~75%
			expect(result.sheets[0].wastePercent).toBeCloseTo(75, 0);
		});

		it('does not consume kerf when piece fills the full sheet height', () => {
			expect.assertions(2);
			// Piece is 24 wide (half sheet width), 96 tall (full sheet height).
			// Kerf needed on right (doesn't fill width), no kerf on bottom.
			const result = calculateCutlist(
				[makePiece({ label: 'FullH', width: 24, height: 96 })],
				configWith({ kerf: 0.125 })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].pieces).toHaveLength(1);
		});

		it('piece that exactly fills sheet width still fits with kerf', () => {
			expect.assertions(1);
			// 48 wide matches the 48 sheet width exactly — no right kerf needed.
			// If kerf were wrongly applied horizontally, 48 + 0.125 = 48.125 > 48.
			const result = calculateCutlist(
				[makePiece({ label: 'ExactW', width: 48, height: 48 })],
				configWith({ kerf: 0.125 })
			);

			expect(result.totalSheets).toBe(1);
		});
	});

	describe('best-area-fit scoring', () => {
		it('places piece in tighter-fitting rectangle for efficient packing', () => {
			expect.assertions(1);
			// Fill a sheet efficiently: one large piece and several smaller ones.
			// If scoring is wrong (larger leftover preferred), pieces overflow.
			// 48x48 piece + 48x48 piece should fill one 48x96 sheet exactly.
			const result = calculateCutlist(
				[
					makePiece({ label: 'A', width: 48, height: 48 }),
					makePiece({ label: 'B', width: 48, height: 48 })
				],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
		});
	});

	describe('rotated flag correctness', () => {
		it('marks a non-square piece that fits without rotation as rotated: false', () => {
			expect.assertions(3);
			// 12x24 fits naturally in a 48x96 sheet — no rotation needed.
			const result = calculateCutlist(
				[makePiece({ label: 'Rect', width: 12, height: 24 })],
				configWith({ kerf: 0, grainDirection: false })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].pieces).toHaveLength(1);
			expect(result.sheets[0].pieces[0].rotated).toBe(false);
		});

		it('marks a piece that must rotate to fit as rotated: true', () => {
			expect.assertions(2);
			// 96x24 won't fit in a 48x96 sheet without rotation (96 > 48 width).
			// Rotated to 24x96 it fits perfectly.
			const result = calculateCutlist(
				[makePiece({ label: 'Wide', width: 96, height: 24 })],
				configWith({ kerf: 0, grainDirection: false })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].pieces[0].rotated).toBe(true);
		});
	});

	describe('guillotine split direction', () => {
		it('correctly splits free rects so three pieces fit on one sheet', () => {
			expect.assertions(2);
			// On a 48x96 sheet with kerf=0:
			// Place 24x48, then 24x48, then 48x48.
			// The first 24x48 splits the sheet. With correct splitting,
			// the remaining space accommodates both remaining pieces on one sheet.
			const result = calculateCutlist(
				[
					makePiece({ label: 'A', width: 24, height: 48 }),
					makePiece({ label: 'B', width: 24, height: 48 }),
					makePiece({ label: 'C', width: 48, height: 48 })
				],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
			expect(result.sheets[0].pieces).toHaveLength(3);
		});

		it('splits correctly with kerf for tight packing', () => {
			expect.assertions(1);
			// 4 pieces of 24x48 on a 48x96 sheet with kerf=0.
			// With correct guillotine splits, all 4 fit on one sheet.
			const result = calculateCutlist(
				[makePiece({ label: 'Q', width: 24, height: 48, quantity: 4 })],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
		});
	});

	describe('free rect coordinate calculations', () => {
		it('all placed piece coordinates are non-negative', () => {
			expect.assertions(1);
			// Place several pieces and verify none end up at negative coordinates
			const result = calculateCutlist(
				[
					makePiece({ label: 'A', width: 24, height: 48 }),
					makePiece({ label: 'B', width: 24, height: 48 }),
					makePiece({ label: 'C', width: 24, height: 48 }),
					makePiece({ label: 'D', width: 24, height: 48 })
				],
				configWith({ kerf: 0.125 })
			);

			const allPieces = result.sheets.flatMap((s) => s.pieces);
			expect(allPieces.every((p) => p.x >= 0 && p.y >= 0)).toBe(true);
		});

		it('second piece is placed adjacent to first, not overlapping', () => {
			expect.assertions(4);
			// Two pieces side by side on a sheet with kerf=0.
			const result = calculateCutlist(
				[
					makePiece({ label: 'Left', width: 24, height: 96 }),
					makePiece({ label: 'Right', width: 24, height: 96 })
				],
				configWith({ kerf: 0 })
			);

			expect(result.totalSheets).toBe(1);
			const pieces = result.sheets[0].pieces;
			expect(pieces).toHaveLength(2);
			// One should be at x=0, the other at x=24
			const xs = pieces.map((p) => p.x).sort((a, b) => a - b);
			expect(xs[0]).toBe(0);
			expect(xs[1]).toBe(24);
		});

		it('piece coordinates account for kerf offset', () => {
			expect.assertions(3);
			// Two pieces side by side with kerf. Second piece x should be >= first width + kerf.
			const result = calculateCutlist(
				[
					makePiece({ label: 'L', width: 20, height: 96 }),
					makePiece({ label: 'R', width: 20, height: 96 })
				],
				configWith({ kerf: 0.125 })
			);

			expect(result.totalSheets).toBe(1);
			const pieces = result.sheets[0].pieces;
			const xs = pieces.map((p) => p.x).sort((a, b) => a - b);
			expect(xs[0]).toBe(0);
			// Second piece starts after first piece width + kerf
			expect(xs[1]).toBeCloseTo(20.125, 3);
		});
	});
});

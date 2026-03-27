import { describe, it, expect } from 'vitest';
import { calculateCutlist } from './algorithm';
import type { PieceDefinition, SheetConfig } from './types';

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

	it('overflows to second sheet when kerf makes pieces too wide', () => {
		expect.assertions(1);
		// Full-height pieces cannot stack vertically, so only width matters.
		// 3 pieces of 24×96 on a 48-wide sheet overflow once kerf is applied.
		const result = calculateCutlist(
			[makePiece({ label: 'A', width: 24, height: 96, quantity: 3 })],
			configWith({ kerf: 0.125 })
		);

		expect(result.totalSheets).toBe(2);
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
});

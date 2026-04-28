import { describe, it, expect } from 'vitest';
import {
	findPairingHints,
	findSmallStockSuggestions,
	findConfigSuggestions,
	findTrimSuggestions
} from '$lib/suggestions';
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
	grainDirection: false,
	oversizeTolerance: 0
};

function configWith(overrides: Partial<SheetConfig> = {}): SheetConfig {
	return { ...defaultConfig, ...overrides };
}

describe('findPairingHints', () => {
	describe('column pairing — same width, sum heights', () => {
		it('flags two 14×48 pieces that overflow a 96″ column by exactly the kerf', () => {
			expect.assertions(6);
			const pieces = [makePiece({ label: 'Panel', width: 14, height: 48, quantity: 2 })];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(1);
			expect(hints[0].axis).toBe('column');
			expect(hints[0].sharedDim).toBe(14);
			expect(hints[0].pairedLength).toBe(96);
			expect(hints[0].overshoot).toBeCloseTo(0.125, 4);
			expect(hints[0].selfPair).toBe(true);
		});

		it('flags two distinct pieces that share width and barely overflow', () => {
			expect.assertions(3);
			const pieces = [
				makePiece({ label: 'EndPanel', width: 14, height: 48 }),
				makePiece({ label: 'CenterDiv', width: 14, height: 48 })
			];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(1);
			expect(hints[0].selfPair).toBe(false);
			expect(hints[0].overshoot).toBeCloseTo(0.125, 4);
		});

		it('does not flag pairs that fit cleanly in the column', () => {
			expect.assertions(1);
			const pieces = [makePiece({ width: 14, height: 47, quantity: 2 })];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(0);
		});

		it('does not flag pairs that overflow by significantly more than one kerf', () => {
			expect.assertions(1);
			// 50 + 50 + 0.125 = 100.125, overflows 96 by 4.125 — not actionable
			const pieces = [makePiece({ width: 14, height: 50, quantity: 2 })];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(0);
		});
	});

	describe('row pairing — same height, sum widths', () => {
		it('flags two pieces that share height and barely overflow sheet width', () => {
			expect.assertions(3);
			// 24 + 24 + 0.125 = 48.125, overflows 48 by 0.125
			const pieces = [makePiece({ width: 24, height: 30, quantity: 2 })];

			const hints = findPairingHints(pieces, configWith({ grainDirection: true }));

			expect(hints).toHaveLength(1);
			expect(hints[0].axis).toBe('row');
			expect(hints[0].sharedDim).toBe(30);
		});
	});

	describe('rotation handling', () => {
		it('detects pairing through rotation when grain direction is unlocked', () => {
			expect.assertions(2);
			// A 48×14 piece (rotated) shares width with a 14×48 piece — they could pair
			// in a 14″ column.
			const pieces = [
				makePiece({ label: 'A', width: 14, height: 48 }),
				makePiece({ label: 'B', width: 48, height: 14 })
			];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints.length).toBeGreaterThanOrEqual(1);
			expect(hints.some((h) => h.axis === 'column' && h.sharedDim === 14)).toBe(true);
		});

		it('does not detect rotation pairing when grain direction is locked', () => {
			expect.assertions(1);
			const pieces = [
				makePiece({ width: 14, height: 48 }),
				makePiece({ width: 48, height: 14 })
			];

			const hints = findPairingHints(pieces, configWith({ grainDirection: true }));

			expect(hints.find((h) => h.sharedDim === 14)).toBeUndefined();
		});
	});

	describe('quantity guards', () => {
		it('does not self-pair a piece with quantity 1', () => {
			expect.assertions(1);
			const pieces = [makePiece({ width: 14, height: 48, quantity: 1 })];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(0);
		});

		it('skips pieces with zero or negative dimensions', () => {
			expect.assertions(1);
			const pieces = [
				makePiece({ width: 0, height: 48, quantity: 2 }),
				makePiece({ width: 14, height: 48, quantity: 0 })
			];

			const hints = findPairingHints(pieces, defaultConfig);

			expect(hints).toHaveLength(0);
		});
	});

	describe('tolerance interaction', () => {
		it('suppresses hints when oversizeTolerance already covers the overshoot', () => {
			expect.assertions(2);
			const pieces = [makePiece({ width: 14, height: 48, quantity: 2 })];

			const noTolerance = findPairingHints(pieces, configWith({ oversizeTolerance: 0 }));
			const withTolerance = findPairingHints(pieces, configWith({ oversizeTolerance: 0.125 }));

			expect(noTolerance).toHaveLength(1);
			expect(withTolerance).toHaveLength(0);
		});
	});
});

describe('calculateCutlist with oversizeTolerance', () => {
	it('packs two 14×48 pieces in one 14×96 column when tolerance allows', () => {
		expect.assertions(2);
		const pieces = [
			makePiece({ label: 'Panel', width: 14, height: 48, quantity: 2 })
		];

		const without = calculateCutlist(
			pieces,
			configWith({ oversizeTolerance: 0, width: 14, height: 96 })
		);
		const withTol = calculateCutlist(
			pieces,
			configWith({ oversizeTolerance: 0.125, width: 14, height: 96 })
		);

		// Without tolerance: two pieces don't pair (they need 96.125 in 96)
		expect(without.totalSheets).toBe(2);
		// With one-kerf tolerance: both fit on one sheet
		expect(withTol.totalSheets).toBe(1);
	});
});

describe('findSmallStockSuggestions', () => {
	it('flags a sheet whose contents fit in a smaller bounding box', () => {
		expect.assertions(4);
		// Single small piece on a 48×96 sheet — most of the sheet is wasted.
		const pieces = [makePiece({ label: 'Tiny', width: 12, height: 16 })];
		const result = calculateCutlist(pieces, defaultConfig);

		const suggestions = findSmallStockSuggestions(result, defaultConfig);

		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].sheetIndex).toBe(0);
		expect(suggestions[0].minWidth).toBe(12);
		expect(suggestions[0].minHeight).toBe(16);
	});

	it('does not flag a well-utilized sheet', () => {
		expect.assertions(1);
		// 4 pieces of 24×48 = full coverage
		const pieces = [makePiece({ width: 24, height: 48, quantity: 4 })];
		const result = calculateCutlist(pieces, configWith({ kerf: 0 }));

		const suggestions = findSmallStockSuggestions(result, defaultConfig);

		expect(suggestions).toHaveLength(0);
	});

	it('returns empty when there are no sheets', () => {
		expect.assertions(1);
		const result = calculateCutlist([], defaultConfig);

		const suggestions = findSmallStockSuggestions(result, defaultConfig);

		expect(suggestions).toHaveLength(0);
	});
});

describe('findConfigSuggestions', () => {
	it('suggests enabling tolerance when it would save a sheet', () => {
		expect.assertions(3);
		const pieces = [makePiece({ width: 14, height: 48, quantity: 2 })];
		const config = configWith({ width: 14, height: 96, oversizeTolerance: 0 });

		const suggestions = findConfigSuggestions(pieces, config);

		const tolHint = suggestions.find((s) => s.kind === 'enable-tolerance');
		expect(tolHint).toBeDefined();
		expect(tolHint!.sheetsSaved).toBeGreaterThanOrEqual(1);
		expect(tolHint!.wasteAfter).toBeLessThan(tolHint!.wasteBefore);
	});

	it('suggests unlocking grain when it would save a sheet', () => {
		expect.assertions(2);
		// First piece (48×60) fills the top of a 48×96 sheet, leaving 48×35.875.
		// Second piece (24×48) doesn't fit unrotated (48 > 35.875 free height) — but
		// rotated to 48×24 it fits in the leftover. Locked: 2 sheets. Unlocked: 1.
		const pieces = [
			makePiece({ label: 'A', width: 48, height: 60 }),
			makePiece({ label: 'B', width: 24, height: 48 })
		];
		const lockedConfig = configWith({ grainDirection: true });

		const suggestions = findConfigSuggestions(pieces, lockedConfig);

		const grainHint = suggestions.find((s) => s.kind === 'unlock-grain');
		expect(grainHint).toBeDefined();
		expect(grainHint!.sheetsSaved).toBeGreaterThanOrEqual(1);
	});

	it('returns no suggestions when nothing helps', () => {
		expect.assertions(1);
		const pieces = [makePiece({ width: 12, height: 12 })];

		const suggestions = findConfigSuggestions(pieces, defaultConfig);

		expect(suggestions).toHaveLength(0);
	});

	it('does not suggest enabling tolerance when already enabled', () => {
		expect.assertions(1);
		const pieces = [makePiece({ width: 14, height: 48, quantity: 2 })];
		const config = configWith({ width: 14, height: 96, oversizeTolerance: 0.125 });

		const suggestions = findConfigSuggestions(pieces, config);

		expect(suggestions.find((s) => s.kind === 'enable-tolerance')).toBeUndefined();
	});
});

describe('findTrimSuggestions', () => {
	it('suggests a trim that reduces sheet count', () => {
		expect.assertions(4);
		// Two 14×48 pieces overflow a 14×96 column by exactly the kerf. Trimming
		// either piece by ≥ kerf saves a sheet.
		const pieces = [makePiece({ label: 'Panel', width: 14, height: 48, quantity: 2 })];
		const config = configWith({ width: 14, height: 96 });

		const suggestions = findTrimSuggestions(pieces, config);

		expect(suggestions.length).toBeGreaterThanOrEqual(1);
		const heightTrim = suggestions.find((s) => s.dimension === 'height');
		expect(heightTrim).toBeDefined();
		expect(heightTrim!.sheetsSaved).toBeGreaterThanOrEqual(1);
		expect(heightTrim!.trimmedValue).toBeLessThan(heightTrim!.originalValue);
	});

	it('returns empty when no trim helps', () => {
		expect.assertions(1);
		// Pieces that already fit cleanly — trimming doesn't reduce sheet count.
		const pieces = [makePiece({ width: 24, height: 48, quantity: 4 })];

		const suggestions = findTrimSuggestions(pieces, configWith({ kerf: 0 }));

		expect(suggestions).toHaveLength(0);
	});

	it('skips pieces with very small dimensions', () => {
		expect.assertions(1);
		// 3" pieces are too small to trim usefully — should be skipped.
		const pieces = [makePiece({ width: 3, height: 3, quantity: 100 })];

		const suggestions = findTrimSuggestions(pieces, defaultConfig);

		expect(suggestions.every((s) => s.originalValue >= 4)).toBe(true);
	});
});

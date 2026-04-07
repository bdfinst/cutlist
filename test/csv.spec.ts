import { describe, it, expect } from 'vitest';
import { parseCSV } from '$lib/csv';

describe('parseCSV', () => {
	it('parses a CSV with headers', () => {
		expect.assertions(4);
		const result = parseCSV('label,width,height,quantity\nShelf,12,24,3\nSide Panel,24,48,2');

		expect(result.pieces).toHaveLength(2);
		expect(result.pieces[0]).toEqual({ label: 'Shelf', width: 12, height: 24, quantity: 3 });
		expect(result.pieces[1]).toEqual({ label: 'Side Panel', width: 24, height: 48, quantity: 2 });
		expect(result.warnings).toHaveLength(0);
	});

	it('parses a CSV without headers using positional columns', () => {
		expect.assertions(3);
		const result = parseCSV('Shelf,12,24,3\nPanel,24,48,2');

		expect(result.pieces).toHaveLength(2);
		expect(result.pieces[0]).toEqual({ label: 'Shelf', width: 12, height: 24, quantity: 3 });
		expect(result.pieces[1]).toEqual({ label: 'Panel', width: 24, height: 48, quantity: 2 });
	});

	it('defaults quantity to 1 when column is missing', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height\nShelf,12,24');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].quantity).toBe(1);
	});

	it('defaults quantity to 1 when value is invalid', () => {
		expect.assertions(1);
		const result = parseCSV('Shelf,12,24,abc');

		expect(result.pieces[0].quantity).toBe(1);
	});

	it('skips rows with non-numeric width', () => {
		expect.assertions(3);
		const result = parseCSV('label,width,height,quantity\nShelf,abc,24,1\nPanel,24,48,2');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].label).toBe('Panel');
		expect(result.warnings).toHaveLength(1);
	});

	it('skips rows with zero or negative dimensions', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height\nBad,0,24\nAlsoBad,-5,10\nGood,12,24');

		expect(result.pieces).toHaveLength(1);
		expect(result.warnings).toHaveLength(2);
	});

	it('ignores empty lines', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height\n\nShelf,12,24\n\n\nPanel,24,48\n');

		expect(result.pieces).toHaveLength(2);
		expect(result.warnings).toHaveLength(0);
	});

	it('handles Windows-style line endings', () => {
		expect.assertions(1);
		const result = parseCSV('label,width,height\r\nShelf,12,24\r\nPanel,24,48');

		expect(result.pieces).toHaveLength(2);
	});

	it('handles quoted fields with commas', () => {
		expect.assertions(1);
		const result = parseCSV('"Side, Left Panel",12,24,2');

		expect(result.pieces[0].label).toBe('Side, Left Panel');
	});

	it('handles quoted fields with escaped quotes', () => {
		expect.assertions(1);
		const result = parseCSV('"12"" Shelf",12,24,1');

		expect(result.pieces[0].label).toBe('12" Shelf');
	});

	it('recognizes alternative header names', () => {
		expect.assertions(2);
		const result = parseCSV('name,w,h,qty\nShelf,12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: 'Shelf', width: 12, height: 24, quantity: 3 });
	});

	it('handles case-insensitive headers', () => {
		expect.assertions(1);
		const result = parseCSV('Label,Width,Height,Quantity\nShelf,12,24,3');

		expect(result.pieces).toHaveLength(1);
	});

	it('returns empty result for empty input', () => {
		expect.assertions(2);
		const result = parseCSV('');

		expect(result.pieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it('floors fractional quantities', () => {
		expect.assertions(1);
		const result = parseCSV('Shelf,12,24,2.7');

		expect(result.pieces[0].quantity).toBe(2);
	});

	it('includes row number in warning messages', () => {
		expect.assertions(1);
		const result = parseCSV('label,width,height\nGood,12,24\nBad,abc,24');

		expect(result.warnings[0]).toContain('Row 3');
	});

	it('skips rows with non-numeric height', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity\nShelf,12,abc,1');

		expect(result.pieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(1);
	});

	it('defaults quantity to 1 when value is zero or less than 1', () => {
		expect.assertions(2);
		const result = parseCSV('A,12,24,0\nB,12,24,0.5');

		expect(result.pieces[0].quantity).toBe(1);
		expect(result.pieces[1].quantity).toBe(1);
	});

	it('parses decimal dimensions correctly', () => {
		expect.assertions(2);
		const result = parseCSV('Shelf,12.5,24.75,1');

		expect(result.pieces[0].width).toBe(12.5);
		expect(result.pieces[0].height).toBe(24.75);
	});

	it('returns empty pieces for header-only CSV', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity');

		expect(result.pieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it('recognizes piece and count as header aliases', () => {
		expect.assertions(1);
		const result = parseCSV('piece,w,h,count\nShelf,12,24,3');

		expect(result.pieces[0]).toEqual({ label: 'Shelf', width: 12, height: 24, quantity: 3 });
	});

	it('recognizes headers with parenthetical units like "Width (in)"', () => {
		expect.assertions(3);
		const result = parseCSV('Qty,Width (in),Length (in),Area (sq in)\n2,14,48,1344');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: '', width: 14, height: 48, quantity: 2 });
		expect(result.warnings).toHaveLength(0);
	});

	it('recognizes "length" as a height alias', () => {
		expect.assertions(2);
		const result = parseCSV('width,length,qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: '', width: 12, height: 24, quantity: 3 });
	});
});

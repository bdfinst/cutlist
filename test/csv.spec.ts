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

	it('never produces NaN labels when label column is absent', () => {
		expect.assertions(3);
		const result = parseCSV('Qty,Width (in),Length (in),Area (sq in)\n2,14,48,1344\n1,3.5,55,192.5');

		expect(result.pieces).toHaveLength(2);
		for (const p of result.pieces) {
			expect(p.label).not.toContain('NaN');
		}
	});

	it('recognizes "length" as a height alias', () => {
		expect.assertions(2);
		const result = parseCSV('width,length,qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: '', width: 12, height: 24, quantity: 3 });
	});

	it('returns empty lumberPieces when no material column exists', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity\nShelf,12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.lumberPieces).toHaveLength(0);
	});

	it('routes rows with material column value to lumberPieces', () => {
		expect.assertions(4);
		const result = parseCSV('label,width,height,quantity,material\nRail,1.5,3.5,4,2x4');

		expect(result.pieces).toHaveLength(0);
		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0]).toEqual({
			label: 'Rail',
			width: 1.5,
			height: 3.5,
			length: 3.5,
			quantity: 4,
			material: '2x4'
		});
		expect(result.warnings).toHaveLength(0);
	});

	it('routes rows with empty material to pieces (plywood)', () => {
		expect.assertions(3);
		const result = parseCSV('label,width,height,quantity,material\nShelf,12,24,3,\nRail,1.5,3.5,4,2x4');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: 'Shelf', width: 12, height: 24, quantity: 3 });
		expect(result.lumberPieces).toHaveLength(1);
	});

	it('splits mixed CSV between pieces and lumberPieces', () => {
		expect.assertions(4);
		const csv = [
			'label,width,height,quantity,material',
			'Shelf,12,24,3,',
			'Side Panel,24,48,2,',
			'Rail,1.5,3.5,4,2x4',
			'Stile,1.5,3.5,2,2x4'
		].join('\n');
		const result = parseCSV(csv);

		expect(result.pieces).toHaveLength(2);
		expect(result.lumberPieces).toHaveLength(2);
		expect(result.lumberPieces[0].material).toBe('2x4');
		expect(result.lumberPieces[1].label).toBe('Stile');
	});

	it('recognizes "type" as a material header alias', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity,type\nRail,1.5,3.5,4,2x4');

		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0].material).toBe('2x4');
	});

	it('recognizes "wood" as a material header alias', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity,wood\nRail,1.5,3.5,4,Oak 2x4');

		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0].material).toBe('Oak 2x4');
	});

	it('recognizes "stock" as a material header alias', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity,stock\nRail,1.5,3.5,4,2x6');

		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0].material).toBe('2x6');
	});

	it('sets lumber piece length equal to height column value', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,quantity,material\nLeg,3.5,28,4,4x4');

		expect(result.lumberPieces[0].length).toBe(28);
		expect(result.lumberPieces[0].height).toBe(28);
	});

	it('returns empty lumberPieces for empty input', () => {
		expect.assertions(1);
		const result = parseCSV('');

		expect(result.lumberPieces).toHaveLength(0);
	});

	// --- Mutant-killing tests ---

	it('parses single-letter aliases w and h as width and height', () => {
		expect.assertions(3);
		const result = parseCSV('w,h,qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].width).toBe(12);
		expect(result.pieces[0].height).toBe(24);
	});

	it('handles headers with trailing whitespace after normalization', () => {
		expect.assertions(3);
		const result = parseCSV('Label , Width , Height , Qty\nShelf,12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].width).toBe(12);
		expect(result.pieces[0].height).toBe(24);
	});

	it('strips parenthetical suffix with no space before paren', () => {
		expect.assertions(2);
		const result = parseCSV('Width(in),Height(in),Qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: '', width: 12, height: 24, quantity: 3 });
	});

	it('only strips parenthetical at end of header, not mid-string', () => {
		expect.assertions(3);
		// "Width (in) extra" — the $ anchor means the regex only strips trailing parens
		// normalizeHeader produces "width (in) extra" which is not in WIDTH_HEADERS
		// No width header found → header detection fails → positional parsing
		// Row 0: "Width (in) extra" has NaN width at col1 → skipped
		// Row 1: positional → label="12", width=24, height=3
		const result = parseCSV('Width (in) extra,Height,Qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0]).toEqual({ label: '12', width: 24, height: 3, quantity: 1 });
		expect(result.warnings).toHaveLength(1);
	});

	it('trims whitespace from field values in splitCSVRow', () => {
		expect.assertions(3);
		const result = parseCSV(' Shelf , 12 , 24 , 3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].label).toBe('Shelf');
		expect(result.pieces[0].width).toBe(12);
	});

	it('does not detect headers when only width is present without height', () => {
		expect.assertions(3);
		const result = parseCSV('width,data\n12,24');

		// Without height header, falls back to positional parsing
		// Row 0: label="width", width=parseFloat("data")=NaN → skipped
		// Row 1: label="12", width=24, height=undefined→NaN → skipped
		expect(result.pieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(2);
		expect(result.warnings[0]).toContain('invalid dimensions');
	});

	it('treats an all-numeric first row as data, not headers', () => {
		expect.assertions(3);
		const result = parseCSV('10,20,30');

		// Positional: col0=label, col1=width, col2=height
		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].width).toBe(20);
		expect(result.pieces[0].height).toBe(30);
	});

	it('returns empty result for completely empty string', () => {
		expect.assertions(3);
		const result = parseCSV('');

		expect(result.pieces).toHaveLength(0);
		expect(result.lumberPieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it('produces empty label when headers exist but no label column', () => {
		expect.assertions(3);
		const result = parseCSV('width,height,qty\n12,24,3');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].label).toBe('');
		expect(result.pieces[0].quantity).toBe(3);
	});

	it('trims leading and trailing whitespace from data lines', () => {
		expect.assertions(3);
		const result = parseCSV('  Shelf,12,24,3  ');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].label).toBe('Shelf');
		expect(result.pieces[0].width).toBe(12);
	});

	it('warns on rows with fewer fields than expected', () => {
		expect.assertions(3);
		const result = parseCSV('label,width,height,qty\nShelf');

		// fields[1] and fields[2] are undefined → fallback to '' → NaN → warning
		expect(result.pieces).toHaveLength(0);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('invalid dimensions');
	});

	it('skips a row with height equal to zero', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height\nBad,12,0\nGood,12,24');

		expect(result.pieces).toHaveLength(1);
		expect(result.warnings).toHaveLength(1);
	});

	it('accepts quantity of exactly 1 without defaulting', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,qty\nShelf,12,24,1');

		expect(result.pieces).toHaveLength(1);
		expect(result.pieces[0].quantity).toBe(1);
	});

	it('parses material when it is the first column (index 0)', () => {
		expect.assertions(3);
		const result = parseCSV('material,width,height,qty\n2x4,1.5,3.5,4');

		expect(result.pieces).toHaveLength(0);
		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0].material).toBe('2x4');
	});

	it('trims whitespace from material values', () => {
		expect.assertions(2);
		const result = parseCSV('label,width,height,qty,material\nRail,1.5,3.5,4, 2x4 ');

		expect(result.lumberPieces).toHaveLength(1);
		expect(result.lumberPieces[0].material).toBe('2x4');
	});
});

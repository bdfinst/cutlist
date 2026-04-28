import { describe, it, expect } from 'vitest';
import { wasteClass } from '$lib/waste-color';

describe('wasteClass', () => {
	it('returns text-success below 15', () => {
		expect(wasteClass(0)).toBe('text-success');
		expect(wasteClass(5)).toBe('text-success');
		expect(wasteClass(14.99)).toBe('text-success');
	});

	it('returns text-warn at 15 (lower bound, inclusive)', () => {
		expect(wasteClass(15)).toBe('text-warn');
	});

	it('returns text-warn at 30 (upper bound, inclusive)', () => {
		expect(wasteClass(30)).toBe('text-warn');
	});

	it('returns text-warn for 21.9 (closet CSV case)', () => {
		expect(wasteClass(21.9)).toBe('text-warn');
	});

	it('returns text-danger above 30', () => {
		expect(wasteClass(30.01)).toBe('text-danger');
		expect(wasteClass(50)).toBe('text-danger');
		expect(wasteClass(100)).toBe('text-danger');
	});

	it('returns text-success for 0 (no waste)', () => {
		expect(wasteClass(0)).toBe('text-success');
	});

	it('returns text-danger for negative (defensive — should not happen but mustn\'t throw)', () => {
		expect(wasteClass(-1)).toBe('text-success');
	});
});

import { describe, it, expect } from 'vitest';
import { hexToRgb, getContrastColor, getColor } from '$lib/colors';

describe('hexToRgb', () => {
	it('parses a 6-digit hex string', () => {
		expect.assertions(3);
		const [r, g, b] = hexToRgb('#4e79a7');
		expect(r).toBe(0x4e);
		expect(g).toBe(0x79);
		expect(b).toBe(0xa7);
	});

	it('parses pure white and pure black without producing NaN', () => {
		expect.assertions(2);
		const white = hexToRgb('#ffffff');
		const black = hexToRgb('#000000');
		expect(white.every((v) => !Number.isNaN(v))).toBe(true);
		expect(black.every((v) => !Number.isNaN(v))).toBe(true);
	});
});

describe('getContrastColor', () => {
	it('returns 6-digit hex (jsPDF v4 rejects NaN from short-form hex)', () => {
		expect.assertions(2);
		// Regression: returning '#fff' / '#000' caused hexToRgb to produce NaN on the
		// third channel (slice(5,7) of a 4-char string is empty), which jsPDF v4
		// rejects with "Invalid argument passed to jsPDF.f3".
		expect(getContrastColor('#000000')).toBe('#ffffff');
		expect(getContrastColor('#ffffff')).toBe('#000000');
	});

	it('round-trips through hexToRgb without producing NaN for any palette color', () => {
		expect.assertions(36);
		// All 12 palette colors × 3 channels of contrast color = 36 non-NaN numbers
		for (let i = 0; i < 12; i++) {
			const palette = getColor(i);
			const contrast = getContrastColor(palette);
			const [r, g, b] = hexToRgb(contrast);
			expect(Number.isNaN(r)).toBe(false);
			expect(Number.isNaN(g)).toBe(false);
			expect(Number.isNaN(b)).toBe(false);
		}
	});
});

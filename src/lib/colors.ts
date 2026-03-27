// Tableau colorblind-safe palette
const PALETTE = [
	'#4e79a7',
	'#f28e2b',
	'#e15759',
	'#76b7b2',
	'#59a14f',
	'#edc948',
	'#b07aa1',
	'#ff9da7',
	'#9c755f',
	'#bab0ac',
	'#af7aa1',
	'#86bcb6'
];

export function getColor(index: number): string {
	return PALETTE[index % PALETTE.length];
}

export function hexToRgb(hex: string): [number, number, number] {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16)
	];
}

export function getContrastColor(hex: string): string {
	const [r, g, b] = hexToRgb(hex);
	// Relative luminance (ITU-R BT.709)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#000' : '#fff';
}

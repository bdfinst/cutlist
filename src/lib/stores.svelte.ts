import { getColor } from './colors';
import type { PieceDefinition, SheetConfig } from './types';

export const DEFAULT_PIECE_WIDTH = 12;
export const DEFAULT_PIECE_HEIGHT = 24;
export const DEFAULT_PIECE_QUANTITY = 1;

export const DEFAULT_CONFIG: SheetConfig = {
	width: 48,
	height: 96,
	kerf: 0.125,
	grainDirection: false
};

export let pieces = $state<PieceDefinition[]>([]);
export let config = $state<SheetConfig>({ ...DEFAULT_CONFIG });

let nextColorIndex = 0;

export function addPiece(label: string, width: number, height: number, quantity: number): void {
	const piece: PieceDefinition = {
		id: crypto.randomUUID(),
		label,
		width,
		height,
		quantity,
		color: getColor(nextColorIndex++)
	};
	pieces = [...pieces, piece];
}

export function removePiece(id: string): void {
	pieces = pieces.filter((p) => p.id !== id);
}

export function updatePiece(id: string, updates: Partial<Omit<PieceDefinition, 'id' | 'color'>>): void {
	pieces = pieces.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

export function updateConfig(updates: Partial<SheetConfig>): void {
	config = { ...config, ...updates };
}

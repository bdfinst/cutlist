import { browser } from '$app/environment';
import { getColor } from './colors';
import { calculateCutlist } from './algorithm';
import type { PieceDefinition, SheetConfig, CutlistResult } from './types';

export const DEFAULT_PIECE_WIDTH = 12;
export const DEFAULT_PIECE_HEIGHT = 24;
export const DEFAULT_PIECE_QUANTITY = 1;

const STORAGE_KEY = 'cutlist-data';

export const DEFAULT_CONFIG: SheetConfig = {
	width: 48,
	height: 96,
	kerf: 0.125,
	grainDirection: false
};

function loadSaved(): { pieces: PieceDefinition[]; config: SheetConfig; nextColor: number } {
	if (!browser) return { pieces: [], config: { ...DEFAULT_CONFIG }, nextColor: 0 };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw);
			return {
				pieces: Array.isArray(data.pieces) ? data.pieces : [],
				config: data.config ? { ...DEFAULT_CONFIG, ...data.config } : { ...DEFAULT_CONFIG },
				nextColor: typeof data.nextColor === 'number' ? data.nextColor : (data.pieces?.length ?? 0)
			};
		}
	} catch {
		// Corrupted data — fall back to defaults
	}
	return { pieces: [], config: { ...DEFAULT_CONFIG }, nextColor: 0 };
}

const saved = loadSaved();

export let pieces = $state<PieceDefinition[]>(saved.pieces);
export let config = $state<SheetConfig>(saved.config);

let nextColorIndex = saved.nextColor;

export const cutlistResult: CutlistResult = $derived(calculateCutlist(pieces, config));

function persist(): void {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ pieces, config, nextColor: nextColorIndex }));
	} catch {
		// localStorage unavailable (private browsing) — silently skip
	}
}

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
	persist();
}

export function removePiece(id: string): void {
	pieces = pieces.filter((p) => p.id !== id);
	persist();
}

export function updatePiece(id: string, updates: Partial<Omit<PieceDefinition, 'id' | 'color'>>): void {
	pieces = pieces.map((p) => (p.id === id ? { ...p, ...updates } : p));
	persist();
}

export function updateConfig(updates: Partial<SheetConfig>): void {
	config = { ...config, ...updates };
	persist();
}

export function reset(): void {
	pieces = [];
	config = { ...DEFAULT_CONFIG };
	nextColorIndex = 0;
	persist();
}

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

class CutlistStore {
	pieces = $state<PieceDefinition[]>(saved.pieces);
	config = $state<SheetConfig>(saved.config);
	#nextColorIndex = saved.nextColor;

	readonly result: CutlistResult = $derived(calculateCutlist(this.pieces, this.config));

	#persist(): void {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				pieces: this.pieces,
				config: this.config,
				nextColor: this.#nextColorIndex
			}));
		} catch {
			// localStorage unavailable — silently skip
		}
	}

	addPiece(label: string, width: number, height: number, quantity: number): void {
		const piece: PieceDefinition = {
			id: crypto.randomUUID(),
			label,
			width,
			height,
			quantity,
			color: getColor(this.#nextColorIndex++)
		};
		this.pieces = [...this.pieces, piece];
		this.#persist();
	}

	removePiece(id: string): void {
		this.pieces = this.pieces.filter((p) => p.id !== id);
		this.#persist();
	}

	updatePiece(id: string, updates: Partial<Omit<PieceDefinition, 'id' | 'color'>>): void {
		this.pieces = this.pieces.map((p) => (p.id === id ? { ...p, ...updates } : p));
		this.#persist();
	}

	updateConfig(updates: Partial<SheetConfig>): void {
		this.config = { ...this.config, ...updates };
		this.#persist();
	}

	reset(): void {
		this.pieces = [];
		this.config = { ...DEFAULT_CONFIG };
		this.#nextColorIndex = 0;
		this.#persist();
	}
}

export const store = new CutlistStore();

// Expose store for e2e testing (dev builds only)
if (browser && import.meta.env.DEV) {
	(window as any).__cutlistStore = store;
}

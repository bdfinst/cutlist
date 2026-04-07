import { browser } from '$app/environment';
import { getColor } from './colors';
import { calculateCutlist } from './algorithm';
import type { PieceDefinition, SheetConfig, CutlistResult } from './types';

export const DEFAULT_PIECE_WIDTH = 12;
export const DEFAULT_PIECE_HEIGHT = 24;
export const DEFAULT_PIECE_QUANTITY = 1;

export const DEFAULT_CONFIG: SheetConfig = {
	width: 48,
	height: 96,
	kerf: 0.125,
	grainDirection: false
};

class CutlistStore {
	pieces = $state<PieceDefinition[]>([]);
	config = $state<SheetConfig>({ ...DEFAULT_CONFIG });
	#nextColorIndex = 0;

	readonly result: CutlistResult = $derived(calculateCutlist(this.pieces, this.config));

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
	}

	removePiece(id: string): void {
		this.pieces = this.pieces.filter((p) => p.id !== id);
	}

	updatePiece(id: string, updates: Partial<Omit<PieceDefinition, 'id' | 'color'>>): void {
		this.pieces = this.pieces.map((p) => (p.id === id ? { ...p, ...updates } : p));
	}

	updateConfig(updates: Partial<SheetConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	reset(): void {
		this.pieces = [];
		this.config = { ...DEFAULT_CONFIG };
		this.#nextColorIndex = 0;
	}
}

export const store = new CutlistStore();

// Expose store for e2e testing (dev builds only)
if (browser && import.meta.env.DEV) {
	(window as any).__cutlistStore = store;
}

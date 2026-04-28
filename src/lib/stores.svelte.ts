import { browser } from '$app/environment';
import { getColor } from './colors';
import { calculateCutlist } from './algorithm';
import { calculateLumberCutlist, fitsLumberCrossSection } from './lumber-algorithm';
import {
	findPairingHints,
	findSmallStockSuggestions,
	findConfigSuggestions,
	findTrimSuggestions,
	type PairingHint,
	type SmallStockSuggestion,
	type ConfigSuggestion,
	type TrimSuggestion
} from './suggestions';
import {
	loadPersistedState,
	savePersistedState,
	type PersistedState,
	type StorageLike
} from './persistence';
import type {
	PieceDefinition,
	SheetConfig,
	CutlistResult,
	LumberType,
	LumberPiece,
	LumberResult
} from './types';

export const DEFAULT_PIECE_WIDTH = 12;
export const DEFAULT_PIECE_HEIGHT = 24;
export const DEFAULT_PIECE_QUANTITY = 1;

export const DEFAULT_CONFIG: SheetConfig = {
	width: 48,
	height: 96,
	kerf: 0.125,
	grainDirection: false,
	oversizeTolerance: 0
};

class CutlistStore {
	pieces = $state<PieceDefinition[]>([]);
	config = $state<SheetConfig>({ ...DEFAULT_CONFIG });
	lumberTypes = $state<LumberType[]>([]);
	lumberPieces = $state<LumberPiece[]>([]);
	#nextColorIndex = 0;
	#storage: StorageLike | null = null;

	constructor() {
		if (!browser) return;
		try {
			this.#storage = window.localStorage;
		} catch {
			// Storage unavailable (e.g. privacy mode) — silently skip persistence.
			return;
		}

		this.#hydrate();
		this.#startPersistence();
	}

	#hydrate(): void {
		if (!this.#storage) return;
		const data = loadPersistedState(this.#storage);
		if (!data) return;
		this.pieces = data.pieces;
		this.config = { ...DEFAULT_CONFIG, ...data.config };
		this.lumberTypes = data.lumberTypes;
		this.lumberPieces = data.lumberPieces;
		this.#nextColorIndex = data.nextColorIndex;
	}

	#startPersistence(): void {
		const storage = this.#storage;
		if (!storage) return;
		$effect.root(() => {
			$effect(() => {
				const snapshot: PersistedState = {
					pieces: $state.snapshot(this.pieces) as PieceDefinition[],
					config: $state.snapshot(this.config) as SheetConfig,
					lumberTypes: $state.snapshot(this.lumberTypes) as LumberType[],
					lumberPieces: $state.snapshot(this.lumberPieces) as LumberPiece[],
					nextColorIndex: this.#nextColorIndex
				};
				savePersistedState(storage, snapshot);
			});
		});
	}

	readonly result: CutlistResult = $derived(calculateCutlist(this.pieces, this.config));
	readonly pairingHints: PairingHint[] = $derived(findPairingHints(this.pieces, this.config));
	readonly smallStockSuggestions: SmallStockSuggestion[] = $derived(
		findSmallStockSuggestions(this.result, this.config)
	);
	readonly configSuggestions: ConfigSuggestion[] = $derived(
		findConfigSuggestions(this.pieces, this.config)
	);
	readonly trimSuggestions: TrimSuggestion[] = $derived(
		findTrimSuggestions(this.pieces, this.config)
	);
	readonly lumberResult: LumberResult = $derived(
		calculateLumberCutlist(this.lumberPieces, this.lumberTypes, this.config.kerf)
	);

	// --- Plywood pieces ---

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

	// --- Lumber types ---

	addLumberType(name: string, crossWidth: number, crossHeight: number, lengths: number[]): void {
		const lt: LumberType = {
			id: crypto.randomUUID(),
			name,
			crossWidth,
			crossHeight,
			availableLengths: [...lengths]
		};
		this.lumberTypes = [...this.lumberTypes, lt];
	}

	removeLumberType(id: string): void {
		this.lumberTypes = this.lumberTypes.filter((t) => t.id !== id);
		this.lumberPieces = this.lumberPieces.map((p) =>
			p.lumberTypeId === id ? { ...p, lumberTypeId: null } : p
		);
	}

	updateLumberType(id: string, updates: Partial<Omit<LumberType, 'id'>>): void {
		this.lumberTypes = this.lumberTypes.map((t) => (t.id === id ? { ...t, ...updates } : t));
	}

	addLumberLength(typeId: string, length: number): void {
		this.lumberTypes = this.lumberTypes.map((t) =>
			t.id === typeId
				? { ...t, availableLengths: [...t.availableLengths, length] }
				: t
		);
	}

	removeLumberLength(typeId: string, length: number): void {
		this.lumberTypes = this.lumberTypes.map((t) =>
			t.id === typeId
				? { ...t, availableLengths: t.availableLengths.filter((l) => l !== length) }
				: t
		);
	}

	// --- Lumber pieces ---

	addLumberPiece(label: string, length: number, quantity: number, lumberTypeId?: string): void {
		const piece: LumberPiece = {
			id: crypto.randomUUID(),
			label,
			length,
			quantity,
			lumberTypeId: lumberTypeId ?? null,
			color: getColor(this.#nextColorIndex++)
		};
		this.lumberPieces = [...this.lumberPieces, piece];
	}

	removeLumberPiece(id: string): void {
		this.lumberPieces = this.lumberPieces.filter((p) => p.id !== id);
	}

	updateLumberPiece(id: string, updates: Partial<Omit<LumberPiece, 'id' | 'color'>>): void {
		this.lumberPieces = this.lumberPieces.map((p) => (p.id === id ? { ...p, ...updates } : p));
	}

	assignLumberType(
		pieceId: string,
		lumberTypeId: string | null
	): { ok: true } | { ok: false; reason: string } {
		if (lumberTypeId === null) {
			this.lumberPieces = this.lumberPieces.map((p) =>
				p.id === pieceId ? { ...p, lumberTypeId: null } : p
			);
			return { ok: true };
		}

		const piece = this.lumberPieces.find((p) => p.id === pieceId);
		const lumberType = this.lumberTypes.find((t) => t.id === lumberTypeId);
		if (!piece || !lumberType) return { ok: false, reason: 'Piece or lumber type not found' };

		// Lumber pieces don't have width/height cross-section — they inherit from the lumber type
		// Assignment is always valid for lumber pieces (cross-section is the lumber type's property)
		this.lumberPieces = this.lumberPieces.map((p) =>
			p.id === pieceId ? { ...p, lumberTypeId } : p
		);
		return { ok: true };
	}

	// --- Reset ---

	reset(): void {
		this.pieces = [];
		this.lumberTypes = [];
		this.lumberPieces = [];
		this.config = { ...DEFAULT_CONFIG };
		this.#nextColorIndex = 0;
		// Persistence $effect picks up the state mutations and saves the cleared
		// snapshot — equivalent to a fresh hydrate on next load.
	}
}

export const store = new CutlistStore();

// Expose store for e2e testing (dev builds only)
if (browser && import.meta.env.DEV) {
	(window as any).__cutlistStore = store;
}

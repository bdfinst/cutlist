import type {
	PieceDefinition,
	SheetConfig,
	LumberType,
	LumberPiece,
	CutlistMode
} from './types';

/**
 * Storage key. Bumped when the on-disk schema changes in an incompatible way —
 * older entries are ignored on load rather than crashing the app.
 */
export const STORAGE_KEY = 'cutlist-state-v1';

export interface PersistedState {
	pieces: PieceDefinition[];
	config: SheetConfig;
	lumberTypes: LumberType[];
	lumberPieces: LumberPiece[];
	nextColorIndex: number;
	mode?: CutlistMode;
}

/** Minimal Storage interface — accepts real localStorage or a mock. */
export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/**
 * Read persisted state. Returns null on missing key, parse failure, or
 * structurally invalid contents — callers fall back to defaults rather than
 * crashing.
 */
export function loadPersistedState(storage: StorageLike): PersistedState | null {
	let raw: string | null;
	try {
		raw = storage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
	if (raw === null) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	return validateState(parsed);
}

/**
 * Best-effort save. Quota exceeded or other storage errors are silently
 * ignored — the user keeps their in-memory session, just without persistence.
 */
export function savePersistedState(storage: StorageLike, state: PersistedState): void {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// ignore
	}
}

/** Wipe persisted state — used by reset(). */
export function clearPersistedState(storage: StorageLike): void {
	try {
		storage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}

function validateState(data: unknown): PersistedState | null {
	if (!data || typeof data !== 'object') return null;
	const d = data as Record<string, unknown>;
	if (!Array.isArray(d.pieces)) return null;
	if (!Array.isArray(d.lumberTypes)) return null;
	if (!Array.isArray(d.lumberPieces)) return null;
	if (!d.config || typeof d.config !== 'object') return null;
	if (typeof d.nextColorIndex !== 'number') return null;
	return d as unknown as PersistedState;
}

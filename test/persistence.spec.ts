import { describe, it, expect } from 'vitest';
import {
	loadPersistedState,
	savePersistedState,
	clearPersistedState,
	STORAGE_KEY,
	type PersistedState,
	type StorageLike
} from '$lib/persistence';

class MemoryStorage implements StorageLike {
	private data = new Map<string, string>();

	getItem(key: string): string | null {
		return this.data.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.data.set(key, value);
	}
	removeItem(key: string): void {
		this.data.delete(key);
	}
	get size(): number {
		return this.data.size;
	}
}

class ThrowingStorage implements StorageLike {
	getItem(): string | null {
		throw new Error('quota');
	}
	setItem(): void {
		throw new Error('quota');
	}
	removeItem(): void {
		throw new Error('quota');
	}
}

function makeState(overrides: Partial<PersistedState> = {}): PersistedState {
	return {
		pieces: [
			{
				id: 'p1',
				label: 'Shelf',
				width: 12,
				height: 24,
				quantity: 1,
				color: '#4e79a7'
			}
		],
		config: { width: 48, height: 96, kerf: 0.125, grainDirection: false },
		lumberTypes: [],
		lumberPieces: [],
		nextColorIndex: 1,
		...overrides
	};
}

describe('persistence', () => {
	describe('save/load round trip', () => {
		it('writes and reads back the state with all fields intact', () => {
			expect.assertions(2);
			const storage = new MemoryStorage();
			const state = makeState();

			savePersistedState(storage, state);
			const loaded = loadPersistedState(storage);

			expect(loaded).not.toBeNull();
			expect(loaded).toEqual(state);
		});

		it('writes under the documented STORAGE_KEY', () => {
			expect.assertions(1);
			const storage = new MemoryStorage();
			savePersistedState(storage, makeState());

			expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
		});
	});

	describe('loadPersistedState', () => {
		it('returns null when storage is empty', () => {
			expect.assertions(1);
			const storage = new MemoryStorage();

			expect(loadPersistedState(storage)).toBeNull();
		});

		it('returns null on corrupt JSON instead of throwing', () => {
			expect.assertions(1);
			const storage = new MemoryStorage();
			storage.setItem(STORAGE_KEY, 'not-json{');

			expect(loadPersistedState(storage)).toBeNull();
		});

		it('returns null when required fields are missing', () => {
			expect.assertions(1);
			const storage = new MemoryStorage();
			storage.setItem(STORAGE_KEY, JSON.stringify({ pieces: [] })); // missing other fields

			expect(loadPersistedState(storage)).toBeNull();
		});

		it('returns null when storage throws (e.g. privacy mode)', () => {
			expect.assertions(1);
			const storage = new ThrowingStorage();

			expect(loadPersistedState(storage)).toBeNull();
		});
	});

	describe('savePersistedState', () => {
		it('silently absorbs storage errors (does not throw)', () => {
			expect.assertions(1);
			const storage = new ThrowingStorage();

			expect(() => savePersistedState(storage, makeState())).not.toThrow();
		});
	});

	describe('clearPersistedState', () => {
		it('removes the persisted entry', () => {
			expect.assertions(2);
			const storage = new MemoryStorage();
			savePersistedState(storage, makeState());
			expect(storage.size).toBe(1);

			clearPersistedState(storage);

			expect(storage.size).toBe(0);
		});

		it('silently absorbs storage errors', () => {
			expect.assertions(1);
			const storage = new ThrowingStorage();

			expect(() => clearPersistedState(storage)).not.toThrow();
		});
	});
});

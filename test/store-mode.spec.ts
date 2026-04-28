import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

const mockStorage = {
	store: new Map<string, string>(),
	getItem(k: string) {
		return this.store.get(k) ?? null;
	},
	setItem(k: string, v: string) {
		this.store.set(k, v);
	},
	removeItem(k: string) {
		this.store.delete(k);
	},
	clear() {
		this.store.clear();
	}
};
vi.stubGlobal('window', { localStorage: mockStorage });
vi.stubGlobal('localStorage', mockStorage);

const STORAGE_KEY = 'cutlist-state-v1';

beforeEach(() => {
	mockStorage.store.clear();
	vi.resetModules();
});

async function loadStore() {
	const m = await import('../src/lib/stores.svelte');
	return m;
}

describe('store.mode default', () => {
	it('defaults to "plywood" for a fresh visitor', async () => {
		const { store } = await loadStore();
		expect(store.mode).toBe('plywood');
	});
});

describe('store.setMode', () => {
	it('updates the mode to "lumber"', async () => {
		const { store } = await loadStore();
		store.setMode('lumber');
		expect(store.mode).toBe('lumber');
	});

	it('updates the mode to "both"', async () => {
		const { store } = await loadStore();
		store.setMode('both');
		expect(store.mode).toBe('both');
	});
});

describe('hydration migration when mode is absent', () => {
	function seed(state: object) {
		mockStorage.store.set(STORAGE_KEY, JSON.stringify(state));
	}

	it('migrates pre-slice state with lumber types to "both"', async () => {
		seed({
			pieces: [],
			config: { width: 48, height: 96, kerf: 0.125, grainDirection: false, oversizeTolerance: 0 },
			lumberTypes: [
				{
					id: 'lt1',
					name: '2x4',
					crossWidth: 1.5,
					crossHeight: 3.5,
					availableLengths: [96]
				}
			],
			lumberPieces: [],
			nextColorIndex: 0
		});
		const { store } = await loadStore();
		expect(store.mode).toBe('both');
	});

	it('migrates pre-slice state with lumber pieces to "both"', async () => {
		seed({
			pieces: [],
			config: { width: 48, height: 96, kerf: 0.125, grainDirection: false, oversizeTolerance: 0 },
			lumberTypes: [],
			lumberPieces: [
				{ id: 'p1', label: 'X', length: 36, quantity: 1, lumberTypeId: null, color: '#fff' }
			],
			nextColorIndex: 1
		});
		const { store } = await loadStore();
		expect(store.mode).toBe('both');
	});

	it('migrates pre-slice state with no lumber data to "plywood"', async () => {
		seed({
			pieces: [
				{ id: 'p1', label: 'Shelf', width: 24, height: 12, quantity: 3, color: '#a' }
			],
			config: { width: 48, height: 96, kerf: 0.125, grainDirection: false, oversizeTolerance: 0 },
			lumberTypes: [],
			lumberPieces: [],
			nextColorIndex: 1
		});
		const { store } = await loadStore();
		expect(store.mode).toBe('plywood');
	});

	it('respects an explicit persisted mode', async () => {
		mockStorage.store.set(
			STORAGE_KEY,
			JSON.stringify({
				pieces: [],
				config: { width: 48, height: 96, kerf: 0.125, grainDirection: false, oversizeTolerance: 0 },
				lumberTypes: [],
				lumberPieces: [],
				nextColorIndex: 0,
				mode: 'lumber'
			})
		);
		const { store } = await loadStore();
		expect(store.mode).toBe('lumber');
	});
});

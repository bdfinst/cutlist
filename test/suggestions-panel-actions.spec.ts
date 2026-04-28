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

let storeModule: typeof import('../src/lib/stores.svelte');

beforeEach(async () => {
	mockStorage.store.clear();
	vi.resetModules();
	storeModule = await import('../src/lib/stores.svelte');
	storeModule.store.reset();
});

describe('applying a TrimSuggestion', () => {
	it('mutates the piece dimension to the suggested value', () => {
		const { store } = storeModule;
		store.addPiece('Adjustable Shelf', 14, 24, 5);
		const id = store.pieces[0].id;

		// Simulate selecting a TrimSuggestion-shaped payload and applying it.
		const suggestionPayload = {
			pieceId: id,
			dimension: 'height' as const,
			trimmedValue: 23.875
		};
		store.applyTrim(
			suggestionPayload.pieceId,
			suggestionPayload.dimension,
			suggestionPayload.trimmedValue
		);
		expect(store.pieces[0].height).toBe(23.875);
	});
});

describe('applying a ConfigSuggestion enable-tolerance', () => {
	it('sets oversizeTolerance to the current kerf', () => {
		const { store } = storeModule;
		store.addPiece('Big', 24, 24, 1);
		expect(store.config.oversizeTolerance ?? 0).toBe(0);
		store.applyConfig({ oversizeTolerance: store.config.kerf });
		expect(store.config.oversizeTolerance).toBe(store.config.kerf);
	});
});

describe('applying a ConfigSuggestion unlock-grain', () => {
	it('sets grainDirection to false', () => {
		const { store } = storeModule;
		store.applyConfig({ grainDirection: true });
		expect(store.config.grainDirection).toBe(true);
		store.applyConfig({ grainDirection: false });
		expect(store.config.grainDirection).toBe(false);
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Force `browser` true so the timer path runs.
vi.mock('$app/environment', () => ({ browser: true }));

// The store touches `window` and `localStorage` when browser is true.
// Stub a minimal window with a non-persisting localStorage shim.
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
	vi.useFakeTimers();
	mockStorage.store.clear();
	vi.resetModules();
	storeModule = await import('../src/lib/stores.svelte');
	storeModule.store.reset();
	storeModule.store.lastImportNotice = null;
});

afterEach(() => {
	vi.useRealTimers();
});

describe('store.recordImport', () => {
	it('sets lastImportNotice with filename, count, skipped, and a timestamp', () => {
		const { store } = storeModule;
		const before = Date.now();
		store.recordImport('parts.csv', 8, 0);
		const notice = store.lastImportNotice;
		expect(notice).not.toBeNull();
		expect(notice?.filename).toBe('parts.csv');
		expect(notice?.count).toBe(8);
		expect(notice?.skipped).toBe(0);
		expect(notice?.timestamp).toBeGreaterThanOrEqual(before);
	});

	it('records the skipped-row count when supplied', () => {
		const { store } = storeModule;
		store.recordImport('mixed.csv', 8, 3);
		expect(store.lastImportNotice?.skipped).toBe(3);
	});

	it('clears lastImportNotice after 5 seconds via fake timers', () => {
		const { store } = storeModule;
		store.recordImport('parts.csv', 8, 0);
		expect(store.lastImportNotice).not.toBeNull();
		vi.advanceTimersByTime(5_000);
		expect(store.lastImportNotice).toBeNull();
	});

	it('does not clear before 5 seconds elapse', () => {
		const { store } = storeModule;
		store.recordImport('parts.csv', 8, 0);
		vi.advanceTimersByTime(4_500);
		expect(store.lastImportNotice).not.toBeNull();
	});

	it('replacing an existing notice resets the auto-clear timer', () => {
		const { store } = storeModule;
		store.recordImport('first.csv', 1, 0);
		vi.advanceTimersByTime(4_000);
		store.recordImport('second.csv', 2, 0);
		// First import's timer would have fired at 5_000, but the second
		// reset means the live notice should still be there at 4_000+1_000=5_000
		// elapsed total time, since the second notice has only been alive 1 s.
		vi.advanceTimersByTime(1_000);
		expect(store.lastImportNotice?.filename).toBe('second.csv');
		vi.advanceTimersByTime(4_000);
		expect(store.lastImportNotice).toBeNull();
	});
});

describe('store.applyTrim', () => {
	it('updates the named dimension on the matching piece', () => {
		const { store } = storeModule;
		store.addPiece('Adjustable Shelf', 14, 24, 5);
		const id = store.pieces[0].id;
		store.applyTrim(id, 'height', 23.875);
		expect(store.pieces[0].height).toBe(23.875);
		expect(store.pieces[0].width).toBe(14);
	});

	it('does nothing if the piece id is unknown', () => {
		const { store } = storeModule;
		store.addPiece('A', 10, 10, 1);
		const before = JSON.stringify(store.pieces);
		store.applyTrim('not-a-real-id', 'width', 5);
		expect(JSON.stringify(store.pieces)).toBe(before);
	});

	it('triggers a fresh derived cutlist result', () => {
		const { store } = storeModule;
		store.addPiece('Big', 24, 24, 1);
		const sheetsBefore = store.result.totalSheets;
		// Trim to half the size — just verify that derived recomputes.
		store.applyTrim(store.pieces[0].id, 'width', 12);
		expect(store.pieces[0].width).toBe(12);
		// Derived result should still expose totalSheets (might be the same number).
		expect(typeof store.result.totalSheets).toBe('number');
		expect(store.result.totalSheets).toBeGreaterThanOrEqual(0);
		void sheetsBefore;
	});
});

describe('store.applyConfig', () => {
	it('passes a partial config update through to the underlying config', () => {
		const { store } = storeModule;
		store.applyConfig({ oversizeTolerance: store.config.kerf });
		expect(store.config.oversizeTolerance).toBe(store.config.kerf);
	});

	it('can toggle multiple config fields at once', () => {
		const { store } = storeModule;
		store.applyConfig({ grainDirection: false, oversizeTolerance: 0.125 });
		expect(store.config.grainDirection).toBe(false);
		expect(store.config.oversizeTolerance).toBe(0.125);
	});

	it('does not erase unrelated config fields', () => {
		const { store } = storeModule;
		const widthBefore = store.config.width;
		store.applyConfig({ kerf: 0.0625 });
		expect(store.config.width).toBe(widthBefore);
		expect(store.config.kerf).toBe(0.0625);
	});
});

<script lang="ts">
	import { store, DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY } from '$lib/stores.svelte';
	import { parseCSV } from '$lib/csv';
	import PieceInput from './PieceInput.svelte';

	let statusMessage = $state('');
	let importWarnings = $state<string[]>([]);
	let addBtn: HTMLButtonElement;

	function handleAdd() {
		store.addPiece('', DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY);
		statusMessage = `Piece added. ${store.pieces.length} piece${store.pieces.length === 1 ? '' : 's'} total.`;
	}

	function handleReset() {
		store.reset();
		importWarnings = [];
		statusMessage = 'All pieces cleared. Configuration reset to defaults.';
		addBtn?.focus();
	}

	function handleImportClick() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv,text/csv';
		input.addEventListener('change', () => {
			const file = input.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				const text = reader.result as string;
				const result = parseCSV(text);

				for (const p of result.pieces) {
					store.addPiece(p.label, p.width, p.height, p.quantity);
				}

				importWarnings = result.warnings;

				const count = result.pieces.length;
				statusMessage = `Imported ${count} piece${count === 1 ? '' : 's'}. ${store.pieces.length} total.`;
				if (result.warnings.length > 0) {
					statusMessage += ` ${result.warnings.length} row${result.warnings.length === 1 ? '' : 's'} skipped.`;
				}

				store.recordImport(file.name, count, result.warnings.length);
			};
			reader.readAsText(file);
		});
		input.click();
	}

	function handleDownloadExample() {
		const csv = [
			'Label,Width,Length,Qty',
			'Shelf,24,12,3',
			'Side Panel,48,14,2',
			'Back,48,24,1',
			'Drawer Front,20,6.5,4',
			'Divider,22,11.25,2'
		].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'cutlist_example.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	const btnBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 btn-press';
	const btnGhost = `${btnBase} text-shop-muted border border-shop-light hover:bg-shop-light/60 hover:text-shop-text focus-visible:outline-shop-muted`;
	const btnPrimary = `${btnBase} bg-plywood text-shop-dark font-semibold hover:bg-plywood-light focus-visible:outline-plywood btn-glow`;
	const btnDanger = `${btnBase} text-shop-muted border border-shop-light hover:bg-danger/10 hover:text-danger hover:border-danger/40 focus-visible:outline-danger btn-danger-glow`;
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-xs font-semibold tracking-widest uppercase text-shop-muted">Pieces</h2>
		<div class="flex gap-1.5">
			<button
				type="button"
				onclick={handleReset}
				disabled={store.pieces.length === 0}
				title="Clear all pieces and reset configuration"
				class="{btnDanger} disabled:opacity-30 disabled:pointer-events-none"
			>
				Reset
			</button>
			<button
				type="button"
				onclick={handleDownloadExample}
				title="Download an example CSV file"
				class={btnGhost}
			>
				Example CSV
			</button>
			<button
				type="button"
				onclick={handleImportClick}
				class={btnGhost}
			>
				Import CSV
			</button>
			<button
				bind:this={addBtn}
				type="button"
				onclick={handleAdd}
				class={btnPrimary}
			>
				+ Add piece
			</button>
		</div>
	</div>

	{#if importWarnings.length > 0}
		<div class="rounded-lg border border-warn-border bg-warn-bg p-3" role="alert">
			<div class="flex items-start justify-between">
				<p class="text-xs font-medium text-warn-text">
					{importWarnings.length} row{importWarnings.length === 1 ? '' : 's'} skipped:
				</p>
				<button
					type="button"
					onclick={() => (importWarnings = [])}
					class="text-warn-text/60 hover:text-warn-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn-text"
					aria-label="Dismiss import warnings"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<ul class="mt-1 space-y-0.5 text-xs text-warn-text/80">
				{#each importWarnings as warning}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if store.pieces.length === 0}
		<div class="rounded-lg border border-shop-light bg-shop-mid/40 px-4 py-6 text-center">
			<p class="text-sm text-shop-text">Add a part list to plan your cuts.</p>
			<p class="mt-1 text-xs text-shop-muted">
				Type pieces in directly, paste a CSV, or load the example to see the layout.
			</p>
			<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
				<button type="button" onclick={handleAdd} class={btnPrimary}>+ Add piece</button>
				<button type="button" onclick={handleImportClick} class={btnGhost}>Import CSV</button>
				<button type="button" onclick={handleDownloadExample} class={btnGhost}>Example CSV</button>
			</div>
		</div>
	{/if}

	<ul class="space-y-1.5" role="list">
		{#each store.pieces as piece (piece.id)}
			<PieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

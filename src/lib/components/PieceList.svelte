<script lang="ts">
	import { store, DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY } from '$lib/stores.svelte';
	import { parseCSV } from '$lib/csv';
	import PieceInput from './PieceInput.svelte';

	let statusMessage = $state('');
	let importWarnings = $state<string[]>([]);
	let addBtn: HTMLButtonElement;
	let fileInput: HTMLInputElement;

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
		fileInput?.click();
	}

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
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
		};
		reader.readAsText(file);
		input.value = '';
	}

	const btnBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
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
				class="{btnBase} text-shop-muted border border-shop-light hover:bg-shop-light hover:text-shop-text focus-visible:outline-shop-muted disabled:opacity-30 disabled:pointer-events-none"
			>
				Reset
			</button>
			<button
				type="button"
				onclick={handleImportClick}
				class="{btnBase} text-shop-muted border border-shop-light hover:bg-shop-light hover:text-shop-text focus-visible:outline-shop-muted"
			>
				Import CSV
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept=".csv,text/csv"
				onchange={handleFileChange}
				class="hidden"
			/>
			<button
				bind:this={addBtn}
				type="button"
				onclick={handleAdd}
				class="{btnBase} bg-plywood text-shop-dark hover:bg-plywood-light focus-visible:outline-plywood"
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
		<div class="rounded-lg border border-dashed border-shop-light/60 py-8 text-center">
			<p class="text-sm text-shop-muted">No pieces yet</p>
			<p class="text-xs text-shop-muted/60 mt-1">Add pieces manually or import from CSV</p>
		</div>
	{/if}

	<ul class="space-y-1.5" role="list">
		{#each store.pieces as piece (piece.id)}
			<PieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

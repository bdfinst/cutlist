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

		// Reset input so the same file can be re-imported
		input.value = '';
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Pieces</h2>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={handleReset}
				disabled={store.pieces.length === 0}
				title="Clears all pieces and resets configuration to defaults"
				class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Reset
			</button>
			<button
				type="button"
				onclick={handleImportClick}
				class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
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
				class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
			>
				Add Piece
			</button>
		</div>
	</div>

	{#if importWarnings.length > 0}
		<div class="rounded border border-amber-300 bg-amber-50 p-3" role="alert">
			<div class="flex items-start justify-between">
				<p class="text-sm font-medium text-amber-800">
					{importWarnings.length} row{importWarnings.length === 1 ? '' : 's'} skipped during import:
				</p>
				<button
					type="button"
					onclick={() => (importWarnings = [])}
					class="text-sm text-amber-600 hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					aria-label="Dismiss import warnings"
				>
					&times;
				</button>
			</div>
			<ul class="mt-1 list-inside list-disc text-sm text-amber-700">
				{#each importWarnings as warning}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if store.pieces.length === 0}
		<p class="text-sm text-gray-500">No pieces added yet. Click "Add Piece" or "Import CSV" to get started.</p>
	{/if}

	<ul class="space-y-2" role="list">
		{#each store.pieces as piece (piece.id)}
			<PieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

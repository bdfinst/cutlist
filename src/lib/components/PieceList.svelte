<script lang="ts">
	import { store, DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY } from '$lib/stores.svelte';
	import PieceInput from './PieceInput.svelte';

	let statusMessage = $state('');
	let addBtn: HTMLButtonElement;

	function handleAdd() {
		store.addPiece('', DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY);
		statusMessage = `Piece added. ${store.pieces.length} piece${store.pieces.length === 1 ? '' : 's'} total.`;
	}

	function handleReset() {
		store.reset();
		statusMessage = 'All pieces cleared. Configuration reset to defaults.';
		addBtn?.focus();
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
				bind:this={addBtn}
				type="button"
				onclick={handleAdd}
				class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
			>
				Add Piece
			</button>
		</div>
	</div>

	{#if store.pieces.length === 0}
		<p class="text-sm text-gray-500">No pieces added yet. Click "Add Piece" to get started.</p>
	{/if}

	<ul class="space-y-2" role="list">
		{#each store.pieces as piece (piece.id)}
			<PieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

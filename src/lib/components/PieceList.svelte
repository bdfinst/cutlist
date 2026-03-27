<script lang="ts">
	import { pieces, addPiece, DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY } from '$lib/stores.svelte';
	import PieceInput from './PieceInput.svelte';

	let statusMessage = $state('');

	function handleAdd() {
		addPiece('', DEFAULT_PIECE_WIDTH, DEFAULT_PIECE_HEIGHT, DEFAULT_PIECE_QUANTITY);
		statusMessage = `Piece added. ${pieces.length} piece${pieces.length === 1 ? '' : 's'} total.`;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Pieces</h2>
		<button
			onclick={handleAdd}
			class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
		>
			Add Piece
		</button>
	</div>

	{#if pieces.length === 0}
		<p class="text-sm text-gray-500">No pieces added yet. Click "Add Piece" to get started.</p>
	{/if}

	<ul class="space-y-2" role="list">
		{#each pieces as piece (piece.id)}
			<PieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

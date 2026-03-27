<script lang="ts">
	import type { PieceDefinition } from '$lib/types';
	import { updatePiece, removePiece } from '$lib/stores.svelte';

	const DIMENSION_STEP = 0.125;

	let { piece }: { piece: PieceDefinition } = $props();
</script>

<li class="flex items-center gap-2 rounded border border-gray-200 bg-white p-2">
	<div
		class="h-4 w-4 shrink-0 rounded"
		style:background-color={piece.color}
		role="img"
		aria-label="Color indicator for {piece.label || 'piece'}"
	></div>

	<label class="sr-only" for="piece-label-{piece.id}">Piece name</label>
	<input
		id="piece-label-{piece.id}"
		type="text"
		value={piece.label}
		oninput={(e) => updatePiece(piece.id, { label: e.currentTarget.value })}
		placeholder="Piece name"
		class="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
	/>

	<label class="flex items-center gap-1 text-sm text-gray-600" for="piece-width-{piece.id}">
		<span aria-hidden="true">W</span>
		<span class="sr-only">Width (in)</span>
		<input
			id="piece-width-{piece.id}"
			type="number"
			value={piece.width}
			oninput={(e) => updatePiece(piece.id, { width: parseFloat(e.currentTarget.value) || 0 })}
			step={DIMENSION_STEP}
			min="0"
			class="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
		/>
	</label>

	<label class="flex items-center gap-1 text-sm text-gray-600" for="piece-height-{piece.id}">
		<span aria-hidden="true">H</span>
		<span class="sr-only">Height (in)</span>
		<input
			id="piece-height-{piece.id}"
			type="number"
			value={piece.height}
			oninput={(e) => updatePiece(piece.id, { height: parseFloat(e.currentTarget.value) || 0 })}
			step={DIMENSION_STEP}
			min="0"
			class="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
		/>
	</label>

	<label class="flex items-center gap-1 text-sm text-gray-600" for="piece-qty-{piece.id}">
		<span aria-hidden="true">Qty</span>
		<span class="sr-only">Quantity</span>
		<input
			id="piece-qty-{piece.id}"
			type="number"
			value={piece.quantity}
			oninput={(e) => updatePiece(piece.id, { quantity: parseInt(e.currentTarget.value) || 1 })}
			min="1"
			class="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
		/>
	</label>

	<button
		onclick={() => removePiece(piece.id)}
		class="ml-auto shrink-0 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
		aria-label="Remove {piece.label || 'piece'}"
	>
		&times;
	</button>
</li>

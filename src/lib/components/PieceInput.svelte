<script lang="ts">
	import type { PieceDefinition } from '$lib/types';
	import { updatePiece, removePiece } from '$lib/stores.svelte';

	const DIMENSION_STEP = 0.125;

	let { piece }: { piece: PieceDefinition } = $props();

	let widthInvalid = $derived(isNaN(piece.width) || piece.width <= 0);
	let heightInvalid = $derived(isNaN(piece.height) || piece.height <= 0);
	let qtyInvalid = $derived(isNaN(piece.quantity) || piece.quantity <= 0);

	let errorId = $derived(`piece-${piece.id}-errors`);
	let hasErrors = $derived(widthInvalid || heightInvalid || qtyInvalid);
</script>

<li class="space-y-1 rounded border border-gray-200 bg-white p-2">
	<div class="flex items-center gap-2">
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
				min="0.125"
				class="w-20 rounded border px-2 py-1 text-sm {widthInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
				aria-invalid={widthInvalid}
				aria-describedby={hasErrors ? errorId : undefined}
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
				min="0.125"
				class="w-20 rounded border px-2 py-1 text-sm {heightInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
				aria-invalid={heightInvalid}
				aria-describedby={hasErrors ? errorId : undefined}
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
				class="w-16 rounded border px-2 py-1 text-sm {qtyInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
				aria-invalid={qtyInvalid}
				aria-describedby={hasErrors ? errorId : undefined}
			/>
		</label>

		<button
			onclick={() => removePiece(piece.id)}
			class="ml-auto shrink-0 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
			aria-label="Remove {piece.label || 'piece'}"
		>
			&times;
		</button>
	</div>

	{#if hasErrors}
		<p id={errorId} class="text-xs text-red-600" role="alert">
			{#if widthInvalid}Width must be greater than 0. {/if}
			{#if heightInvalid}Height must be greater than 0. {/if}
			{#if qtyInvalid}Quantity must be at least 1.{/if}
		</p>
	{/if}
</li>

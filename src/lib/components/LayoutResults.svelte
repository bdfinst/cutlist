<script lang="ts">
	import { store } from '$lib/stores.svelte';
	import { generatePDF } from '$lib/pdf';
	import LayoutPreview from './LayoutPreview.svelte';

	let resultSummary = $derived(
		store.result.totalSheets > 0
			? `Layout updated: ${store.result.totalSheets} sheet${store.result.totalSheets === 1 ? '' : 's'}, ${store.result.totalWastePercent.toFixed(1)}% waste.`
			: ''
	);
</script>

{#if store.pieces.length === 0}
	<p class="text-sm text-gray-500">Add pieces to see the cutting layout.</p>
{:else if store.result.totalSheets === 0 && store.result.unfitPieces.length === 0}
	<p class="text-sm text-gray-500">No valid pieces to lay out.</p>
{:else}
	<div class="space-y-4">
		<div class="flex items-baseline justify-between">
			<h2 class="text-lg font-semibold">Layout</h2>
			<span class="text-sm text-gray-500">
				{store.result.totalSheets} sheet{store.result.totalSheets === 1 ? '' : 's'}<span aria-hidden="true"> · </span><span class="sr-only">, </span>{store.result.totalWastePercent.toFixed(1)}% total waste
			</span>
		</div>

		{#if store.result.unfitPieces.length > 0}
			<div class="rounded border border-amber-300 bg-amber-50 p-3" role="alert">
				<p class="text-sm font-medium text-amber-800">
					{store.result.unfitPieces.length} piece{store.result.unfitPieces.length === 1 ? '' : 's'} could not fit:
				</p>
				<ul class="mt-1 list-inside list-disc text-sm text-amber-700">
					{#each store.result.unfitPieces as piece}
						<li>{piece.label || 'Unnamed'} ({piece.width} × {piece.height})</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#each store.result.sheets as sheet (sheet.sheetIndex)}
			<LayoutPreview {sheet} config={store.config} />
		{/each}

		<button
			type="button"
			onclick={() => generatePDF(store.result, store.config, store.pieces)}
			class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
		>
			Download PDF
		</button>
	</div>
{/if}

<div class="sr-only" aria-live="polite" aria-atomic="true">{resultSummary}</div>

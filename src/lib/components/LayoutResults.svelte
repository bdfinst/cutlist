<script lang="ts">
	import { cutlistResult, config, pieces } from '$lib/stores.svelte';
	import { generatePDF } from '$lib/pdf';
	import LayoutPreview from './LayoutPreview.svelte';

	let resultSummary = $derived(
		cutlistResult.totalSheets > 0
			? `Layout updated: ${cutlistResult.totalSheets} sheet${cutlistResult.totalSheets === 1 ? '' : 's'}, ${cutlistResult.totalWastePercent.toFixed(1)}% waste.`
			: ''
	);
</script>

{#if pieces.length === 0}
	<p class="text-sm text-gray-500">Add pieces to see the cutting layout.</p>
{:else if cutlistResult.totalSheets === 0 && cutlistResult.unfitPieces.length === 0}
	<p class="text-sm text-gray-500">No valid pieces to lay out.</p>
{:else}
	<div class="space-y-4">
		<div class="flex items-baseline justify-between">
			<h2 class="text-lg font-semibold">Layout</h2>
			<span class="text-sm text-gray-500">
				{cutlistResult.totalSheets} sheet{cutlistResult.totalSheets === 1 ? '' : 's'}<span aria-hidden="true"> · </span><span class="sr-only">, </span>{cutlistResult.totalWastePercent.toFixed(1)}% total waste
			</span>
		</div>

		{#if cutlistResult.unfitPieces.length > 0}
			<div class="rounded border border-amber-300 bg-amber-50 p-3" role="alert">
				<p class="text-sm font-medium text-amber-800">
					{cutlistResult.unfitPieces.length} piece{cutlistResult.unfitPieces.length === 1 ? '' : 's'} could not fit:
				</p>
				<ul class="mt-1 list-inside list-disc text-sm text-amber-700">
					{#each cutlistResult.unfitPieces as piece}
						<li>{piece.label || 'Unnamed'} ({piece.width} × {piece.height})</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#each cutlistResult.sheets as sheet (sheet.sheetIndex)}
			<LayoutPreview {sheet} {config} />
		{/each}

		<button
			type="button"
			onclick={() => generatePDF(cutlistResult, config, pieces)}
			class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
		>
			Download PDF
		</button>
	</div>
{/if}

<div class="sr-only" aria-live="polite" aria-atomic="true">{resultSummary}</div>

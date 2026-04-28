<script lang="ts">
	import { store } from '$lib/stores.svelte';
	import { generatePDF } from '$lib/pdf';
	import { svgElementToPng } from '$lib/svg-to-image';
	import LayoutPreview from './LayoutPreview.svelte';
	import StickyDownloadButton from './StickyDownloadButton.svelte';
	import SuggestionsPanel from './SuggestionsPanel.svelte';

	const PDF_SHEET_RASTER_WIDTH = 900;

	let isGeneratingPdf = $state(false);

	let resultSummary = $derived(
		store.result.totalSheets > 0
			? `Layout updated: ${store.result.totalSheets} sheet${store.result.totalSheets === 1 ? '' : 's'}, ${store.result.totalWastePercent.toFixed(1)}% waste.`
			: ''
	);

	let wasteColor = $derived(
		store.result.totalWastePercent > 50 ? 'text-kerf' :
		store.result.totalWastePercent > 30 ? 'text-plywood' :
		'text-success'
	);

	async function captureSheetImages(): Promise<string[]> {
		const containers = document.querySelectorAll<HTMLElement>('[data-sheet-index]');
		const ordered = Array.from(containers).sort(
			(a, b) =>
				Number(a.dataset.sheetIndex ?? 0) - Number(b.dataset.sheetIndex ?? 0)
		);
		const images: string[] = [];
		for (const container of ordered) {
			const svg = container.querySelector<SVGSVGElement>('svg');
			if (!svg) continue;
			images.push(await svgElementToPng(svg, PDF_SHEET_RASTER_WIDTH));
		}
		return images;
	}

	async function handleDownloadPdf() {
		if (isGeneratingPdf) return;
		isGeneratingPdf = true;
		try {
			const sheetImages = await captureSheetImages();
			generatePDF(
				store.result,
				store.lumberResult,
				store.lumberTypes,
				store.config,
				store.pieces,
				store.lumberPieces,
				sheetImages
			);
		} finally {
			isGeneratingPdf = false;
		}
	}
</script>

{#if store.pieces.length === 0}
	<div class="flex items-center justify-center rounded-lg border border-dashed border-shop-light/40 py-20">
		<div class="text-center">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="mx-auto text-shop-light mb-3">
				<rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="1"/>
				<line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
				<line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
			</svg>
			<p class="text-sm text-shop-muted">Add pieces to see the layout</p>
		</div>
	</div>
{:else if store.result.totalSheets === 0 && store.result.unfitPieces.length === 0}
	<p class="text-sm text-shop-muted">No valid pieces to lay out.</p>
{:else}
	<div class="space-y-5">
		<!-- Summary bar -->
		<div class="flex items-center justify-between rounded-lg bg-shop-mid border border-shop-light/60 px-4 py-3 max-w-2xl">
			<div class="flex items-center gap-4">
				<div>
					<div class="text-2xl font-bold text-white font-mono">{store.result.totalSheets}</div>
					<div class="text-xs text-shop-muted">sheet{store.result.totalSheets === 1 ? '' : 's'}</div>
				</div>
				<div class="h-8 w-px bg-shop-light"></div>
				<div>
					<div class="text-2xl font-bold font-mono {wasteColor}">{store.result.totalWastePercent.toFixed(1)}%</div>
					<div class="text-xs text-shop-muted">waste</div>
				</div>
			</div>
			<button
				type="button"
				data-download-pdf
				onclick={handleDownloadPdf}
				disabled={isGeneratingPdf}
				class="flex items-center gap-2 rounded-lg bg-plywood px-4 py-2 text-sm font-semibold text-shop-dark hover:bg-plywood-light transition-colors btn-press btn-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plywood disabled:opacity-50 disabled:cursor-wait"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
					<polyline points="7 10 12 15 17 10"/>
					<line x1="12" y1="15" x2="12" y2="3"/>
				</svg>
				{isGeneratingPdf ? 'Generating…' : 'Download PDF'}
			</button>
		</div>

		{#if store.result.unfitPieces.length > 0}
			<div class="rounded-lg border border-warn-border bg-warn-bg p-3" role="alert">
				<p class="text-xs font-medium text-warn-text">
					{store.result.unfitPieces.length} piece{store.result.unfitPieces.length === 1 ? '' : 's'} too large:
				</p>
				<ul class="mt-1 space-y-0.5 text-xs text-warn-text/80">
					{#each store.result.unfitPieces as piece}
						<li>{piece.label || 'Unnamed'} ({piece.width} &times; {piece.height})</li>
					{/each}
				</ul>
			</div>
		{/if}

		<SuggestionsPanel />

		<!-- Sheet layouts -->
		<div class="space-y-6">
			{#each store.result.sheets as sheet (sheet.sheetIndex)}
				<LayoutPreview {sheet} config={store.config} />
			{/each}
		</div>
	</div>

	<StickyDownloadButton
		anchorSelector="[data-download-pdf]"
		onDownload={handleDownloadPdf}
		busy={isGeneratingPdf}
	/>
{/if}

<div class="sr-only" aria-live="polite" aria-atomic="true">{resultSummary}</div>

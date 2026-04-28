<script lang="ts">
	import PieceList from '$lib/components/PieceList.svelte';
	import SheetConfig from '$lib/components/SheetConfig.svelte';
	import LayoutResults from '$lib/components/LayoutResults.svelte';
	import LumberTypeList from '$lib/components/LumberTypeList.svelte';
	import LumberPieceList from '$lib/components/LumberPieceList.svelte';
	import LumberResults from '$lib/components/LumberResults.svelte';
	import { store } from '$lib/stores.svelte';
</script>

<svelte:head>
	<title>Cutlist — Free Plywood &amp; Lumber Cut List Optimizer for Woodworkers</title>
	<meta
		name="description"
		content="Free browser-based cut list optimizer for woodworkers. Plan plywood sheet layouts and dimensional lumber cuts with kerf-aware bin packing, grain direction control, CSV import, and printable PDF cut diagrams. No sign-up, no install."
	/>
	<meta
		name="keywords"
		content="cut list optimizer, cutlist calculator, plywood cutting layout, panel saw layout, sheet goods optimizer, lumber cutting calculator, woodworking calculator, kerf calculator, free cut list software, online cutlist generator"
	/>
	<meta name="robots" content="index, follow" />
	<meta name="theme-color" content="#1a1a1f" />
	<meta name="author" content="Bryan Finster" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Cutlist — Free Plywood &amp; Lumber Cut List Optimizer" />
	<meta
		property="og:description"
		content="Free browser-based cut list optimizer for woodworkers. Kerf-aware bin packing with PDF export."
	/>
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Cutlist — Free Cut List Optimizer for Woodworkers" />
	<meta
		name="twitter:description"
		content="Plan plywood and lumber cuts with kerf-aware bin packing, CSV import, and PDF export."
	/>

	<!-- Structured data: WebApplication schema for rich results -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			"name": "Cutlist",
			"alternateName": "Cutlist Calculator",
			"description": "Free browser-based cut list optimizer for woodworkers. Plan plywood sheet layouts and dimensional lumber cuts with kerf-aware bin packing, grain direction control, CSV import, and printable PDF cut diagrams.",
			"applicationCategory": "UtilityApplication",
			"applicationSubCategory": "Woodworking",
			"operatingSystem": "Any",
			"browserRequirements": "Requires JavaScript. Requires a modern web browser.",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "USD"
			},
			"featureList": [
				"Plywood and sheet goods cutting layout",
				"Dimensional lumber 1D bin packing",
				"Kerf-aware cut planning",
				"Grain direction control",
				"CSV import for batch part lists",
				"PDF export with printable cut diagrams",
				"Waste reduction suggestions",
				"Local-only (no sign-up, no upload)"
			]
		}
	</script>
</svelte:head>

<div class="min-h-screen">
	<!-- Header -->
	<header class="border-b border-shop-light bg-shop-mid/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2">
					<img
						src="/favicon.svg"
						width="28"
						height="28"
						alt=""
						class="block"
					/>
					<h1 class="text-lg font-semibold tracking-tight text-white">Cutlist</h1>
				</div>
				<span class="text-xs text-shop-muted font-mono hidden sm:block">cut optimizer</span>
			</div>

			{#if store.pieces.length > 0 || store.lumberPieces.length > 0}
				<div class="flex items-center gap-4 text-xs font-mono text-shop-muted">
					{#if store.pieces.length > 0}
						<span>{store.pieces.reduce((s, p) => s + p.quantity, 0)} pieces</span>
						<span aria-hidden="true" class="text-shop-light">|</span>
						<span>{store.result.totalSheets} sheet{store.result.totalSheets === 1 ? '' : 's'}</span>
						<span aria-hidden="true" class="text-shop-light">|</span>
						<span class={store.result.totalWastePercent > 40 ? 'text-kerf' : 'text-success'}>
							{store.result.totalWastePercent.toFixed(1)}% waste
						</span>
					{/if}
					{#if store.pieces.length > 0 && store.lumberPieces.length > 0}
						<span aria-hidden="true" class="text-shop-light">|</span>
					{/if}
					{#if store.lumberPieces.length > 0}
						<span>{store.lumberResult.totalBoards} board{store.lumberResult.totalBoards === 1 ? '' : 's'}</span>
						<span aria-hidden="true" class="text-shop-light">|</span>
						<span class={store.lumberResult.totalWastePercent > 40 ? 'text-kerf' : 'text-success'}>
							{store.lumberResult.totalWastePercent.toFixed(1)}% lumber waste
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Left panel: inputs -->
			<section aria-label="Piece configuration" class="w-full space-y-5 lg:w-[28rem] lg:shrink-0">
				<SheetConfig />
				<div class="border-t border-shop-light"></div>
				<PieceList />
				<div class="border-t border-shop-light"></div>
				<LumberTypeList />
				<div class="border-t border-shop-light"></div>
				<LumberPieceList />
			</section>

			<!-- Right panel: results -->
			<section aria-label="Layout results" class="min-w-0 flex-1 space-y-6">
				<LayoutResults />
				<LumberResults />
			</section>
		</div>

		<!-- About / SEO descriptive content -->
		<section
			aria-label="About Cutlist"
			class="mt-12 max-w-3xl text-sm leading-relaxed text-shop-muted space-y-4"
		>
			<h2 class="text-base font-semibold text-shop-text">
				Free cut list optimizer for woodworkers
			</h2>
			<p>
				Cutlist is a free, browser-based cut list calculator that plans efficient
				layouts for plywood, MDF, and other sheet goods, plus dimensional lumber
				like 1&times;4 and 2&times;4 boards. It runs entirely in your browser —
				there's no sign-up, nothing to install, and your part list never leaves
				your device.
			</p>
			<p>
				The optimizer uses kerf-aware guillotine bin packing for sheet goods, so
				every cut goes edge-to-edge the way a panel saw or table saw actually
				works. You can lock the grain direction for face-grain pieces, set the
				blade kerf, and toggle tight pairings for cuts that share a kerf. For
				boards, it does 1D bin packing across multiple lumber types.
			</p>
			<p>
				Import a CSV part list, paste in pieces by hand, or load the example
				file. When you're done, download a printable PDF cut diagram with the
				layout for each sheet, every lumber board, and a complete parts list to
				take to the shop.
			</p>
			<p>
				Built for cabinet shops, hobbyist woodworkers, closet builders, and
				anyone who needs to make the most of a 4&times;8 sheet of plywood
				without paying for cut list software.
			</p>
		</section>
	</main>
</div>

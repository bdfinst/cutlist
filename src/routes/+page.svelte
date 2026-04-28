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
	<title>Cutlist Calculator</title>
</svelte:head>

<div class="min-h-screen">
	<!-- Header -->
	<header class="border-b border-shop-light bg-shop-mid/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1.5">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-plywood">
						<rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
						<line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>
						<line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>
						<rect x="3" y="3" width="8" height="6" rx="0.5" fill="currentColor" opacity="0.3"/>
						<rect x="13" y="3" width="8" height="6" rx="0.5" fill="currentColor" opacity="0.2"/>
						<rect x="3" y="11" width="8" height="10" rx="0.5" fill="currentColor" opacity="0.15"/>
					</svg>
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
	</main>
</div>

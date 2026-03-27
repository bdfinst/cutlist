<script lang="ts">
	import PieceList from '$lib/components/PieceList.svelte';
	import SheetConfig from '$lib/components/SheetConfig.svelte';
	import LayoutResults from '$lib/components/LayoutResults.svelte';
</script>

<svelte:head>
	<title>Cutlist Calculator</title>
</svelte:head>

<main class="mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-2xl font-bold">Cutlist Calculator</h1>

	<div class="grid gap-6 md:grid-cols-2">
		<section aria-label="Piece configuration" class="space-y-6">
			<SheetConfig />
			<PieceList />
		</section>

		<section aria-label="Layout results">
			<LayoutResults />
		</section>
	</div>
</main>

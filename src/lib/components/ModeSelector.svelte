<script lang="ts">
	import { store } from '$lib/stores.svelte';
	import type { CutlistMode } from '$lib/types';

	const options: { value: CutlistMode; label: string }[] = [
		{ value: 'plywood', label: 'Plywood' },
		{ value: 'lumber', label: 'Lumber' },
		{ value: 'both', label: 'Both' }
	];

	const btnBase =
		'rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 btn-press';
	const btnActive = `${btnBase} bg-plywood text-shop-dark font-semibold focus-visible:outline-plywood`;
	const btnInactive = `${btnBase} text-shop-muted border border-shop-light hover:bg-shop-light/60 hover:text-shop-text focus-visible:outline-shop-muted`;
</script>

<div role="group" aria-label="Cutlist mode" class="flex flex-wrap items-center gap-1.5">
	<span class="mr-1 text-xs font-semibold uppercase tracking-widest text-shop-muted">Mode</span>
	{#each options as option}
		<button
			type="button"
			onclick={() => store.setMode(option.value)}
			aria-pressed={store.mode === option.value}
			class={store.mode === option.value ? btnActive : btnInactive}
		>
			{option.label}
		</button>
	{/each}
</div>

<script lang="ts">
	import { store } from '$lib/stores.svelte';

	const KERF_STEP = 0.0625;

	let kerfInvalid = $derived(isNaN(store.config.kerf) || store.config.kerf < 0);

	const inputBase =
		'w-full rounded bg-shop-dark border px-2.5 py-1.5 text-sm font-mono text-shop-text placeholder:text-shop-muted transition-colors focus:outline-none focus:ring-1';
	const inputValid = 'border-shop-light focus:border-plywood focus:ring-plywood/30';
	const inputError = 'border-danger/50 bg-danger/5 focus:border-danger focus:ring-danger/30';
</script>

<div class="space-y-1">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-shop-muted">Saw</h2>
	<label class="block max-w-[12rem] space-y-1">
		<span class="text-xs text-shop-muted">Kerf</span>
		<div class="relative">
			<input
				type="number"
				value={store.config.kerf}
				oninput={(e) => store.updateConfig({ kerf: parseFloat(e.currentTarget.value) || 0 })}
				step={KERF_STEP}
				min="0"
				class="{inputBase} {kerfInvalid ? inputError : inputValid} pr-8"
				aria-invalid={kerfInvalid}
				aria-describedby={kerfInvalid ? 'kerf-only-error' : undefined}
			/>
			<span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted">
				in
			</span>
		</div>
		{#if kerfInvalid}
			<p id="kerf-only-error" class="text-xs text-danger" role="alert">Cannot be negative</p>
		{/if}
	</label>
</div>

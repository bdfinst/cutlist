<script lang="ts">
	import { store } from '$lib/stores.svelte';

	const DIMENSION_STEP = 1;
	const KERF_STEP = 0.0625;

	let widthInvalid = $derived(isNaN(store.config.width) || store.config.width <= 0);
	let heightInvalid = $derived(isNaN(store.config.height) || store.config.height <= 0);
	let kerfInvalid = $derived(isNaN(store.config.kerf) || store.config.kerf < 0);

	const inputBase = 'w-full rounded bg-shop-dark border px-2.5 py-1.5 text-sm font-mono text-shop-text placeholder:text-shop-muted transition-colors focus:outline-none focus:ring-1';
	const inputValid = 'border-shop-light focus:border-plywood focus:ring-plywood/30';
	const inputError = 'border-danger/50 bg-danger/5 focus:border-danger focus:ring-danger/30';
</script>

<div class="space-y-3">
	<h2 class="text-xs font-semibold tracking-widest uppercase text-shop-muted">Sheet</h2>

	<div class="grid grid-cols-2 gap-2">
		<label class="space-y-1">
			<span class="text-xs text-shop-muted">Width</span>
			<div class="relative">
				<input
					type="number"
					value={store.config.width}
					oninput={(e) => store.updateConfig({ width: parseFloat(e.currentTarget.value) || 0 })}
					step={DIMENSION_STEP}
					min="1"
					class="{inputBase} {widthInvalid ? inputError : inputValid} pr-8"
					aria-invalid={widthInvalid}
					aria-describedby={widthInvalid ? 'config-width-error' : undefined}
				/>
				<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
			</div>
			{#if widthInvalid}
				<p id="config-width-error" class="text-xs text-danger" role="alert">Must be &gt; 0</p>
			{/if}
		</label>

		<label class="space-y-1">
			<span class="text-xs text-shop-muted">Length</span>
			<div class="relative">
				<input
					type="number"
					value={store.config.height}
					oninput={(e) => store.updateConfig({ height: parseFloat(e.currentTarget.value) || 0 })}
					step={DIMENSION_STEP}
					min="1"
					class="{inputBase} {heightInvalid ? inputError : inputValid} pr-8"
					aria-invalid={heightInvalid}
					aria-describedby={heightInvalid ? 'config-height-error' : undefined}
				/>
				<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
			</div>
			{#if heightInvalid}
				<p id="config-height-error" class="text-xs text-danger" role="alert">Must be &gt; 0</p>
			{/if}
		</label>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<label class="space-y-1">
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
					aria-describedby={kerfInvalid ? 'config-kerf-error' : undefined}
				/>
				<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
			</div>
			{#if kerfInvalid}
				<p id="config-kerf-error" class="text-xs text-danger" role="alert">Cannot be negative</p>
			{/if}
		</label>

		<label class="flex items-end pb-1.5 gap-2 cursor-pointer">
			<input
				type="checkbox"
				checked={store.config.grainDirection}
				onchange={(e) => store.updateConfig({ grainDirection: e.currentTarget.checked })}
			/>
			<span class="text-xs text-shop-muted leading-tight">Lock grain<br/><span class="text-shop-text text-[10px]">(no rotation)</span></span>
		</label>
	</div>

	<label class="flex items-start gap-2 cursor-pointer pt-1">
		<input
			type="checkbox"
			class="mt-0.5"
			checked={(store.config.oversizeTolerance ?? 0) > 0}
			onchange={(e) =>
				store.updateConfig({
					oversizeTolerance: e.currentTarget.checked ? store.config.kerf : 0
				})}
		/>
		<span class="text-xs text-shop-muted leading-tight">
			Allow tight pairings
			<br />
			<span class="text-shop-text text-[10px]">
				accept cuts up to one kerf undersized to fit pieces that just barely overflow
			</span>
		</span>
	</label>
</div>

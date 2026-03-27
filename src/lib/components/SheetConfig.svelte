<script lang="ts">
	import { config, updateConfig } from '$lib/stores.svelte';

	const DIMENSION_STEP = 1;
	const KERF_STEP = 0.0625;

	let widthInvalid = $derived(isNaN(config.width) || config.width <= 0);
	let heightInvalid = $derived(isNaN(config.height) || config.height <= 0);
	let kerfInvalid = $derived(isNaN(config.kerf) || config.kerf < 0);
</script>

<div class="space-y-3">
	<h2 class="text-lg font-semibold">Sheet Configuration</h2>

	<div class="grid grid-cols-2 gap-3">
		<label class="space-y-1">
			<span class="text-sm text-gray-600">Width (in)</span>
			<input
				type="number"
				value={config.width}
				oninput={(e) => updateConfig({ width: parseFloat(e.currentTarget.value) || 0 })}
				step={DIMENSION_STEP}
				min="1"
				class="w-full rounded border px-2 py-1 text-sm {widthInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
				aria-invalid={widthInvalid}
				aria-describedby={widthInvalid ? 'config-width-error' : undefined}
			/>
			{#if widthInvalid}
				<p id="config-width-error" class="text-xs text-red-600" role="alert">Width must be greater than 0.</p>
			{/if}
		</label>

		<label class="space-y-1">
			<span class="text-sm text-gray-600">Height (in)</span>
			<input
				type="number"
				value={config.height}
				oninput={(e) => updateConfig({ height: parseFloat(e.currentTarget.value) || 0 })}
				step={DIMENSION_STEP}
				min="1"
				class="w-full rounded border px-2 py-1 text-sm {heightInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
				aria-invalid={heightInvalid}
				aria-describedby={heightInvalid ? 'config-height-error' : undefined}
			/>
			{#if heightInvalid}
				<p id="config-height-error" class="text-xs text-red-600" role="alert">Height must be greater than 0.</p>
			{/if}
		</label>
	</div>

	<label class="space-y-1">
		<span class="text-sm text-gray-600">Kerf (in)</span>
		<input
			type="number"
			value={config.kerf}
			oninput={(e) => updateConfig({ kerf: parseFloat(e.currentTarget.value) || 0 })}
			step={KERF_STEP}
			min="0"
			class="w-full rounded border px-2 py-1 text-sm {kerfInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}"
			aria-invalid={kerfInvalid}
			aria-describedby={kerfInvalid ? 'config-kerf-error' : undefined}
		/>
		{#if kerfInvalid}
			<p id="config-kerf-error" class="text-xs text-red-600" role="alert">Kerf cannot be negative.</p>
		{/if}
	</label>

	<label class="flex items-center gap-2">
		<input
			type="checkbox"
			checked={config.grainDirection}
			onchange={(e) => updateConfig({ grainDirection: e.currentTarget.checked })}
			class="rounded"
		/>
		<span class="text-sm text-gray-600">Grain direction (prevent rotation)</span>
	</label>
</div>

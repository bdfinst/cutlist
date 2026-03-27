<script lang="ts">
	import { config, updateConfig } from '$lib/stores.svelte';

	const DIMENSION_STEP = 1;
	const KERF_STEP = 0.0625;
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
				min="0"
				class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
			/>
		</label>

		<label class="space-y-1">
			<span class="text-sm text-gray-600">Height (in)</span>
			<input
				type="number"
				value={config.height}
				oninput={(e) => updateConfig({ height: parseFloat(e.currentTarget.value) || 0 })}
				step={DIMENSION_STEP}
				min="0"
				class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
			/>
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
			class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
		/>
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

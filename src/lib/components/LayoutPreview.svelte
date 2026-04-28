<script lang="ts">
	import type { SheetLayout, SheetConfig } from '$lib/types';
	import SheetSVG from './SheetSVG.svelte';

	let { sheet, config }: { sheet: SheetLayout; config: SheetConfig } = $props();

	let wasteColor = $derived(
		sheet.wastePercent > 50 ? 'text-kerf' :
		sheet.wastePercent > 30 ? 'text-plywood' :
		'text-success'
	);
</script>

<div class="space-y-2 max-w-md">
	<div class="flex items-baseline justify-between">
		<h3 class="text-sm font-semibold text-white">
			Sheet {sheet.sheetIndex + 1}
		</h3>
		<div class="flex items-center gap-3 text-xs font-mono">
			<span class="text-shop-muted">{sheet.pieces.length} pc</span>
			<span class={wasteColor}>{sheet.wastePercent.toFixed(1)}% waste</span>
		</div>
	</div>
	<SheetSVG pieces={sheet.pieces} {config} />
</div>

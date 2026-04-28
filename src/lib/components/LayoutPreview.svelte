<script lang="ts">
	import type { SheetLayout, SheetConfig } from '$lib/types';
	import SheetSVG from './SheetSVG.svelte';
	import { wasteClass } from '$lib/waste-color';

	let { sheet, config }: { sheet: SheetLayout; config: SheetConfig } = $props();

	let wasteColor = $derived(wasteClass(sheet.wastePercent));
</script>

<div class="space-y-2 max-w-md scroll-mt-20" data-sheet-index={sheet.sheetIndex}>
	<div class="sticky top-14 z-[5] flex items-baseline justify-between bg-shop-dark/90 py-1 backdrop-blur-sm motion-reduce:backdrop-blur-none">
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

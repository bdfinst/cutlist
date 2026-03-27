<script lang="ts">
	import type { SheetLayout, SheetConfig } from '$lib/types';
	import SheetSVG from './SheetSVG.svelte';

	let { sheet, config }: { sheet: SheetLayout; config: SheetConfig } = $props();
</script>

<div class="space-y-2">
	<div class="flex items-baseline justify-between">
		<h3 class="text-sm font-semibold">Sheet {sheet.sheetIndex + 1}</h3>
		<span class="text-sm text-gray-500">
			{sheet.pieces.length} piece{sheet.pieces.length === 1 ? '' : 's'}<span aria-hidden="true"> · </span><span class="sr-only">, </span>{sheet.wastePercent.toFixed(1)}% waste
		</span>
	</div>
	<SheetSVG pieces={sheet.pieces} {config} />
</div>

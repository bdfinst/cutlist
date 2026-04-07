<script lang="ts">
	import { store } from '$lib/stores.svelte';

	let totalBoards = $derived(store.lumberResult.totalBoards);

	let wasteColor = $derived(
		store.lumberResult.totalWastePercent > 50 ? 'text-kerf' :
		store.lumberResult.totalWastePercent > 30 ? 'text-plywood' :
		'text-success'
	);

	let boardsByType = $derived.by(() => {
		const groups = new Map<string, typeof store.lumberResult.boards>();
		for (const board of store.lumberResult.boards) {
			const existing = groups.get(board.lumberTypeId) ?? [];
			existing.push(board);
			groups.set(board.lumberTypeId, existing);
		}
		return groups;
	});

	function lumberTypeName(id: string): string {
		return store.lumberTypes.find((t) => t.id === id)?.name ?? 'Unknown';
	}

	function formatLength(inches: number): string {
		const feet = inches / 12;
		if (Number.isInteger(feet)) {
			return `${inches} in (${feet} ft)`;
		}
		return `${inches} in (${feet.toFixed(1)} ft)`;
	}

	function boardWasteColor(wastePercent: number): string {
		return wastePercent > 40 ? 'text-kerf' : 'text-success';
	}

	let resultSummary = $derived(
		totalBoards > 0
			? `Lumber plan updated: ${totalBoards} board${totalBoards === 1 ? '' : 's'}, ${store.lumberResult.totalWastePercent.toFixed(1)}% waste.`
			: ''
	);
</script>

{#if store.lumberPieces.length > 0}
	{#if totalBoards === 0 && store.lumberResult.unfitPieces.length === 0 && store.lumberResult.unassignedPieces.length === 0}
		<p class="text-sm text-shop-muted">No valid lumber pieces to lay out.</p>
	{:else}
		<div class="space-y-5">
			<!-- Summary bar -->
			{#if totalBoards > 0}
				<div class="flex items-center justify-between rounded-lg bg-shop-mid border border-shop-light/60 px-4 py-3">
					<div class="flex items-center gap-4">
						<div>
							<div class="text-2xl font-bold text-white font-mono">{totalBoards}</div>
							<div class="text-xs text-shop-muted">board{totalBoards === 1 ? '' : 's'}</div>
						</div>
						<div class="h-8 w-px bg-shop-light"></div>
						<div>
							<div class="text-2xl font-bold font-mono {wasteColor}">{store.lumberResult.totalWastePercent.toFixed(1)}%</div>
							<div class="text-xs text-shop-muted">waste</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Unassigned pieces warning -->
			{#if store.lumberResult.unassignedPieces.length > 0}
				<div class="rounded-lg border border-yellow-600/40 bg-yellow-900/20 p-3" role="alert">
					<p class="text-xs font-medium text-yellow-300">
						{store.lumberResult.unassignedPieces.length} piece{store.lumberResult.unassignedPieces.length === 1 ? '' : 's'} with no lumber type assigned:
					</p>
					<ul class="mt-1 space-y-0.5 text-xs text-yellow-300/80">
						{#each store.lumberResult.unassignedPieces as piece}
							<li>{piece.label || 'Unnamed'} ({formatLength(piece.length)})</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Unfit pieces warning -->
			{#if store.lumberResult.unfitPieces.length > 0}
				<div class="rounded-lg border border-warn-border bg-warn-bg p-3" role="alert">
					<p class="text-xs font-medium text-warn-text">
						{store.lumberResult.unfitPieces.length} piece{store.lumberResult.unfitPieces.length === 1 ? '' : 's'} too long for available boards:
					</p>
					<ul class="mt-1 space-y-0.5 text-xs text-warn-text/80">
						{#each store.lumberResult.unfitPieces as piece}
							<li>{piece.label || 'Unnamed'} ({formatLength(piece.length)})</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Board layouts grouped by lumber type -->
			{#each [...boardsByType.entries()] as [typeId, boards]}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-white">{lumberTypeName(typeId)}</h3>

					<div class="space-y-3">
						{#each boards as board, i}
							{@const remainingLength = board.boardLength - board.pieces.reduce((sum, p) => sum + p.length, 0)}
							<div class="rounded-lg border border-shop-light bg-shop-mid/30 p-3 space-y-2">
								<div class="flex items-baseline justify-between">
									<span class="text-xs font-semibold text-white">
										Board {i + 1} of {boards.length}
									</span>
									<div class="flex items-center gap-3 text-xs font-mono">
										<span class="text-shop-muted">{formatLength(board.boardLength)}</span>
										<span class={boardWasteColor(board.wastePercent)}>{board.wastePercent.toFixed(1)}% waste</span>
									</div>
								</div>

								<!-- Pieces table -->
								<table class="w-full text-xs">
									<thead>
										<tr class="text-shop-muted border-b border-shop-light/30">
											<th class="text-left py-1 font-medium">Label</th>
											<th class="text-right py-1 font-medium">Cut Length</th>
											<th class="text-right py-1 font-medium">Offset</th>
										</tr>
									</thead>
									<tbody>
										{#each board.pieces as piece}
											<tr class="border-b border-shop-light/10">
												<td class="py-1 text-white">
													<span class="inline-block w-2 h-2 rounded-sm mr-1.5" style="background-color: {piece.color}"></span>
													{piece.label || 'Unnamed'}
												</td>
												<td class="py-1 text-right font-mono text-shop-light">{piece.length} in</td>
												<td class="py-1 text-right font-mono text-shop-muted">{piece.offset.toFixed(2)} in</td>
											</tr>
										{/each}
									</tbody>
								</table>

								<!-- Remaining / waste -->
								<div class="flex justify-end text-xs font-mono {boardWasteColor(board.wastePercent)}">
									{remainingLength.toFixed(2)} in remaining
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<div class="sr-only" aria-live="polite" aria-atomic="true">{resultSummary}</div>

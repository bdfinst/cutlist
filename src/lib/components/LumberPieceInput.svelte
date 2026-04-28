<script lang="ts">
	import type { LumberPiece } from '$lib/types';
	import { store } from '$lib/stores.svelte';

	const DIMENSION_STEP = 0.125;

	let { piece }: { piece: LumberPiece } = $props();

	let lengthInvalid = $derived(isNaN(piece.length) || piece.length <= 0);
	let qtyInvalid = $derived(isNaN(piece.quantity) || piece.quantity <= 0);

	let errorId = $derived(`lumber-piece-${piece.id}-errors`);
	let hasErrors = $derived(lengthInvalid || qtyInvalid);

	const numBase = 'rounded bg-shop-dark border px-2 py-1 text-sm font-mono text-shop-text transition-colors focus:outline-none focus:ring-1';
	const numValid = 'border-shop-light focus:border-plywood focus:ring-plywood/30';
	const numError = 'border-danger/50 bg-danger/5 focus:border-danger focus:ring-danger/30';

	function handleMaterialChange(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		store.assignLumberType(piece.id, value === '' ? null : value);
	}
</script>

<li class="group rounded-lg border border-shop-light/60 bg-shop-mid p-2.5 transition-colors hover:border-shop-muted/50">
	<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
		<!-- Label row -->
		<div class="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[18ch]">
			<div
				class="h-3 w-3 shrink-0 rounded-sm ring-1 ring-white/10"
				style:background-color={piece.color}
				role="img"
				aria-label="Color indicator for {piece.label || 'lumber piece'}"
			></div>
			<label class="sr-only" for="lumber-piece-label-{piece.id}">Piece name</label>
			<input
				id="lumber-piece-label-{piece.id}"
				type="text"
				value={piece.label}
				title={piece.label}
				oninput={(e) => store.updateLumberPiece(piece.id, { label: e.currentTarget.value })}
				placeholder="Name"
				class="min-w-0 flex-1 rounded bg-transparent border border-transparent px-1.5 py-1 text-sm text-white placeholder:text-shop-muted transition-colors focus:border-shop-light focus:bg-shop-dark focus:outline-none focus:ring-1 focus:ring-plywood/30"
			/>
		</div>

		<!-- Length + qty + material + remove -->
		<div class="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">
			<div class="flex items-center gap-1 text-xs text-shop-muted">
				<label class="sr-only" for="lumber-piece-length-{piece.id}">Length (in)</label>
				<input
					id="lumber-piece-length-{piece.id}"
					type="number"
					inputmode="decimal"
					value={piece.length}
					oninput={(e) => store.updateLumberPiece(piece.id, { length: parseFloat(e.currentTarget.value) || 0 })}
					step={DIMENSION_STEP}
					min="0.125"
					class="w-20 text-right tabular-nums {numBase} {lengthInvalid ? numError : numValid}"
					aria-invalid={lengthInvalid}
					aria-describedby={hasErrors ? errorId : undefined}
				/>
				<span class="text-shop-muted/60">in</span>
			</div>

			<label class="sr-only" for="lumber-piece-qty-{piece.id}">Quantity</label>
			<div class="flex items-center gap-1">
				<span aria-hidden="true" class="text-xs text-shop-muted">&times;</span>
				<input
					id="lumber-piece-qty-{piece.id}"
					type="number"
					inputmode="numeric"
					value={piece.quantity}
					oninput={(e) => store.updateLumberPiece(piece.id, { quantity: parseInt(e.currentTarget.value) || 1 })}
					min="1"
					class="w-12 text-center tabular-nums {numBase} {qtyInvalid ? numError : numValid}"
					aria-invalid={qtyInvalid}
					aria-describedby={hasErrors ? errorId : undefined}
				/>
			</div>

			<label class="sr-only" for="lumber-piece-material-{piece.id}">Material</label>
			<select
				id="lumber-piece-material-{piece.id}"
				value={piece.lumberTypeId ?? ''}
				onchange={handleMaterialChange}
				class="rounded bg-shop-dark border border-shop-light px-2 py-1 text-sm text-shop-text transition-colors focus:outline-none focus:ring-1 focus:border-plywood focus:ring-plywood/30"
			>
				<option value="">Unassigned</option>
				{#each store.lumberTypes as lt (lt.id)}
					<option value={lt.id}>{lt.name}</option>
				{/each}
			</select>

			<button
				onclick={() => store.removeLumberPiece(piece.id)}
				class="ml-auto shrink-0 rounded p-1 text-shop-muted transition-all duration-150 hover:text-danger hover:bg-danger/10 hover:scale-110 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
				aria-label="Remove {piece.label || 'lumber piece'}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
	</div>

	{#if hasErrors}
		<p id={errorId} class="mt-1.5 text-xs text-danger pl-5" role="alert">
			{#if lengthInvalid}Length must be &gt; 0. {/if}
			{#if qtyInvalid}Qty must be &ge; 1.{/if}
		</p>
	{/if}
</li>

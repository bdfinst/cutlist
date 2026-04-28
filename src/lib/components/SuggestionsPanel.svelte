<script lang="ts">
	import { store } from '$lib/stores.svelte';

	let hasAny = $derived(
		store.configSuggestions.length > 0 ||
			store.trimSuggestions.length > 0 ||
			store.smallStockSuggestions.length > 0 ||
			store.pairingHints.length > 0
	);

	function applyEnableTolerance() {
		store.applyConfig({ oversizeTolerance: store.config.kerf });
	}

	function applyUnlockGrain() {
		store.applyConfig({ grainDirection: false });
	}

	const applyBtn =
		'rounded border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success transition-colors hover:bg-success/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success';
</script>

{#if hasAny}
	<div
		class="blueprint-card bg-plywood/5 p-3 max-w-2xl"
		aria-label="Ways to reduce waste"
	>
		<p class="text-xs font-semibold text-plywood">Ways to reduce waste</p>

		{#if store.configSuggestions.length > 0}
			<div class="mt-3">
				<p class="text-[11px] font-semibold text-shop-text uppercase tracking-wide">
					Settings
				</p>
				<ul class="mt-1 space-y-1.5 text-xs text-shop-text">
					{#each store.configSuggestions as s}
						<li class="flex flex-wrap items-center gap-2">
							<span class="flex-1 min-w-0">
								{#if s.kind === 'enable-tolerance'}
									Enable <span class="font-medium">"Allow tight pairings"</span>
								{:else}
									Unlock <span class="font-medium">grain direction</span>
								{/if}
								→ <span class="font-mono text-success">−{s.sheetsSaved} sheet{s.sheetsSaved === 1 ? '' : 's'}</span>
								(waste <span class="font-mono">{s.wasteBefore.toFixed(1)}%</span> →
								<span class="font-mono">{s.wasteAfter.toFixed(1)}%</span>)
							</span>
							{#if s.kind === 'enable-tolerance'}
								<button type="button" onclick={applyEnableTolerance} class={applyBtn}>
									Apply
								</button>
							{:else}
								<button type="button" onclick={applyUnlockGrain} class={applyBtn}>
									Apply
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if store.trimSuggestions.length > 0}
			<div class="mt-3">
				<p class="text-[11px] font-semibold text-shop-text uppercase tracking-wide">
					Trim a piece
				</p>
				<ul class="mt-1 space-y-1.5 text-xs text-shop-text">
					{#each store.trimSuggestions as s}
						<li class="flex flex-wrap items-center gap-2">
							<span class="flex-1 min-w-0">
								Trim <span class="font-medium">"{s.pieceLabel || 'Unnamed'}"</span>
								{s.dimension === 'height' ? 'length' : 'width'} from
								<span class="font-mono">{s.originalValue}″</span> →
								<span class="font-mono">{s.trimmedValue}″</span> →
								<span class="font-mono text-success">−{s.sheetsSaved} sheet{s.sheetsSaved === 1 ? '' : 's'}</span>
							</span>
							<button
								type="button"
								onclick={() => store.applyTrim(s.pieceId, s.dimension, s.trimmedValue)}
								class={applyBtn}
								aria-label="Trim {s.pieceLabel || 'piece'} {s.dimension === 'height' ? 'length' : 'width'} to {s.trimmedValue}"
							>
								Apply
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if store.smallStockSuggestions.length > 0}
			<div class="mt-3">
				<p class="text-[11px] font-semibold text-shop-text uppercase tracking-wide">
					Use a smaller stock
				</p>
				<ul class="mt-1 space-y-1 text-xs text-shop-text">
					{#each store.smallStockSuggestions as s}
						<li>
							Sheet {s.sheetIndex + 1}
							(<span class="font-mono">{s.wastePercent.toFixed(0)}%</span> waste,
							{s.pieceCount} piece{s.pieceCount === 1 ? '' : 's'})
							fits in
							<span class="font-mono">{s.minWidth}″ × {s.minHeight}″</span>
							of stock instead of
							<span class="font-mono">{s.stockWidth}″ × {s.stockHeight}″</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if store.pairingHints.length > 0}
			<div class="mt-3">
				<p class="text-[11px] font-semibold text-shop-text uppercase tracking-wide">
					Near-miss pairings
				</p>
				<ul class="mt-1 space-y-2 text-xs text-shop-text">
					{#each store.pairingHints as hint}
						{@const pairLabel = hint.selfPair
							? `2× "${hint.pieceA.label || 'Unnamed'}"`
							: `"${hint.pieceA.label || 'Unnamed'}" + "${hint.pieceB.label || 'Unnamed'}"`}
						{@const stackName = hint.axis === 'column' ? 'column' : 'row'}
						{@const trimResolutions = hint.resolutions.filter((r) => r.kind === 'trim')}
						{@const hasTolerance = hint.resolutions.some(
							(r) => r.kind === 'enable-tolerance'
						)}
						<li>
							<div>
								{pairLabel} in a {hint.sharedDim}″ {stackName} sums to
								<span class="font-mono">{(hint.pairedLength + hint.kerf).toFixed(3)}″</span>,
								off the {hint.sheetDim}″ sheet by
								<span class="font-mono text-kerf">{hint.overshoot.toFixed(3)}″</span>.
							</div>
							<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-shop-muted">
								<span class="text-success font-medium">Fix:</span>
								{#each trimResolutions as r, i}
									{#if i > 0}<span aria-hidden="true">or</span>{/if}
									<span class="inline-flex items-center gap-1.5">
										<span>
											trim
											<span class="font-medium text-shop-text"
												>"{r.pieceLabel || 'Unnamed'}"</span
											>
											{r.dimension === 'height' ? 'length' : 'width'} from
											<span class="font-mono">{r.from}″</span> →
											<span class="font-mono">{r.to.toFixed(3)}″</span>
										</span>
										<button
											type="button"
											onclick={() => store.applyTrim(r.pieceId, r.dimension, r.to)}
											class={applyBtn}
											aria-label="Trim {r.pieceLabel || 'piece'} {r.dimension === 'height' ? 'length' : 'width'} to {r.to.toFixed(3)}"
										>
											Apply
										</button>
									</span>
								{/each}
								{#if hasTolerance}
									<span aria-hidden="true">or</span>
									<span class="inline-flex items-center gap-1.5">
										<span>
											enable
											<span class="font-medium text-shop-text"
												>"Allow tight pairings"</span
											>
										</span>
										<button type="button" onclick={applyEnableTolerance} class={applyBtn}>
											Apply
										</button>
									</span>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

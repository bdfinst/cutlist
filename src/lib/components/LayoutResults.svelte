<script lang="ts">
	import { store } from '$lib/stores.svelte';
	import { generatePDF } from '$lib/pdf';
	import LayoutPreview from './LayoutPreview.svelte';

	let resultSummary = $derived(
		store.result.totalSheets > 0
			? `Layout updated: ${store.result.totalSheets} sheet${store.result.totalSheets === 1 ? '' : 's'}, ${store.result.totalWastePercent.toFixed(1)}% waste.`
			: ''
	);

	let wasteColor = $derived(
		store.result.totalWastePercent > 50 ? 'text-kerf' :
		store.result.totalWastePercent > 30 ? 'text-plywood' :
		'text-success'
	);
</script>

{#if store.pieces.length === 0}
	<div class="flex items-center justify-center rounded-lg border border-dashed border-shop-light/40 py-20">
		<div class="text-center">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="mx-auto text-shop-light mb-3">
				<rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="1"/>
				<line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
				<line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
			</svg>
			<p class="text-sm text-shop-muted">Add pieces to see the layout</p>
		</div>
	</div>
{:else if store.result.totalSheets === 0 && store.result.unfitPieces.length === 0}
	<p class="text-sm text-shop-muted">No valid pieces to lay out.</p>
{:else}
	<div class="space-y-5">
		<!-- Summary bar -->
		<div class="flex items-center justify-between rounded-lg bg-shop-mid border border-shop-light/60 px-4 py-3">
			<div class="flex items-center gap-4">
				<div>
					<div class="text-2xl font-bold text-white font-mono">{store.result.totalSheets}</div>
					<div class="text-xs text-shop-muted">sheet{store.result.totalSheets === 1 ? '' : 's'}</div>
				</div>
				<div class="h-8 w-px bg-shop-light"></div>
				<div>
					<div class="text-2xl font-bold font-mono {wasteColor}">{store.result.totalWastePercent.toFixed(1)}%</div>
					<div class="text-xs text-shop-muted">waste</div>
				</div>
			</div>
			<button
				type="button"
				onclick={() => generatePDF(store.result, store.config, store.pieces)}
				class="flex items-center gap-2 rounded-lg bg-plywood px-4 py-2 text-sm font-semibold text-shop-dark hover:bg-plywood-light transition-colors btn-press btn-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plywood"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
					<polyline points="7 10 12 15 17 10"/>
					<line x1="12" y1="15" x2="12" y2="3"/>
				</svg>
				Download PDF
			</button>
		</div>

		{#if store.result.unfitPieces.length > 0}
			<div class="rounded-lg border border-warn-border bg-warn-bg p-3" role="alert">
				<p class="text-xs font-medium text-warn-text">
					{store.result.unfitPieces.length} piece{store.result.unfitPieces.length === 1 ? '' : 's'} too large:
				</p>
				<ul class="mt-1 space-y-0.5 text-xs text-warn-text/80">
					{#each store.result.unfitPieces as piece}
						<li>{piece.label || 'Unnamed'} ({piece.width} &times; {piece.height})</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if store.configSuggestions.length > 0 || store.trimSuggestions.length > 0 || store.smallStockSuggestions.length > 0 || store.pairingHints.length > 0}
			<details class="rounded-lg border border-plywood/40 bg-plywood/5 p-3" open>
				<summary class="cursor-pointer text-xs font-semibold text-plywood select-none">
					Ways to reduce waste
				</summary>

				{#if store.configSuggestions.length > 0}
					<div class="mt-3">
						<p class="text-[11px] font-semibold text-shop-text uppercase tracking-wide">
							Settings
						</p>
						<ul class="mt-1 space-y-1 text-xs text-shop-text">
							{#each store.configSuggestions as s}
								<li>
									{#if s.kind === 'enable-tolerance'}
										Enable <span class="font-medium">"Allow tight pairings"</span>
									{:else}
										Unlock <span class="font-medium">grain direction</span>
									{/if}
									→ <span class="font-mono text-success">−{s.sheetsSaved} sheet{s.sheetsSaved === 1 ? '' : 's'}</span>
									(waste <span class="font-mono">{s.wasteBefore.toFixed(1)}%</span> →
									<span class="font-mono">{s.wasteAfter.toFixed(1)}%</span>)
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
						<ul class="mt-1 space-y-1 text-xs text-shop-text">
							{#each store.trimSuggestions as s}
								<li>
									Trim <span class="font-medium">"{s.pieceLabel || 'Unnamed'}"</span>
									{s.dimension} from
									<span class="font-mono">{s.originalValue}″</span> →
									<span class="font-mono">{s.trimmedValue}″</span> →
									<span class="font-mono text-success">−{s.sheetsSaved} sheet{s.sheetsSaved === 1 ? '' : 's'}</span>
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
									<div class="mt-1 text-shop-muted">
										<span class="text-success font-medium">Fix:</span>
										{#each trimResolutions as r, i}
											{#if i > 0}<span> or </span>{/if}
											trim
											<span class="font-medium text-shop-text">"{r.pieceLabel || 'Unnamed'}"</span>
											{r.dimension} from <span class="font-mono">{r.from}″</span> →
											<span class="font-mono">{r.to.toFixed(3)}″</span>
										{/each}
										{#if hasTolerance}
											, or enable
											<span class="font-medium text-shop-text">"Allow tight pairings"</span>
										{/if}.
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</details>
		{/if}

		<!-- Sheet layouts -->
		<div class="space-y-6">
			{#each store.result.sheets as sheet (sheet.sheetIndex)}
				<LayoutPreview {sheet} config={store.config} />
			{/each}
		</div>
	</div>
{/if}

<div class="sr-only" aria-live="polite" aria-atomic="true">{resultSummary}</div>

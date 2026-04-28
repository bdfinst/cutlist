<script lang="ts">
	import { store } from '$lib/stores.svelte';

	const DEFAULT_THICKNESS = 0.75;
	const DEFAULT_WIDTH = 3.5;
	const DEFAULT_LENGTH = 96;

	function handleAddType() {
		store.addLumberType('', DEFAULT_THICKNESS, DEFAULT_WIDTH, [DEFAULT_LENGTH]);
	}

	function handleRemoveType(id: string) {
		store.removeLumberType(id);
	}

	const inputBase = 'w-full rounded bg-shop-dark border px-2.5 py-1.5 text-sm font-mono text-shop-text placeholder:text-shop-muted transition-colors focus:outline-none focus:ring-1';
	const inputValid = 'border-shop-light focus:border-plywood focus:ring-plywood/30';

	const btnBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 btn-press';
	const btnPrimary = `${btnBase} bg-plywood text-shop-dark font-semibold hover:bg-plywood-light focus-visible:outline-plywood btn-glow`;
	const btnDanger = `${btnBase} text-shop-muted border border-shop-light hover:bg-danger/10 hover:text-danger hover:border-danger/40 focus-visible:outline-danger btn-danger-glow`;
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-xs font-semibold tracking-widest uppercase text-shop-muted">Lumber Types</h2>
		<button
			type="button"
			onclick={handleAddType}
			class={btnPrimary}
		>
			+ Add type
		</button>
	</div>

	{#if store.lumberTypes.length === 0}
		<div class="rounded-lg border border-dashed border-shop-light/60 py-8 text-center">
			<p class="text-sm text-shop-muted">No lumber types defined</p>
			<p class="text-xs text-shop-muted/60 mt-1">Add a lumber type to get started</p>
		</div>
	{/if}

	<ul class="space-y-2" role="list">
		{#each store.lumberTypes as lt (lt.id)}
			<li class="rounded-lg border border-shop-light bg-shop-panel p-3">
				<div class="flex items-start gap-2">
					<!-- Name -->
					<label class="space-y-1 flex-1 min-w-0">
						<span class="text-xs text-shop-muted">Name</span>
						<input
							type="text"
							value={lt.name}
							oninput={(e) => store.updateLumberType(lt.id, { name: e.currentTarget.value })}
							placeholder="e.g. 1x4 Pine"
							class="{inputBase} {inputValid}"
						/>
					</label>

					<!-- Width -->
					<label class="space-y-1 w-20">
						<span class="text-xs text-shop-muted">Width</span>
						<div class="relative">
							<input
								type="number"
								value={lt.crossHeight}
								oninput={(e) =>
									store.updateLumberType(lt.id, {
										crossHeight: parseFloat(e.currentTarget.value) || 0
									})}
								step="0.25"
								min="0.25"
								class="{inputBase} {inputValid} pr-8"
							/>
							<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
						</div>
					</label>

					<!-- Length -->
					<label class="space-y-1 w-20">
						<span class="text-xs text-shop-muted">Length</span>
						<div class="relative">
							<input
								type="number"
								value={lt.availableLengths[0] ?? DEFAULT_LENGTH}
								oninput={(e) =>
									store.setLumberLength(lt.id, parseFloat(e.currentTarget.value) || 0)}
								step="1"
								min="1"
								class="{inputBase} {inputValid} pr-8"
							/>
							<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
						</div>
					</label>

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => handleRemoveType(lt.id)}
						title="Remove lumber type"
						class="{btnDanger} mt-5 shrink-0"
						aria-label="Remove {lt.name || 'lumber type'}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			</li>
		{/each}
	</ul>
</div>

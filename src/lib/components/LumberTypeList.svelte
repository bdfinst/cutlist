<script lang="ts">
	import { store } from '$lib/stores.svelte';

	const DEFAULT_CROSS_WIDTH = 1.5;
	const DEFAULT_CROSS_HEIGHT = 3.5;
	const DEFAULT_LENGTHS = [96];

	let newLengthInputs = $state<Record<string, string>>({});

	function handleAddType() {
		store.addLumberType('', DEFAULT_CROSS_WIDTH, DEFAULT_CROSS_HEIGHT, DEFAULT_LENGTHS);
	}

	function handleRemoveType(id: string) {
		store.removeLumberType(id);
		delete newLengthInputs[id];
	}

	function handleAddLength(typeId: string) {
		const raw = newLengthInputs[typeId];
		const value = parseFloat(raw);
		if (!isNaN(value) && value > 0) {
			store.addLumberLength(typeId, value);
			newLengthInputs[typeId] = '';
		}
	}

	function handleLengthKeydown(e: KeyboardEvent, typeId: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddLength(typeId);
		}
	}

	const inputBase = 'w-full rounded bg-shop-dark border px-2.5 py-1.5 text-sm font-mono text-shop-text placeholder:text-shop-muted transition-colors focus:outline-none focus:ring-1';
	const inputValid = 'border-shop-light focus:border-plywood focus:ring-plywood/30';

	const btnBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 btn-press';
	const btnPrimary = `${btnBase} bg-plywood text-shop-dark font-semibold hover:bg-plywood-light focus-visible:outline-plywood btn-glow`;
	const btnGhost = `${btnBase} text-shop-muted border border-shop-light hover:bg-shop-light/60 hover:text-shop-text focus-visible:outline-shop-muted`;
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
			<li class="rounded-lg border border-shop-light bg-shop-panel p-3 space-y-2">
				<div class="flex items-start gap-2">
					<!-- Name -->
					<label class="space-y-1 flex-1 min-w-0">
						<span class="text-xs text-shop-muted">Name</span>
						<input
							type="text"
							value={lt.name}
							oninput={(e) => store.updateLumberType(lt.id, { name: e.currentTarget.value })}
							placeholder="e.g. 2x4 Pine"
							class="{inputBase} {inputValid}"
						/>
					</label>

					<!-- Cross width -->
					<label class="space-y-1 w-20">
						<span class="text-xs text-shop-muted">Width</span>
						<div class="relative">
							<input
								type="number"
								value={lt.crossWidth}
								oninput={(e) => store.updateLumberType(lt.id, { crossWidth: parseFloat(e.currentTarget.value) || 0 })}
								step="0.25"
								min="0.25"
								class="{inputBase} {inputValid} pr-8"
							/>
							<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-shop-muted pointer-events-none">in</span>
						</div>
					</label>

					<!-- Cross height -->
					<label class="space-y-1 w-20">
						<span class="text-xs text-shop-muted">Height</span>
						<div class="relative">
							<input
								type="number"
								value={lt.crossHeight}
								oninput={(e) => store.updateLumberType(lt.id, { crossHeight: parseFloat(e.currentTarget.value) || 0 })}
								step="0.25"
								min="0.25"
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

				<!-- Available lengths -->
				<div class="space-y-1">
					<span class="text-xs text-shop-muted">Available lengths</span>
					<div class="flex flex-wrap items-center gap-1.5">
						{#each lt.availableLengths as length, i}
							<span class="inline-flex items-center gap-1 rounded bg-shop-dark border border-shop-light px-2 py-0.5 text-xs font-mono text-shop-text">
								{length}"
								<button
									type="button"
									onclick={() => store.removeLumberLength(lt.id, length)}
									class="text-shop-muted hover:text-danger transition-colors"
									aria-label="Remove {length} inch length"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							</span>
						{/each}

						<!-- Add length inline -->
						<span class="inline-flex items-center gap-1">
							<input
								type="number"
								placeholder="Len"
								value={newLengthInputs[lt.id] ?? ''}
								oninput={(e) => (newLengthInputs[lt.id] = e.currentTarget.value)}
								onkeydown={(e) => handleLengthKeydown(e, lt.id)}
								step="1"
								min="1"
								class="w-16 rounded bg-shop-dark border border-shop-light px-1.5 py-0.5 text-xs font-mono text-shop-text placeholder:text-shop-muted focus:outline-none focus:ring-1 focus:border-plywood focus:ring-plywood/30"
							/>
							<button
								type="button"
								onclick={() => handleAddLength(lt.id)}
								class="{btnGhost} py-0.5 px-1.5 text-[10px]"
							>
								+ Add
							</button>
						</span>
					</div>
				</div>
			</li>
		{/each}
	</ul>
</div>

<script lang="ts">
	import { store } from '$lib/stores.svelte';
	import { parseCSV } from '$lib/csv';
	import LumberPieceInput from './LumberPieceInput.svelte';

	let statusMessage = $state('');
	let importWarnings = $state<string[]>([]);
	let addBtn: HTMLButtonElement;

	function handleAdd() {
		store.addLumberPiece('', 24, 1);
		statusMessage = `Lumber piece added. ${store.lumberPieces.length} piece${store.lumberPieces.length === 1 ? '' : 's'} total.`;
	}

	function handleReset() {
		store.lumberPieces = [];
		importWarnings = [];
		statusMessage = 'All lumber pieces cleared.';
		addBtn?.focus();
	}

	function handleImportClick() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv,text/csv';
		input.addEventListener('change', () => {
			const file = input.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				const text = reader.result as string;
				const result = parseCSV(text);

				const unmatchedMaterials: string[] = [];

				for (const lp of result.lumberPieces) {
					const matchedType = store.lumberTypes.find((t) => t.name === lp.material);
					if (matchedType) {
						store.addLumberPiece(lp.label, lp.length, lp.quantity, matchedType.id);
					} else {
						store.addLumberPiece(lp.label, lp.length, lp.quantity);
						if (lp.material && !unmatchedMaterials.includes(lp.material)) {
							unmatchedMaterials.push(lp.material);
						}
					}
				}

				importWarnings = [...result.warnings];
				for (const mat of unmatchedMaterials) {
					importWarnings.push(`Material "${mat}" not found in lumber types — pieces imported as unassigned`);
				}

				const count = result.lumberPieces.length;
				statusMessage = `Imported ${count} lumber piece${count === 1 ? '' : 's'}. ${store.lumberPieces.length} total.`;
				if (importWarnings.length > 0) {
					statusMessage += ` ${importWarnings.length} warning${importWarnings.length === 1 ? '' : 's'}.`;
				}

				store.recordImport(file.name, count, importWarnings.length);
			};
			reader.readAsText(file);
		});
		input.click();
	}

	const btnBase = 'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 btn-press';
	const btnGhost = `${btnBase} text-shop-muted border border-shop-light hover:bg-shop-light/60 hover:text-shop-text focus-visible:outline-shop-muted`;
	const btnPrimary = `${btnBase} bg-plywood text-shop-dark font-semibold hover:bg-plywood-light focus-visible:outline-plywood btn-glow`;
	const btnDanger = `${btnBase} text-shop-muted border border-shop-light hover:bg-danger/10 hover:text-danger hover:border-danger/40 focus-visible:outline-danger btn-danger-glow`;
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-xs font-semibold tracking-widest uppercase text-shop-muted">Lumber Pieces</h2>
		<div class="flex gap-1.5">
			<button
				type="button"
				onclick={handleReset}
				disabled={store.lumberPieces.length === 0}
				title="Clear all lumber pieces"
				class="{btnDanger} disabled:opacity-30 disabled:pointer-events-none"
			>
				Reset
			</button>
			<button
				type="button"
				onclick={handleImportClick}
				class={btnGhost}
			>
				Import CSV
			</button>
			<button
				bind:this={addBtn}
				type="button"
				onclick={handleAdd}
				class={btnPrimary}
			>
				+ Add piece
			</button>
		</div>
	</div>

	{#if importWarnings.length > 0}
		<div class="rounded-lg border border-warn-border bg-warn-bg p-3" role="alert">
			<div class="flex items-start justify-between">
				<p class="text-xs font-medium text-warn-text">
					{importWarnings.length} warning{importWarnings.length === 1 ? '' : 's'}:
				</p>
				<button
					type="button"
					onclick={() => (importWarnings = [])}
					class="text-warn-text/60 hover:text-warn-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn-text"
					aria-label="Dismiss import warnings"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<ul class="mt-1 space-y-0.5 text-xs text-warn-text/80">
				{#each importWarnings as warning}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if store.lumberPieces.length === 0}
		<p class="text-xs text-shop-muted/70">
			No lumber pieces yet.
		</p>
	{/if}

	<ul class="space-y-1.5" role="list">
		{#each store.lumberPieces as piece (piece.id)}
			<LumberPieceInput {piece} />
		{/each}
	</ul>

	<div class="sr-only" aria-live="polite" aria-atomic="true">{statusMessage}</div>
</div>

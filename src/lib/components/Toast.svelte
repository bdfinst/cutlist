<script lang="ts">
	import { store } from '$lib/stores.svelte';

	function dismiss() {
		store.lastImportNotice = null;
	}

	const message = $derived.by(() => {
		const notice = store.lastImportNotice;
		if (!notice) return '';
		const pieceWord = notice.count === 1 ? 'piece' : 'pieces';
		const head = `Imported ${notice.count} ${pieceWord} from ${notice.filename}`;
		if (notice.skipped > 0) {
			const rowWord = notice.skipped === 1 ? 'row' : 'rows';
			return `${head}. ${notice.skipped} ${rowWord} skipped.`;
		}
		return `${head}.`;
	});
</script>

<div
	role="status"
	aria-live="polite"
	aria-atomic="true"
	class="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4 sm:top-24"
>
	{#if store.lastImportNotice}
		<div
			class="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-success/40 bg-shop-mid/95 px-4 py-3 shadow-lg backdrop-blur-sm motion-reduce:transition-none"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="mt-0.5 shrink-0 text-success"
				aria-hidden="true"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
			<p class="flex-1 text-sm text-shop-text">{message}</p>
			<button
				type="button"
				onclick={dismiss}
				aria-label="Dismiss notification"
				class="-m-1 shrink-0 rounded p-1 text-shop-muted transition-colors hover:text-shop-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-muted"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	{/if}
</div>

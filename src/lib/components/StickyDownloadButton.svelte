<script lang="ts">
	import { browser } from '$app/environment';

	let {
		anchorSelector,
		onDownload,
		busy = false,
		label = 'Download PDF'
	}: {
		anchorSelector: string;
		onDownload: () => void;
		busy?: boolean;
		label?: string;
	} = $props();

	let visible = $state(false);

	$effect(() => {
		if (!browser) return;
		const anchor = document.querySelector(anchorSelector);
		if (!anchor) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				visible = !entry.isIntersecting;
			},
			{ rootMargin: '0px', threshold: 0 }
		);
		observer.observe(anchor);
		return () => observer.disconnect();
	});
</script>

{#if visible}
	<div class="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end">
		<button
			type="button"
			onclick={onDownload}
			disabled={busy}
			aria-label={label}
			class="pointer-events-auto flex items-center gap-2 rounded-full bg-plywood px-5 py-2.5 text-sm font-semibold text-shop-dark shadow-lg transition-colors hover:bg-plywood-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plywood disabled:opacity-50 disabled:cursor-wait motion-reduce:transition-none"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			{busy ? 'Generating…' : label}
		</button>
	</div>
{/if}

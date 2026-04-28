<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { isDonateEnabled } from '$lib/donate';

	const enabled = isDonateEnabled(env.PUBLIC_STRIPE_DONATE_ENABLED);

	let loading = $state(false);
	let errorMsg = $state('');

	async function handleClick() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/donate', { method: 'POST' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as { url?: string };
			if (!data.url) throw new Error('Missing session URL');
			window.open(data.url, '_blank', 'noopener,noreferrer');
		} catch {
			errorMsg = 'Could not open donation page. Try again.';
		} finally {
			loading = false;
		}
	}
</script>

{#if enabled}
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={handleClick}
			disabled={loading}
			aria-busy={loading}
			aria-label="Support, opens donation page in new tab"
			class="rounded border border-shop-light px-3 py-1 text-xs font-medium text-shop-muted transition-colors hover:border-plywood hover:text-plywood focus:outline-none focus:ring-1 focus:ring-plywood/40 disabled:opacity-50 disabled:cursor-wait"
		>
			{loading ? 'Opening…' : 'Support'}
		</button>
		<span role="status" aria-live="polite" class="text-xs text-danger">
			{errorMsg}
		</span>
	</div>
{/if}

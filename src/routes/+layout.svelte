<script lang="ts">
	import '@fontsource/ibm-plex-sans/400.css';
	import '@fontsource/ibm-plex-sans/600.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/600.css';
	import './layout.css';
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<!-- SVG favicon for modern browsers (scales perfectly at any size) -->
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<!-- Fallback ICO for older browsers / pinned tabs -->
	<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
	<!-- iOS home-screen icon -->
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<!-- Web manifest enables PWA install + Android home-screen icon -->
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>
{@render children()}
<Toast />

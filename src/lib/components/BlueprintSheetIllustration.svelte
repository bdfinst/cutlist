<script lang="ts">
	let {
		widthLabel = '96"',
		heightLabel = '48"'
	}: {
		widthLabel?: string;
		heightLabel?: string;
	} = $props();

	const cyan = 'var(--color-blueprint-cyan)';

	// ViewBox is 4:8 ratio (sheet) plus margin for dimension lines.
	// Sheet rectangle: x=24, y=22, w=192, h=96 (logical viewBox units).
	const sx = 24;
	const sy = 22;
	const sw = 192;
	const sh = 96;
	const tickLen = 6;
</script>

<svg
	role="img"
	aria-label="4 by 8 sheet with dimension lines"
	viewBox="0 0 240 152"
	class="block h-auto w-full max-w-[280px]"
	xmlns="http://www.w3.org/2000/svg"
>
	<!-- Top dimension line -->
	<g stroke={cyan} stroke-width="0.8" fill="none" stroke-linecap="round">
		<line x1={sx} y1={sy - 12} x2={sx + sw} y2={sy - 12} />
		<polyline points={`${sx + 4},${sy - 14} ${sx},${sy - 12} ${sx + 4},${sy - 10}`} />
		<polyline points={`${sx + sw - 4},${sy - 14} ${sx + sw},${sy - 12} ${sx + sw - 4},${sy - 10}`} />
		<line x1={sx} y1={sy - 14} x2={sx} y2={sy - 4} />
		<line x1={sx + sw} y1={sy - 14} x2={sx + sw} y2={sy - 4} />
	</g>
	<text
		x={sx + sw / 2}
		y={sy - 16}
		text-anchor="middle"
		fill={cyan}
		font-family="'IBM Plex Mono', ui-monospace, monospace"
		font-size="9"
	>
		{widthLabel}
	</text>

	<!-- Left dimension line -->
	<g stroke={cyan} stroke-width="0.8" fill="none" stroke-linecap="round">
		<line x1={sx - 12} y1={sy} x2={sx - 12} y2={sy + sh} />
		<polyline points={`${sx - 14},${sy + 4} ${sx - 12},${sy} ${sx - 10},${sy + 4}`} />
		<polyline points={`${sx - 14},${sy + sh - 4} ${sx - 12},${sy + sh} ${sx - 10},${sy + sh - 4}`} />
		<line x1={sx - 14} y1={sy} x2={sx - 4} y2={sy} />
		<line x1={sx - 14} y1={sy + sh} x2={sx - 4} y2={sy + sh} />
	</g>
	<text
		x={sx - 18}
		y={sy + sh / 2}
		text-anchor="middle"
		fill={cyan}
		font-family="'IBM Plex Mono', ui-monospace, monospace"
		font-size="9"
		transform={`rotate(-90 ${sx - 18} ${sy + sh / 2})`}
	>
		{heightLabel}
	</text>

	<!-- Sheet rectangle (hairline) -->
	<rect
		x={sx}
		y={sy}
		width={sw}
		height={sh}
		fill="none"
		stroke={cyan}
		stroke-width="1"
	/>

	<!-- Corner ticks (interior) -->
	<g stroke={cyan} stroke-width="1.2" fill="none" stroke-linecap="round">
		<polyline points={`${sx + tickLen},${sy} ${sx},${sy} ${sx},${sy + tickLen}`} />
		<polyline points={`${sx + sw - tickLen},${sy} ${sx + sw},${sy} ${sx + sw},${sy + tickLen}`} />
		<polyline points={`${sx + tickLen},${sy + sh} ${sx},${sy + sh} ${sx},${sy + sh - tickLen}`} />
		<polyline
			points={`${sx + sw - tickLen},${sy + sh} ${sx + sw},${sy + sh} ${sx + sw},${sy + sh - tickLen}`}
		/>
	</g>
</svg>

<script lang="ts">
	import type { PlacedPiece, SheetConfig } from '$lib/types';
	import { getContrastColor } from '$lib/colors';

	let { pieces, config }: { pieces: PlacedPiece[]; config: SheetConfig } = $props();

	function fontSize(piece: PlacedPiece): number {
		const minDim = Math.min(piece.width, piece.height);
		const sizeByDim = minDim * 0.15;
		// Estimate label width: ~0.6 chars per em for this font
		const labelLen = (piece.label || '').length + (piece.rotated ? 2 : 0);
		const sizeByWidth = labelLen > 0 ? piece.width / (labelLen * 0.6) : sizeByDim;
		return Math.max(0.6, Math.min(2.5, Math.min(sizeByDim, sizeByWidth)));
	}

	function showDimensions(piece: PlacedPiece): boolean {
		// Only show dimensions text if piece is tall enough for two lines
		return Math.min(piece.width, piece.height) > 4;
	}

	const titleId = crypto.randomUUID();
</script>

<svg
	viewBox="0 0 {config.width} {config.height}"
	preserveAspectRatio="xMidYMid meet"
	width="100%"
	class="rounded-lg"
	role="img"
	aria-labelledby={titleId}
>
	<title id={titleId}>Sheet layout showing {pieces.length} piece{pieces.length === 1 ? '' : 's'}</title>

	<defs>
		<!-- Grid pattern for waste area -->
		<pattern id="grid-{titleId}" width="4" height="4" patternUnits="userSpaceOnUse">
			<path d="M 4 0 L 0 0 0 4" fill="none" stroke="#3a3a44" stroke-width="0.15"/>
		</pattern>
	</defs>

	<!-- Sheet background (waste area with grid) -->
	<rect
		x="0" y="0"
		width={config.width}
		height={config.height}
		fill="#2a2a32"
		rx="0.5"
	/>
	<rect
		x="0" y="0"
		width={config.width}
		height={config.height}
		fill="url(#grid-{titleId})"
		rx="0.5"
	/>

	<!-- Sheet outline -->
	<rect
		x="0" y="0"
		width={config.width}
		height={config.height}
		fill="none"
		stroke="#555"
		stroke-width="0.3"
		rx="0.5"
	/>

	<!-- Placed pieces -->
	{#each pieces as piece, i}
		{@const textColor = getContrastColor(piece.color)}
		{@const fs = fontSize(piece)}
		{@const clipId = `clip-${titleId}-${i}`}
		{@const showDims = showDimensions(piece)}
		<defs>
			<clipPath id={clipId}>
				<rect x={piece.x + 0.3} y={piece.y + 0.3} width={piece.width - 0.6} height={piece.height - 0.6}/>
			</clipPath>
		</defs>
		<rect
			x={piece.x}
			y={piece.y}
			width={piece.width}
			height={piece.height}
			fill={piece.color}
			stroke="rgba(0,0,0,0.3)"
			stroke-width="0.15"
			rx="0.3"
		/>
		<g clip-path="url(#{clipId})">
			<text
				x={piece.x + piece.width / 2}
				y={piece.y + piece.height / 2 - (showDims ? fs * 0.4 : 0)}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size={fs}
				fill={textColor}
				font-weight="600"
				font-family="'DM Sans', sans-serif"
			>
				{piece.label}{piece.rotated ? ' ↻' : ''}
			</text>
			{#if showDims}
				<text
					x={piece.x + piece.width / 2}
					y={piece.y + piece.height / 2 + fs * 0.7}
					text-anchor="middle"
					dominant-baseline="middle"
					font-size={fs * 0.6}
					fill={textColor}
					opacity="0.7"
					font-family="'JetBrains Mono', monospace"
				>
					{piece.width}&times;{piece.height}
				</text>
			{/if}
		</g>
	{/each}
</svg>

<!-- Accessible piece details for screen readers -->
{#if pieces.length > 0}
	<table class="sr-only">
		<caption>Piece details</caption>
		<thead>
			<tr><th>Label</th><th>Width</th><th>Length</th><th>Position</th><th>Rotated</th></tr>
		</thead>
		<tbody>
			{#each pieces as piece}
				<tr>
					<td>{piece.label || 'Unnamed'}</td>
					<td>{piece.width}"</td>
					<td>{piece.height}"</td>
					<td>({piece.x}, {piece.y})</td>
					<td>{piece.rotated ? 'Yes' : 'No'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

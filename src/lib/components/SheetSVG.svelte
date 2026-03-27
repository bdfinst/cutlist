<script lang="ts">
	import type { PlacedPiece, SheetConfig } from '$lib/types';
	import { getContrastColor } from '$lib/colors';

	let { pieces, config }: { pieces: PlacedPiece[]; config: SheetConfig } = $props();

	function fontSize(piece: PlacedPiece): number {
		const minDim = Math.min(piece.width, piece.height);
		return Math.max(0.8, Math.min(3, minDim * 0.15));
	}

	const titleId = crypto.randomUUID();
</script>

<svg
	viewBox="-0.5 -0.5 {config.width + 1} {config.height + 1}"
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
	{#each pieces as piece}
		{@const textColor = getContrastColor(piece.color)}
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
		<text
			x={piece.x + piece.width / 2}
			y={piece.y + piece.height / 2 - fontSize(piece) * 0.3}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSize(piece)}
			fill={textColor}
			font-weight="600"
			font-family="'DM Sans', sans-serif"
		>
			{piece.label}{piece.rotated ? ' ↻' : ''}
		</text>
		<text
			x={piece.x + piece.width / 2}
			y={piece.y + piece.height / 2 + fontSize(piece) * 0.8}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSize(piece) * 0.65}
			fill={textColor}
			opacity="0.7"
			font-family="'JetBrains Mono', monospace"
		>
			{piece.width}&times;{piece.height}
		</text>
	{/each}
</svg>

<!-- Accessible piece details for screen readers -->
{#if pieces.length > 0}
	<table class="sr-only">
		<caption>Piece details</caption>
		<thead>
			<tr><th>Label</th><th>Width</th><th>Height</th><th>Position</th><th>Rotated</th></tr>
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

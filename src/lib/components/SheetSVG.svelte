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
	viewBox="0 0 {config.width} {config.height}"
	preserveAspectRatio="xMidYMid meet"
	width="100%"
	class="border border-gray-300 bg-gray-50"
	role="img"
	aria-labelledby={titleId}
>
	<title id={titleId}>Sheet layout showing {pieces.length} piece{pieces.length === 1 ? '' : 's'}</title>

	<!-- Sheet outline -->
	<rect
		x="0"
		y="0"
		width={config.width}
		height={config.height}
		fill="none"
		stroke="#999"
		stroke-width="0.25"
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
			stroke="#fff"
			stroke-width="0.15"
			opacity="0.85"
		/>
		<text
			x={piece.x + piece.width / 2}
			y={piece.y + piece.height / 2 - fontSize(piece) * 0.3}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSize(piece)}
			fill={textColor}
			font-weight="bold"
		>
			{piece.label}{piece.rotated ? ' ↻' : ''}
		</text>
		<text
			x={piece.x + piece.width / 2}
			y={piece.y + piece.height / 2 + fontSize(piece) * 0.8}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSize(piece) * 0.7}
			fill={textColor}
			opacity="0.9"
		>
			{piece.width} × {piece.height}
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

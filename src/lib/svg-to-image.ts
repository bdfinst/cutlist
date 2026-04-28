/**
 * Serialize an SVG element to a JPEG data URL by drawing it to a canvas.
 *
 * Used by the PDF export flow: rather than redrawing the cut-layout in jsPDF
 * (which has unreliable rotation), we capture the on-screen SVG and embed it
 * as an image — guaranteeing the PDF matches what the user sees.
 *
 * Uses JPEG (rather than PNG) because cut diagrams compress well: solid color
 * blocks plus a small amount of text. PNG of the same content runs ~5MB per
 * sheet at print resolution, which blows up multi-sheet PDFs.
 *
 * @param svg The SVG element to capture
 * @param widthPx Target raster width in pixels. Height is computed from the
 *   SVG's viewBox aspect ratio. Higher values mean crisper print output.
 */
export async function svgElementToPng(svg: SVGSVGElement, widthPx: number): Promise<string> {
	const viewBox = svg.viewBox.baseVal;
	if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
		throw new Error('SVG has no usable viewBox');
	}
	const aspect = viewBox.height / viewBox.width;
	const heightPx = Math.max(1, Math.round(widthPx * aspect));

	// Clone so we don't mutate the live SVG, and set explicit dims for rasterization
	const clone = svg.cloneNode(true) as SVGElement;
	clone.setAttribute('width', String(widthPx));
	clone.setAttribute('height', String(heightPx));
	if (!clone.getAttribute('xmlns')) {
		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	}

	const svgString = new XMLSerializer().serializeToString(clone);
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	try {
		const img = await loadImage(url);
		const canvas = document.createElement('canvas');
		canvas.width = widthPx;
		canvas.height = heightPx;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Could not get 2D canvas context');
		// White background so dark glyphs read on print and the PNG isn't transparent.
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, widthPx, heightPx);
		ctx.drawImage(img, 0, 0, widthPx, heightPx);
		return canvas.toDataURL('image/jpeg', 0.92);
	} finally {
		URL.revokeObjectURL(url);
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load SVG as image'));
		img.src = src;
	});
}

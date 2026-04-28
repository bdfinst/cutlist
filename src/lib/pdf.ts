import jsPDF from 'jspdf';
import { hexToRgb, getContrastColor } from './colors';
import type { CutlistResult, SheetConfig, PieceDefinition } from './types';

const PAGE_W = 11;
const PAGE_H = 8.5;
const MARGIN = 0.5;
const LABEL_FONT_MIN = 5;
const LABEL_FONT_MAX = 12;
const LABEL_FONT_SCALE = 8;
const POINTS_PER_INCH = 72;

export function generatePDF(result: CutlistResult, config: SheetConfig, pieces: PieceDefinition[]): void {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
	const drawW = PAGE_W - 2 * MARGIN;
	const drawH = PAGE_H - 2 * MARGIN;
	const scale = Math.min(drawW / config.width, drawH / config.height);

	for (let i = 0; i < result.sheets.length; i++) {
		if (i > 0) doc.addPage();
		renderSheetPage(doc, result.sheets[i], config, scale, i);
	}

	renderSummaryPage(doc, pieces, result);
	doc.save('cutlist.pdf');
}

function renderSheetPage(
	doc: jsPDF,
	sheet: CutlistResult['sheets'][number],
	config: SheetConfig,
	scale: number,
	index: number
): void {
	// Sheet header
	doc.setFontSize(14);
	doc.setTextColor(0);
	doc.text(
		`Sheet ${index + 1} — ${sheet.pieces.length} piece${sheet.pieces.length === 1 ? '' : 's'}, ${sheet.wastePercent.toFixed(1)}% waste`,
		MARGIN,
		MARGIN - 0.1
	);

	// Sheet outline
	doc.setDrawColor(150);
	doc.setLineWidth(0.01);
	doc.rect(MARGIN, MARGIN, config.width * scale, config.height * scale);

	// Placed pieces
	for (const piece of sheet.pieces) {
		const x = MARGIN + piece.x * scale;
		const y = MARGIN + piece.y * scale;
		const w = piece.width * scale;
		const h = piece.height * scale;

		const [r, g, b] = hexToRgb(piece.color);
		doc.setFillColor(r, g, b);
		doc.setDrawColor(255);
		doc.setLineWidth(0.005);
		doc.rect(x, y, w, h, 'FD');

		// Label text with contrast-safe color
		const [tr, tg, tb] = hexToRgb(getContrastColor(piece.color));
		doc.setTextColor(tr, tg, tb);

		const labelSize = Math.max(LABEL_FONT_MIN, Math.min(LABEL_FONT_MAX, Math.min(w, h) * LABEL_FONT_SCALE));
		doc.setFontSize(labelSize);
		const label = piece.label + (piece.rotated ? ' ↻' : '');
		doc.text(label, x + w / 2, y + h / 2 - labelSize / POINTS_PER_INCH * 0.3, { align: 'center' });

		const dimSize = labelSize * 0.7;
		doc.setFontSize(dimSize);
		doc.text(`${piece.width} × ${piece.height}`, x + w / 2, y + h / 2 + dimSize / POINTS_PER_INCH * 1.2, { align: 'center' });
	}
}

function renderSummaryPage(doc: jsPDF, pieces: PieceDefinition[], result: CutlistResult): void {
	doc.addPage();
	doc.setFontSize(16);
	doc.setTextColor(0);
	doc.text('Parts List', MARGIN, MARGIN);

	doc.setFontSize(10);
	let y = MARGIN + 0.4;
	const colLabel = MARGIN;
	const colW = MARGIN + 3;
	const colH = MARGIN + 4;
	const colQty = MARGIN + 5;

	// Header row
	doc.setFont('helvetica', 'bold');
	doc.text('Label', colLabel, y);
	doc.text('Width (in)', colW, y);
	doc.text('Length (in)', colH, y);
	doc.text('Qty', colQty, y);
	y += 0.25;

	// Piece rows
	doc.setFont('helvetica', 'normal');
	for (const piece of pieces) {
		if (piece.width <= 0 || piece.height <= 0 || piece.quantity <= 0) continue;
		doc.text(piece.label || 'Unnamed', colLabel, y);
		doc.text(String(piece.width), colW, y);
		doc.text(String(piece.height), colH, y);
		doc.text(String(piece.quantity), colQty, y);
		y += 0.2;

		if (y > PAGE_H - MARGIN) {
			doc.addPage();
			y = MARGIN;
		}
	}

	// Summary stats
	y += 0.3;
	doc.setFont('helvetica', 'bold');
	doc.text(`Total sheets: ${result.totalSheets}`, colLabel, y);
	y += 0.25;
	doc.text(`Total waste: ${result.totalWastePercent.toFixed(1)}%`, colLabel, y);
}

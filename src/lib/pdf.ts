import jsPDF from 'jspdf';
import { hexToRgb, getContrastColor } from './colors';
import type {
	CutlistResult,
	SheetConfig,
	PieceDefinition,
	LumberResult,
	LumberType,
	LumberPiece,
	PlacedPiece
} from './types';

const PAGE_W = 11;
const PAGE_H = 8.5;
const MARGIN = 0.5;
const SHEET_GAP = 0.4;
const HEADER_H = 0.35;
const LABEL_FONT_MIN = 5;
const LABEL_FONT_MAX = 12;
const LABEL_FONT_SCALE = 8;
const POINTS_PER_INCH = 72;

// Threshold for rotating a label along the long axis. A piece is "tall enough"
// to warrant rotation when the long side is meaningfully bigger than the short.
const ROTATE_ASPECT_THRESHOLD = 1.3;

// Lumber rendering — boards laid out as horizontal strips on portrait pages.
const BOARD_STRIP_H = 0.55; // PDF inches per board (the visible thickness)
const BOARD_HEADER_H = 0.25;
const BOARD_GAP = 0.25;

export function generatePDF(
	result: CutlistResult,
	lumberResult: LumberResult,
	lumberTypes: LumberType[],
	config: SheetConfig,
	pieces: PieceDefinition[],
	lumberPieces: LumberPiece[]
): void {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });

	renderSheetPages(doc, result, config);
	renderLumberPages(doc, lumberResult, lumberTypes);
	renderSummaryPage(doc, pieces, lumberPieces, lumberTypes, result, lumberResult);

	doc.save('cutlist.pdf');
}

// --- Sheet pages: two sheets per landscape page, side by side ---

function renderSheetPages(doc: jsPDF, result: CutlistResult, config: SheetConfig): void {
	if (result.sheets.length === 0) return;

	const drawW = PAGE_W - 2 * MARGIN;
	const drawH = PAGE_H - 2 * MARGIN - HEADER_H;
	const slotW = (drawW - SHEET_GAP) / 2;
	const slotH = drawH;
	const scale = Math.min(slotW / config.width, slotH / config.height);

	for (let i = 0; i < result.sheets.length; i += 2) {
		if (i > 0) doc.addPage();
		renderSheetAt(doc, result.sheets[i], config, MARGIN, MARGIN, scale);
		if (i + 1 < result.sheets.length) {
			renderSheetAt(doc, result.sheets[i + 1], config, MARGIN + slotW + SHEET_GAP, MARGIN, scale);
		}
	}
}

function renderSheetAt(
	doc: jsPDF,
	sheet: CutlistResult['sheets'][number],
	config: SheetConfig,
	originX: number,
	originY: number,
	scale: number
): void {
	// Header above the sheet
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(11);
	doc.setTextColor(0);
	doc.text(
		`Sheet ${sheet.sheetIndex + 1} — ${sheet.pieces.length} piece${sheet.pieces.length === 1 ? '' : 's'}, ${sheet.wastePercent.toFixed(1)}% waste`,
		originX,
		originY + 0.2
	);

	const sheetX = originX;
	const sheetY = originY + HEADER_H;

	// Sheet outline at full configured dimensions
	doc.setDrawColor(150);
	doc.setLineWidth(0.01);
	doc.rect(sheetX, sheetY, config.width * scale, config.height * scale);

	for (const piece of sheet.pieces) {
		const px = sheetX + piece.x * scale;
		const py = sheetY + piece.y * scale;
		const pw = piece.width * scale;
		const ph = piece.height * scale;
		renderPiece(doc, piece, px, py, pw, ph);
	}
}

function renderPiece(
	doc: jsPDF,
	piece: PlacedPiece,
	x: number,
	y: number,
	w: number,
	h: number
): void {
	const [r, g, b] = hexToRgb(piece.color);
	doc.setFillColor(r, g, b);
	doc.setDrawColor(255);
	doc.setLineWidth(0.005);
	doc.rect(x, y, w, h, 'FD');

	const [tr, tg, tb] = hexToRgb(getContrastColor(piece.color));
	doc.setTextColor(tr, tg, tb);

	const label = piece.label + (piece.rotated ? ' ↻' : '');
	const dim = `${piece.width} × ${piece.height}`;
	const cx = x + w / 2;
	const cy = y + h / 2;

	// Size the label so it fits within whichever dimension is the reading axis.
	// Tall pieces read along the long (height) axis after rotating the CTM;
	// wide pieces read horizontally.
	const rotate = h > w * ROTATE_ASPECT_THRESHOLD;
	const lengthBudget = rotate ? h : w;
	const perpBudget = rotate ? w : h;
	const labelSize = sizeLabelToFit(doc, label, lengthBudget, perpBudget);
	const dimSize = labelSize * 0.7;
	const lineGap = labelSize / POINTS_PER_INCH * 0.55;

	if (rotate) {
		// Rotate the page CTM 90° CCW around the piece center, then render the
		// text horizontally at (cx, cy). jsPDF's CTM rotation correctly places
		// the text — its built-in `angle:` option positions text inconsistently
		// when combined with align/baseline, so we avoid it.
		const pageH = doc.internal.pageSize.getHeight();
		const py_pdf = pageH - cy;
		// Rotation 90 CCW around (cx, py_pdf) in PDF y-up coords:
		// [a, b, c, d, e, f] = [0, 1, -1, 0, cx + py_pdf, py_pdf - cx]
		doc.saveGraphicsState();
		const m = new (doc as unknown as { Matrix: new (...args: number[]) => unknown }).Matrix(
			0,
			1,
			-1,
			0,
			cx + py_pdf,
			py_pdf - cx
		);
		(doc as unknown as { advancedAPI: (cb: (api: { setCurrentTransformationMatrix: (m: unknown) => void }) => void) => void }).advancedAPI(
			(api) => api.setCurrentTransformationMatrix(m)
		);
		doc.setFontSize(labelSize);
		doc.text(label, cx, cy - lineGap, { align: 'center', baseline: 'middle' });
		doc.setFontSize(dimSize);
		doc.text(dim, cx, cy + lineGap, { align: 'center', baseline: 'middle' });
		doc.restoreGraphicsState();
	} else {
		doc.setFontSize(labelSize);
		doc.text(label, cx, cy - lineGap, { align: 'center', baseline: 'middle' });
		doc.setFontSize(dimSize);
		doc.text(dim, cx, cy + lineGap, { align: 'center', baseline: 'middle' });
	}
}

function sizeLabelToFit(doc: jsPDF, label: string, lengthBudget: number, perpBudget: number): number {
	// Scale by the perpendicular budget (limits font height); also shrink if the
	// label is too long to fit along the reading axis.
	const sizeByPerp = perpBudget * LABEL_FONT_SCALE;
	doc.setFontSize(sizeByPerp);
	const widthAtSize = doc.getTextWidth(label);
	// If text overflows length, scale down proportionally (× 0.95 to leave margin)
	const overflowRatio = widthAtSize / (lengthBudget * 0.95);
	const sizeByLength = overflowRatio > 1 ? sizeByPerp / overflowRatio : sizeByPerp;
	return clamp(Math.min(sizeByPerp, sizeByLength), LABEL_FONT_MIN, LABEL_FONT_MAX);
}

// --- Lumber pages ---

function renderLumberPages(
	doc: jsPDF,
	lumberResult: LumberResult,
	lumberTypes: LumberType[]
): void {
	if (lumberResult.boards.length === 0) return;

	const typeMap = new Map(lumberTypes.map((t) => [t.id, t]));
	const drawW = PAGE_W - 2 * MARGIN;

	// All boards rendered at the same length scale so they're visually comparable.
	const maxLen = lumberResult.boards.reduce((m, b) => Math.max(m, b.boardLength), 0);
	const lengthScale = drawW / Math.max(maxLen, 1);

	const rowH = BOARD_HEADER_H + BOARD_STRIP_H + BOARD_GAP;
	const usableH = PAGE_H - 2 * MARGIN - 0.4; // leave room for page title
	const rowsPerPage = Math.max(1, Math.floor(usableH / rowH));

	doc.addPage();
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.setTextColor(0);
	doc.text('Lumber Cuts', MARGIN, MARGIN + 0.1);

	let y = MARGIN + 0.4;
	let rowIndex = 0;

	for (let i = 0; i < lumberResult.boards.length; i++) {
		if (rowIndex >= rowsPerPage) {
			doc.addPage();
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(14);
			doc.setTextColor(0);
			doc.text('Lumber Cuts (cont.)', MARGIN, MARGIN + 0.1);
			y = MARGIN + 0.4;
			rowIndex = 0;
		}

		const board = lumberResult.boards[i];
		const lt = typeMap.get(board.lumberTypeId);
		const typeName = lt?.name?.trim() || 'Lumber';

		// Header
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(10);
		doc.setTextColor(0);
		doc.text(
			`Board ${i + 1} — ${typeName}, ${board.boardLength}" long, ${board.pieces.length} piece${board.pieces.length === 1 ? '' : 's'}, ${board.wastePercent.toFixed(1)}% waste`,
			MARGIN,
			y + 0.16
		);

		const stripY = y + BOARD_HEADER_H;
		const stripW = board.boardLength * lengthScale;
		// Outline of the full board
		doc.setDrawColor(150);
		doc.setLineWidth(0.01);
		doc.rect(MARGIN, stripY, stripW, BOARD_STRIP_H);

		// Placed pieces along the length
		for (const piece of board.pieces) {
			const px = MARGIN + piece.offset * lengthScale;
			const pw = piece.length * lengthScale;
			const [r, g, b] = hexToRgb(piece.color);
			doc.setFillColor(r, g, b);
			doc.setDrawColor(255);
			doc.setLineWidth(0.005);
			doc.rect(px, stripY, pw, BOARD_STRIP_H, 'FD');

			const [tr, tg, tb] = hexToRgb(getContrastColor(piece.color));
			doc.setTextColor(tr, tg, tb);

			const labelSize = clamp(BOARD_STRIP_H * LABEL_FONT_SCALE, LABEL_FONT_MIN, LABEL_FONT_MAX);
			doc.setFontSize(labelSize);
			doc.text(
				`${piece.label || 'Unnamed'}  (${piece.length}")`,
				px + pw / 2,
				stripY + BOARD_STRIP_H / 2,
				{ align: 'center', baseline: 'middle' }
			);
		}

		y += rowH;
		rowIndex++;
	}
}

// --- Summary / parts list ---

function renderSummaryPage(
	doc: jsPDF,
	pieces: PieceDefinition[],
	lumberPieces: LumberPiece[],
	lumberTypes: LumberType[],
	result: CutlistResult,
	lumberResult: LumberResult
): void {
	doc.addPage();
	doc.setFontSize(16);
	doc.setTextColor(0);
	doc.setFont('helvetica', 'bold');
	doc.text('Parts List', MARGIN, MARGIN);

	const colLabel = MARGIN;
	const colW = MARGIN + 3;
	const colH = MARGIN + 4;
	const colQty = MARGIN + 5;
	const colMaterial = MARGIN + 5.7;
	let y = MARGIN + 0.4;

	// Header row
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.text('Label', colLabel, y);
	doc.text('Width (in)', colW, y);
	doc.text('Length (in)', colH, y);
	doc.text('Qty', colQty, y);
	doc.text('Material', colMaterial, y);
	y += 0.25;

	doc.setFont('helvetica', 'normal');
	for (const piece of pieces) {
		if (piece.width <= 0 || piece.height <= 0 || piece.quantity <= 0) continue;
		doc.text(piece.label || 'Unnamed', colLabel, y);
		doc.text(String(piece.width), colW, y);
		doc.text(String(piece.height), colH, y);
		doc.text(String(piece.quantity), colQty, y);
		doc.text('Plywood', colMaterial, y);
		y = advanceRow(doc, y);
	}

	const typeMap = new Map(lumberTypes.map((t) => [t.id, t]));
	for (const piece of lumberPieces) {
		if (piece.length <= 0 || piece.quantity <= 0) continue;
		const lt = piece.lumberTypeId ? typeMap.get(piece.lumberTypeId) : null;
		doc.text(piece.label || 'Unnamed', colLabel, y);
		doc.text(lt ? String(lt.crossHeight) : '—', colW, y);
		doc.text(String(piece.length), colH, y);
		doc.text(String(piece.quantity), colQty, y);
		doc.text(lt?.name?.trim() || 'Unassigned', colMaterial, y);
		y = advanceRow(doc, y);
	}

	y += 0.3;
	doc.setFont('helvetica', 'bold');
	doc.text(`Total sheets: ${result.totalSheets}`, colLabel, y);
	y += 0.25;
	doc.text(`Sheet waste: ${result.totalWastePercent.toFixed(1)}%`, colLabel, y);
	if (lumberResult.boards.length > 0) {
		y += 0.25;
		doc.text(`Total boards: ${lumberResult.totalBoards}`, colLabel, y);
		y += 0.25;
		doc.text(`Board waste: ${lumberResult.totalWastePercent.toFixed(1)}%`, colLabel, y);
	}
}

function advanceRow(doc: jsPDF, y: number): number {
	const next = y + 0.2;
	if (next > PAGE_H - MARGIN) {
		doc.addPage();
		return MARGIN;
	}
	return next;
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

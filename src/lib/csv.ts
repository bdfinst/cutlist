import type { PieceDefinition } from './types';

export type ParsedPiece = Omit<PieceDefinition, 'id' | 'color'>;

export interface ParseResult {
	pieces: ParsedPiece[];
	warnings: string[];
}

const LABEL_HEADERS = ['label', 'name', 'piece'];
const WIDTH_HEADERS = ['width', 'w'];
const HEIGHT_HEADERS = ['height', 'h', 'length'];
const QTY_HEADERS = ['quantity', 'qty', 'count'];

/** Strip parenthetical suffixes and units: "Width (in)" → "width" */
function normalizeHeader(raw: string): string {
	return raw.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim();
}

function splitCSVRow(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				current += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ',') {
			fields.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current.trim());
	return fields;
}

function detectHeader(fields: string[]): {
	labelIdx: number;
	widthIdx: number;
	heightIdx: number;
	qtyIdx: number;
} | null {
	const normalized = fields.map(normalizeHeader);

	const labelIdx = normalized.findIndex((f) => LABEL_HEADERS.includes(f));
	const widthIdx = normalized.findIndex((f) => WIDTH_HEADERS.includes(f));
	const heightIdx = normalized.findIndex((f) => HEIGHT_HEADERS.includes(f));
	const qtyIdx = normalized.findIndex((f) => QTY_HEADERS.includes(f));

	if (widthIdx !== -1 && heightIdx !== -1) {
		return { labelIdx, widthIdx, heightIdx, qtyIdx };
	}

	// Check if the first row looks numeric in positions 1 and 2 — if so, it's data, not a header
	const col1 = parseFloat(fields[1] ?? '');
	const col2 = parseFloat(fields[2] ?? '');
	if (!isNaN(col1) && !isNaN(col2)) {
		return null; // Not a header row
	}

	return null;
}

export function parseCSV(text: string): ParseResult {
	const lines = text.split(/\r?\n/);
	const pieces: ParsedPiece[] = [];
	const warnings: string[] = [];

	if (lines.length === 0) return { pieces, warnings };

	const firstFields = splitCSVRow(lines[0]);
	const header = detectHeader(firstFields);
	const startRow = header ? 1 : 0;

	const labelIdx = header ? (header.labelIdx >= 0 ? header.labelIdx : -1) : 0;
	const widthIdx = header?.widthIdx ?? 1;
	const heightIdx = header?.heightIdx ?? 2;
	const qtyIdx = header ? (header.qtyIdx >= 0 ? header.qtyIdx : -1) : 3;

	for (let i = startRow; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '') continue;

		const fields = splitCSVRow(line);
		const rowNum = i + 1;

		const widthStr = fields[widthIdx] ?? '';
		const heightStr = fields[heightIdx] ?? '';
		const width = parseFloat(widthStr);
		const height = parseFloat(heightStr);

		if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
			warnings.push(`Row ${rowNum}: invalid dimensions (width="${widthStr}", height="${heightStr}") — skipped`);
			continue;
		}

		const label = labelIdx >= 0 ? (fields[labelIdx] ?? '') : '';
		const qtyRaw = qtyIdx >= 0 ? parseFloat(fields[qtyIdx] ?? '') : NaN;
		const quantity = isNaN(qtyRaw) || qtyRaw < 1 ? 1 : Math.floor(qtyRaw);

		pieces.push({ label, width, height, quantity });
	}

	return { pieces, warnings };
}

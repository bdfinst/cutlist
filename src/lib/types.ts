export interface PieceDefinition {
	id: string;
	label: string;
	width: number;
	height: number;
	quantity: number;
	color: string;
}

export interface PlacedPiece {
	pieceId: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotated: boolean;
	color: string;
}

export interface SheetLayout {
	sheetIndex: number;
	pieces: PlacedPiece[];
	wastePercent: number;
}

export interface SheetConfig {
	width: number;
	height: number;
	kerf: number;
	grainDirection: boolean;
}

export interface CutlistResult {
	sheets: SheetLayout[];
	totalSheets: number;
	totalWastePercent: number;
	unfitPieces: PieceDefinition[];
}

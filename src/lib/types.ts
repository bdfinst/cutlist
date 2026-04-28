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
	/**
	 * Allow cuts to overflow rect dimensions by up to this many inches. The user
	 * accepts that the resulting piece may be undersized by this amount —
	 * physically realized when two adjacent cuts share material that would
	 * otherwise require an extra kerf of slack.
	 */
	oversizeTolerance?: number;
}

export interface CutlistResult {
	sheets: SheetLayout[];
	totalSheets: number;
	totalWastePercent: number;
	unfitPieces: PieceDefinition[];
}

export interface LumberType {
	id: string;
	name: string;
	crossWidth: number;
	crossHeight: number;
	availableLengths: number[];
}

export interface LumberPiece {
	id: string;
	label: string;
	length: number;
	quantity: number;
	lumberTypeId: string | null;
	color: string;
}

export interface PlacedLumberPiece {
	pieceId: string;
	label: string;
	offset: number;
	length: number;
	color: string;
}

export interface BoardLayout {
	boardIndex: number;
	lumberTypeId: string;
	boardLength: number;
	pieces: PlacedLumberPiece[];
	wastePercent: number;
}

export interface LumberResult {
	boards: BoardLayout[];
	totalBoards: number;
	totalWastePercent: number;
	unfitPieces: LumberPiece[];
	unassignedPieces: LumberPiece[];
}

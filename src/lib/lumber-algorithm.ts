import type { LumberPiece, LumberType, PlacedLumberPiece, BoardLayout, LumberResult } from './types';

interface ExpandedLumberPiece {
	id: string;
	label: string;
	length: number;
	lumberTypeId: string;
	color: string;
}

interface Board {
	lumberTypeId: string;
	boardLength: number;
	usedLength: number;
	pieces: PlacedLumberPiece[];
}

type SortStrategy = (a: ExpandedLumberPiece, b: ExpandedLumberPiece) => number;

const SORT_STRATEGIES: SortStrategy[] = [
	// Length descending (First Fit Decreasing)
	(a, b) => b.length - a.length,
	// Length ascending
	(a, b) => a.length - b.length
];

const EPSILON = 0.0001;

export function fitsLumberCrossSection(
	pieceWidth: number,
	pieceHeight: number,
	lumberCrossWidth: number,
	lumberCrossHeight: number
): boolean {
	const normalFit =
		pieceWidth <= lumberCrossWidth + EPSILON && pieceHeight <= lumberCrossHeight + EPSILON;
	const rotatedFit =
		pieceHeight <= lumberCrossWidth + EPSILON && pieceWidth <= lumberCrossHeight + EPSILON;
	return normalFit || rotatedFit;
}

export function calculateLumberCutlist(
	pieces: LumberPiece[],
	lumberTypes: LumberType[],
	kerf: number
): LumberResult {
	const unassignedPieces = pieces.filter((p) => p.lumberTypeId === null);
	const assignedPieces = pieces.filter((p) => p.lumberTypeId !== null);

	// Group by lumber type
	const groupedByType = new Map<string, LumberPiece[]>();
	for (const piece of assignedPieces) {
		const typeId = piece.lumberTypeId!;
		if (!groupedByType.has(typeId)) {
			groupedByType.set(typeId, []);
		}
		groupedByType.get(typeId)!.push(piece);
	}

	const lumberTypeMap = new Map<string, LumberType>();
	for (const lt of lumberTypes) {
		lumberTypeMap.set(lt.id, lt);
	}

	let allBoards: Board[] = [];
	const allUnfitPieces: LumberPiece[] = [];

	for (const [typeId, typePieces] of groupedByType) {
		const lumberType = lumberTypeMap.get(typeId);
		if (!lumberType) continue;

		const expanded = expandLumberPieces(typePieces);

		let bestBoards: Board[] | null = null;
		let bestUnfit: LumberPiece[] | null = null;

		for (const strategy of SORT_STRATEGIES) {
			const sorted = expanded.toSorted(strategy);
			const { boards, unfitPieces } = packBoards(sorted, typePieces, lumberType, kerf);

			if (!bestBoards || isBetterLumberResult(boards, unfitPieces, bestBoards, bestUnfit!)) {
				bestBoards = boards;
				bestUnfit = unfitPieces;
			}
		}

		allBoards = allBoards.concat(bestBoards!);
		allUnfitPieces.push(...bestUnfit!);
	}

	// Build BoardLayout array
	const boardLayouts: BoardLayout[] = allBoards.map((board, i) => {
		const usedLength = board.pieces.reduce((sum, p) => sum + p.length, 0);
		const kerfCount = Math.max(0, board.pieces.length - 1);
		const totalUsed = usedLength + kerfCount * kerf;
		const wastePercent = board.boardLength > 0 ? ((board.boardLength - totalUsed) / board.boardLength) * 100 : 0;

		return {
			boardIndex: i,
			lumberTypeId: board.lumberTypeId,
			boardLength: board.boardLength,
			pieces: board.pieces,
			wastePercent
		};
	});

	const totalBoardLength = boardLayouts.reduce((sum, b) => sum + b.boardLength, 0);
	const totalUsedLength = boardLayouts.reduce((sum, b) => {
		const piecesLen = b.pieces.reduce((s, p) => s + p.length, 0);
		const kerfCount = Math.max(0, b.pieces.length - 1);
		return sum + piecesLen + kerfCount * kerf;
	}, 0);

	return {
		boards: boardLayouts,
		totalBoards: boardLayouts.length,
		totalWastePercent: totalBoardLength > 0 ? ((totalBoardLength - totalUsedLength) / totalBoardLength) * 100 : 0,
		unfitPieces: allUnfitPieces,
		unassignedPieces
	};
}

function isBetterLumberResult(
	boardsA: Board[],
	unfitA: LumberPiece[],
	boardsB: Board[],
	unfitB: LumberPiece[]
): boolean {
	if (unfitA.length !== unfitB.length) {
		return unfitA.length < unfitB.length;
	}
	if (boardsA.length !== boardsB.length) {
		return boardsA.length < boardsB.length;
	}
	// Less total waste
	const wasteA = boardsA.reduce((sum, b) => sum + (b.boardLength - b.usedLength), 0);
	const wasteB = boardsB.reduce((sum, b) => sum + (b.boardLength - b.usedLength), 0);
	return wasteA < wasteB;
}

function expandLumberPieces(pieces: LumberPiece[]): ExpandedLumberPiece[] {
	const result: ExpandedLumberPiece[] = [];
	for (const piece of pieces) {
		if (piece.length <= 0 || piece.quantity <= 0) continue;
		for (let i = 0; i < piece.quantity; i++) {
			result.push({
				id: piece.id,
				label: piece.label,
				length: piece.length,
				lumberTypeId: piece.lumberTypeId!,
				color: piece.color
			});
		}
	}
	return result;
}

function packBoards(
	expanded: ExpandedLumberPiece[],
	originalPieces: LumberPiece[],
	lumberType: LumberType,
	kerf: number
): { boards: Board[]; unfitPieces: LumberPiece[] } {
	const boards: Board[] = [];
	const unfitPieces: LumberPiece[] = [];
	const sortedLengths = lumberType.availableLengths.toSorted((a, b) => a - b);

	for (const piece of expanded) {
		// Try to fit in an existing board
		let placed = false;
		for (const board of boards) {
			const kerfNeeded = board.pieces.length > 0 ? kerf : 0;
			if (board.usedLength + kerfNeeded + piece.length <= board.boardLength + EPSILON) {
				const offset = board.usedLength + kerfNeeded;
				board.pieces.push({
					pieceId: piece.id,
					label: piece.label,
					offset,
					length: piece.length,
					color: piece.color
				});
				board.usedLength = offset + piece.length;
				placed = true;
				break;
			}
		}

		if (!placed) {
			// Open a new board — pick the shortest available length that fits
			const fitLength = sortedLengths.find((len) => piece.length <= len + EPSILON);
			if (fitLength !== undefined) {
				const newBoard: Board = {
					lumberTypeId: lumberType.id,
					boardLength: fitLength,
					usedLength: piece.length,
					pieces: [
						{
							pieceId: piece.id,
							label: piece.label,
							offset: 0,
							length: piece.length,
							color: piece.color
						}
					]
				};
				boards.push(newBoard);
			} else {
				// Piece doesn't fit any available length
				if (!unfitPieces.find((p) => p.id === piece.id)) {
					unfitPieces.push(originalPieces.find((p) => p.id === piece.id)!);
				}
			}
		}
	}

	return { boards, unfitPieces };
}

# Slice 2: Algorithm (Guillotine Bin-Packing)

## Intent Description

Complete and verify the guillotine bin-packing algorithm that takes a list of piece definitions and sheet configuration, then produces an optimized cutting layout. The algorithm expands quantities into individual pieces, sorts by area (largest first), places each piece into the best-fit free rectangle using guillotine splits, handles kerf correctly (no kerf against sheet edges), and optionally allows rotation when grain direction is off. Pieces that cannot fit any sheet are collected in `unfitPieces[]`. This slice is pure logic with no UI — consumed by visualization in a later slice.

## User-Facing Behavior (Gherkin)

```gherkin
Feature: Guillotine Bin-Packing Algorithm

  Scenario: Single piece fits on one sheet
    Given a sheet 48×96 with kerf 0.125
    And a piece "Shelf" 12×24 quantity 1
    When the cutlist is calculated
    Then the result contains 1 sheet
    And the sheet contains 1 placed piece at position (0, 0) with dimensions 12×24

  Scenario: Exact fit fills entire sheet
    Given a sheet 48×96 with kerf 0
    And a piece "Full" 48×96 quantity 1
    When the cutlist is calculated
    Then the result contains 1 sheet with 0% waste

  Scenario: Multiple pieces packed onto one sheet
    Given a sheet 48×96 with kerf 0
    And a piece "A" 24×48 quantity 4
    When the cutlist is calculated
    Then the result contains 1 sheet with 4 placed pieces and 0% waste

  Scenario: Pieces overflow to a second sheet
    Given a sheet 48×96 with kerf 0
    And a piece "Big" 48×96 quantity 2
    When the cutlist is calculated
    Then the result contains 2 sheets with 1 piece each

  Scenario: Piece rotation when grain direction is off
    Given a sheet 48×96 with kerf 0 and grain direction off
    And a piece "Tall" 96×24 quantity 1
    When the cutlist is calculated
    Then the piece is placed rotated as 24×96
    And the result contains 1 sheet

  Scenario: No rotation when grain direction is on
    Given a sheet 48×96 with kerf 0 and grain direction on
    And a piece "Tall" 96×24 quantity 1
    When the cutlist is calculated
    Then the piece is in unfitPieces

  Scenario: Oversized piece collected in unfitPieces
    Given a sheet 48×96 with kerf 0
    And a piece "Huge" 60×100 quantity 1
    When the cutlist is calculated
    Then the result contains 0 sheets
    And unfitPieces contains "Huge"

  Scenario: Kerf consumed between pieces but not at sheet edges
    Given a sheet 48×96 with kerf 0.125
    And a piece "A" 24×96 quantity 2
    When the cutlist is calculated
    Then the first piece is at (0, 0) width 24
    And the second piece is at (24.125, 0) width 24
    And both fit on 1 sheet

  Scenario: Kerf causes overflow to second sheet
    Given a sheet 48×96 with kerf 0.125
    And a piece "A" 24×96 quantity 3
    When the cutlist is calculated
    Then the result contains 2 sheets

  Scenario: Quantity expansion
    Given a piece "Shelf" 12×24 quantity 5
    When the cutlist is calculated
    Then 5 individual placed pieces with label "Shelf" appear across the result sheets

  Scenario: Pieces sorted largest-first
    Given a piece "Small" 6×6 quantity 1
    And a piece "Large" 24×48 quantity 1
    When the cutlist is calculated
    Then "Large" is placed before "Small"
```

## Architecture Specification

**Components affected:**
- `src/lib/algorithm.ts` (exists) — verify/complete the implementation against these scenarios
- `src/lib/algorithm.spec.ts` (new) — Vitest tests covering all scenarios above

**Key algorithm internals:**
- `FreeRectangle` tracks `{ x, y, width, height, isRightEdge, isBottomEdge }` — edge flags determine whether kerf is added on that side
- Effective size consumed: `(pieceWidth + (rightEdge ? 0 : kerf)) × (pieceHeight + (bottomEdge ? 0 : kerf))`
- Guillotine split: after placing a piece, the free rectangle splits into two non-overlapping sub-rects (right-of and below)
- Best-area-fit: among all free rects across all sheets that can contain the piece, pick the one with smallest area (tightest fit)
- New sheet created only when no existing free rect can fit the piece

**Interfaces:** `PieceDefinition`, `PlacedPiece`, `SheetLayout`, `SheetConfig`, `CutlistResult` from `types.ts`

**Constraints:**
- Pure function: `calculateCutlist(pieces: PieceDefinition[], config: SheetConfig): CutlistResult`
- No side effects, no DOM, no Svelte dependencies
- Every test must contain at least one assertion (`expect.requireAssertions` is enabled)

**Dependencies:** `types.ts` (exists)

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Single piece placement | Placed at (0,0) with correct dimensions |
| 2 | Multi-piece packing | Pieces fill sheets efficiently using guillotine splits |
| 3 | Multi-sheet overflow | New sheets created when current sheets are full |
| 4 | Rotation | Pieces rotate to fit when grain direction is off; never rotate when on |
| 5 | Unfit pieces | Pieces exceeding sheet dimensions collected in `unfitPieces[]` |
| 6 | Kerf at cuts only | Kerf added between pieces but not against sheet edges |
| 7 | Kerf overflow | Kerf correctly causes overflow to additional sheets when space is tight |
| 8 | Quantity expansion | `quantity: N` produces N individual placed pieces |
| 9 | Sort order | Largest-area pieces placed first |
| 10 | All Vitest tests pass | `npx vitest run src/lib/algorithm.spec.ts` exits 0 |

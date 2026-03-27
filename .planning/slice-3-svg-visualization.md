# Slice 3: SVG Visualization

## Intent Description

Render the algorithm's output as interactive SVG sheet layouts so users can visually verify their cutting plan. Each sheet is drawn as an SVG with color-coded pieces showing labels and dimensions, kerf gaps visible as thin lines between pieces, and waste areas clearly distinguishable. This slice connects the data entry (Slice 1) to the algorithm (Slice 2) by wiring the `$derived` cutlist computation in the store, then rendering the results. It also adds the results summary (total sheets, waste percentage, unfit piece warnings).

## User-Facing Behavior (Gherkin)

```gherkin
Feature: SVG Sheet Visualization

  Scenario: Single sheet rendered after adding pieces
    Given the user has added pieces and configured a sheet
    When the cutlist is calculated
    Then a sheet layout appears showing colored rectangles for each placed piece

  Scenario: Piece labels and dimensions displayed
    Given a sheet layout is rendered with piece "Shelf" 12×24
    Then the piece rectangle displays the label "Shelf"
    And the piece rectangle displays dimensions "12 × 24"

  Scenario: Color coding matches piece order
    Given pieces "Shelf" and "Side Panel" are placed
    Then "Shelf" uses the first color from the palette
    And "Side Panel" uses the second color from the palette

  Scenario: Rotated piece shows rotated indicator
    Given a piece is placed with rotated = true
    Then the piece label includes a rotation indicator

  Scenario: Multiple sheets rendered separately
    Given the cutlist result contains 3 sheets
    Then 3 separate sheet layouts are rendered
    And each sheet shows its index number

  Scenario: Sheet summary statistics
    Given a sheet layout is rendered
    Then the sheet header shows "Sheet N" and waste percentage

  Scenario: Overall results summary
    Given the cutlist result contains 2 sheets with 15% total waste
    Then the results summary shows "2 sheets" and "15% waste"

  Scenario: Unfit pieces warning
    Given the cutlist result contains unfit pieces
    Then a warning lists the pieces that could not be placed

  Scenario: Responsive scaling
    Given the browser window is narrow
    Then the SVG scales down proportionally without clipping

  Scenario: Empty state when no pieces added
    Given the piece list is empty
    Then no sheet layouts are shown
    And a message indicates the user should add pieces

  Scenario: Reactive update on input change
    Given a sheet layout is displayed
    When the user changes a piece dimension
    Then the layout re-renders with the updated cutlist
```

## Architecture Specification

**Components affected:**
- `src/lib/stores.svelte.ts` (modify) — add `$derived` that calls `calculateCutlist(pieces, config)` and exposes the `CutlistResult`
- `src/lib/components/SheetSVG.svelte` (new) — pure SVG rendering of a single sheet; receives `SheetLayout` and `SheetConfig` as props; draws sheet outline, placed piece rectangles with fill colors, labels, dimensions, and kerf gaps
- `src/lib/components/LayoutPreview.svelte` (new) — wraps `SheetSVG` with a header showing sheet index and waste percentage
- `src/lib/components/LayoutResults.svelte` (new) — renders all sheets via `LayoutPreview`, shows overall summary (total sheets, total waste), warns about unfit pieces
- `src/routes/+page.svelte` (modify) — add `LayoutResults` to the page alongside the input panel

**SVG structure (SheetSVG):**
- `viewBox="0 0 {config.width} {config.height}"` with `preserveAspectRatio="xMidYMid meet"`
- Sheet outline: `<rect>` with stroke, no fill (or light background)
- Each placed piece: `<rect>` filled with color from `colors.ts`, `<text>` for label centered in piece, `<text>` for dimensions below label
- Font size scales relative to piece dimensions to remain readable

**Data flow:**
- `stores.svelte.ts` imports `calculateCutlist` from `algorithm.ts`
- `$derived` recomputes on any change to pieces or config
- Components read from the store, no prop drilling of raw pieces/config to results

**Constraints:**
- SheetSVG is a pure presentational component — no state, no store imports, only props
- LayoutResults reads from the store directly
- No canvas or rasterization — vector SVG only
- Colors assigned by piece index order via `colors.ts` palette

**Dependencies:** `types.ts`, `algorithm.ts`, `colors.ts`, `stores.svelte.ts` (all exist)

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Store wiring | `$derived` cutlist recomputes when pieces or config change |
| 2 | SVG rendering | Each sheet renders as an inline SVG with correct viewBox |
| 3 | Piece rectangles | Placed pieces appear as colored rectangles at correct (x, y) positions and dimensions |
| 4 | Labels visible | Each piece shows its label and dimensions as text |
| 5 | Color consistency | Piece colors match the palette order from `colors.ts` |
| 6 | Multi-sheet display | Each sheet in the result renders as a separate `LayoutPreview` |
| 7 | Summary stats | Total sheets and total waste percentage displayed |
| 8 | Unfit warning | Unfit pieces listed with a visible warning when present |
| 9 | Responsive | SVG scales with container width, no horizontal overflow |
| 10 | Empty state | Message shown when no pieces are defined |
| 11 | Reactivity | Changing any input immediately updates the visualization |

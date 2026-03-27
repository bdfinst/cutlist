# Slice 4: PDF Export

## Intent Description

Add a "Download PDF" button that generates a vector PDF matching the SVG preview. Each sheet gets its own landscape letter-size page with the same color-coded piece layout, labels, and dimensions. A final summary page lists all pieces with their quantities. The PDF is generated client-side using jsPDF with no server round-trip. This gives woodworkers a printable shop document they can take to the workshop.

## User-Facing Behavior (Gherkin)

```gherkin
Feature: PDF Export

  Scenario: Download PDF button visible when results exist
    Given the cutlist result contains at least 1 sheet
    Then a "Download PDF" button is visible in the results area

  Scenario: Download PDF button hidden when no results
    Given the piece list is empty
    Then no "Download PDF" button is shown

  Scenario: Clicking download generates a PDF
    Given the cutlist result contains 2 sheets
    When the user clicks "Download PDF"
    Then a PDF file is downloaded

  Scenario: One page per sheet
    Given the cutlist result contains 3 sheets
    When the PDF is generated
    Then the PDF contains at least 3 pages

  Scenario: Piece layout matches SVG preview
    Given a sheet has piece "Shelf" at position (0, 0) with dimensions 12×24 in color #4E79A7
    When the PDF is generated
    Then the corresponding page draws a rectangle at the scaled position with the same color

  Scenario: Piece labels and dimensions in PDF
    Given a placed piece "Shelf" 12×24
    When the PDF is generated
    Then the piece rectangle contains text "Shelf" and "12 × 24"

  Scenario: Summary page with parts list
    Given pieces "Shelf" quantity 3 and "Side Panel" quantity 2
    When the PDF is generated
    Then the final page lists "Shelf" with quantity 3 and "Side Panel" with quantity 2

  Scenario: Landscape letter orientation
    When the PDF is generated
    Then each sheet page uses landscape letter size (11 × 8.5 inches)
```

## Architecture Specification

**Components affected:**
- `src/lib/pdf.ts` (new) — `generatePDF(result: CutlistResult, config: SheetConfig, pieces: PieceDefinition[]): void` — creates and triggers download of the PDF
- `src/lib/components/LayoutResults.svelte` (modify) — add "Download PDF" button that calls `generatePDF` with current result, config, and pieces from the store

**PDF structure (pdf.ts):**
- jsPDF instance: `new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' })`
- Scale factor: `min(10 / config.width, 7.5 / config.height)` — fits sheet drawing within printable area with margins
- Per sheet page: sheet outline rect, then each placed piece as `doc.setFillColor()` + `doc.rect()` with fill, then label + dimensions as `doc.text()` centered in the piece rect
- Summary page (last): table of piece labels, dimensions, quantities
- Trigger download via `doc.save('cutlist.pdf')`

**Constraints:**
- Pure function — no DOM manipulation beyond the jsPDF download trigger
- Uses the same color values from `colors.ts` as the SVG rendering
- Vector drawing only — no `html2canvas` or rasterization
- Font size scales with piece dimensions, clamped to remain readable at small sizes

**Dependencies:** `jspdf` (npm package), `types.ts`, `colors.ts`

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Button visibility | "Download PDF" shown only when cutlist result has sheets |
| 2 | PDF downloads | Clicking the button triggers a file download |
| 3 | Page count | PDF has one page per sheet plus one summary page |
| 4 | Layout fidelity | Piece positions and colors match the SVG preview |
| 5 | Labels present | Each piece rectangle contains label and dimension text |
| 6 | Summary page | Final page lists all piece definitions with quantities |
| 7 | Landscape letter | Pages are 11×8.5 inches landscape |
| 8 | Vector output | PDF uses vector drawing, not rasterized images |
| 9 | No server dependency | PDF generated entirely client-side |

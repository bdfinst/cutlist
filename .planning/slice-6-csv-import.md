# Slice 6: CSV Import for Cut Pieces

## Intent Description

Add a CSV file import so users can bulk-load piece definitions from a spreadsheet instead of manually entering them one at a time. The user clicks an "Import CSV" button, selects a file, and the app parses each row into a piece (label, width, height, quantity), validates the data, and adds the pieces to the existing list. This is especially useful for woodworkers who plan their projects in a spreadsheet. Malformed rows are reported as warnings rather than silently dropped.

## User-Facing Behavior (Gherkin)

```gherkin
Feature: CSV Import

  Scenario: Import a valid CSV with headers
    Given the piece list is empty
    When the user imports a CSV file containing:
      | label       | width | height | quantity |
      | Shelf       | 12    | 24     | 3        |
      | Side Panel  | 24    | 48     | 2        |
    Then the piece list contains "Shelf" (12×24, qty 3) and "Side Panel" (24×48, qty 2)

  Scenario: Import appends to existing pieces
    Given the piece list contains "Shelf"
    When the user imports a CSV with "Side Panel"
    Then the piece list contains both "Shelf" and "Side Panel"

  Scenario: Import CSV without headers
    Given a CSV file with no header row, just data rows
    When the user imports the file
    Then each row is parsed as label, width, height, quantity in column order

  Scenario: Import CSV with quantity column omitted
    Given a CSV where rows have only label, width, height
    When the user imports the file
    Then each piece defaults to quantity 1

  Scenario: Skip rows with invalid dimensions
    Given a CSV with a row where width is "abc"
    When the user imports the file
    Then the valid rows are imported
    And a warning lists the skipped rows

  Scenario: Skip empty rows
    Given a CSV with blank lines between data rows
    When the user imports the file
    Then blank rows are ignored without warnings

  Scenario: Import button is visible
    Then an "Import CSV" button is visible in the pieces section
```

## Architecture Specification

**Components affected:**
- `src/lib/csv.ts` (new) — `parseCSV(text: string): { pieces: ParsedPiece[]; warnings: string[] }`
- `src/lib/components/PieceList.svelte` (modify) — add Import CSV button, file input, warning display
- `src/lib/stores.svelte.ts` (no change)

**CSV parsing rules:**
- Delimiter: comma
- Header detection: first row treated as header if width/height columns contain non-numeric values
- Column mapping by name (case-insensitive): label/name/piece, width/w, height/h, quantity/qty/count
- Positional fallback: 0=label, 1=width, 2=height, 3=quantity (optional)
- Invalid width/height rows skipped with warning
- Quantity defaults to 1 if missing or invalid
- Empty rows silently skipped
- Standard CSV quoting supported

**Constraints:**
- Pure function in csv.ts
- File reading via FileReader in component
- No external CSV library
- Warnings displayed temporarily in UI

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Import button visible | "Import CSV" button shown in pieces section |
| 2 | File picker | Clicking button opens file dialog filtered to .csv |
| 3 | Valid CSV parsed | Rows with valid label, width, height added as pieces |
| 4 | Appends to existing | Imported pieces added alongside existing pieces |
| 5 | Header detection | CSV with header row maps columns by name |
| 6 | No-header fallback | CSV without headers uses positional columns |
| 7 | Quantity default | Missing quantity defaults to 1 |
| 8 | Invalid rows skipped | Non-numeric dimensions produce warnings, not crashes |
| 9 | Empty rows ignored | Blank lines silently skipped |
| 10 | Warnings shown | Skipped rows listed in a dismissible warning |
| 11 | Vitest tests pass | parseCSV unit tests cover all scenarios |

# Slice 5: Polish (Validation, Persistence, Responsive)

## Intent Description

Harden the app for real-world use. Add input validation so invalid dimensions are caught before hitting the algorithm, persist pieces and config to localStorage so users don't lose work on refresh, make the layout responsive so it works on phones and tablets, and add utility controls (reset button, clear all). This is the final slice that turns the functional prototype into a usable tool.

## User-Facing Behavior (Gherkin)

```gherkin
Feature: Input Validation

  Scenario: Reject zero or negative dimensions
    Given the user enters width 0 for a piece
    Then an error message appears on that input
    And the piece is not sent to the algorithm

  Scenario: Reject non-numeric input
    Given the user enters "abc" in the width field
    Then an error message appears on that input

  Scenario: Reject zero or negative kerf
    Given the user enters kerf -0.5
    Then an error message appears on the kerf input

  Scenario: Reject zero or negative sheet dimensions
    Given the user enters sheet width 0
    Then an error message appears on the sheet width input

  Scenario: Reject piece larger than sheet with helpful message
    Given sheet is 48×96
    And the user enters a piece 60×100
    Then a warning indicates the piece exceeds sheet dimensions

  Scenario: Valid inputs show no errors
    Given all piece dimensions and sheet config are positive numbers
    Then no error messages are displayed

Feature: localStorage Persistence

  Scenario: Pieces survive page refresh
    Given the user has added pieces "Shelf" and "Side Panel"
    When the user refreshes the page
    Then the piece list still contains "Shelf" and "Side Panel"

  Scenario: Sheet config survives page refresh
    Given the user has set sheet width to 24 and kerf to 0.25
    When the user refreshes the page
    Then the sheet config shows width 24 and kerf 0.25

  Scenario: Fresh start with no saved data
    Given localStorage has no cutlist data
    When the app loads
    Then defaults are used: empty piece list, 48×96 sheet, 0.125 kerf, grain off

Feature: Reset

  Scenario: Reset clears all data
    Given the user has added pieces and changed sheet config
    When the user clicks "Reset"
    Then the piece list is empty
    And the sheet config returns to defaults
    And localStorage is cleared

Feature: Responsive Layout

  Scenario: Desktop shows side-by-side layout
    Given the viewport is wider than 768px
    Then the input panel and results panel are shown side by side

  Scenario: Mobile stacks panels vertically
    Given the viewport is narrower than 768px
    Then the input panel appears above the results panel

  Scenario: SVG sheets scale to container width on mobile
    Given the viewport is narrow
    Then sheet SVGs scale down without horizontal scrolling
```

## Architecture Specification

**Components affected:**
- `src/lib/stores.svelte.ts` (modify) — add localStorage read on init, `$effect` to write pieces and config to localStorage on change, `reset()` function that clears state and localStorage
- `src/lib/components/PieceInput.svelte` (modify) — add inline validation: red border + error text for invalid dimensions/quantity
- `src/lib/components/SheetConfig.svelte` (modify) — add inline validation for sheet dimensions and kerf
- `src/lib/components/PieceList.svelte` (modify) — add "Reset" button
- `src/routes/+page.svelte` (modify) — responsive layout using Tailwind breakpoint classes (`flex-col md:flex-row`)

**Validation approach:**
- Validate at the input level — each field checks `value > 0` and `!isNaN(value)`
- Store holds a `$derived` validity flag; algorithm only runs when all inputs are valid
- Validation is visual only (red borders, inline messages), not blocking — user can still edit

**Persistence approach:**
- Single localStorage key `cutlist-data` storing `{ pieces, config }` as JSON
- Read on store initialization with fallback to defaults
- `$effect` writes on every change (debounce not needed for this data volume)
- `reset()` calls `localStorage.removeItem('cutlist-data')` and resets `$state` to defaults

**Responsive approach:**
- Tailwind `flex-col md:flex-row` on the main page container
- Input panel and results panel each take `w-full md:w-1/2`
- SVG already handles scaling via `preserveAspectRatio` (done in Slice 3)

**Constraints:**
- No new dependencies
- Validation messages use Tailwind utility classes, no toast library
- localStorage is best-effort — app works without it (private browsing)
- `$effect` for persistence, not `$inspect` or manual event handlers

**Dependencies:** All prior slices (1-4) complete

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Zero/negative rejection | Error shown, algorithm skipped for invalid dimensions |
| 2 | Non-numeric rejection | Error shown for non-numeric input |
| 3 | Valid inputs clean | No error indicators when all values are valid positive numbers |
| 4 | Piece persistence | Pieces present after page refresh |
| 5 | Config persistence | Sheet config preserved after page refresh |
| 6 | Fresh load defaults | Correct defaults when no localStorage data exists |
| 7 | Reset clears all | Reset empties pieces, restores config defaults, clears localStorage |
| 8 | Desktop side-by-side | Panels adjacent above 768px viewport |
| 9 | Mobile stacked | Panels stacked below 768px viewport |
| 10 | No horizontal scroll | No overflow on mobile viewports |

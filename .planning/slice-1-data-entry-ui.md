# Slice 1: Reactive State + Data Entry UI

## Intent Description

Add the reactive state layer and data entry UI so users can define the pieces they need cut and configure sheet properties. This is the input side of the app — no output/visualization yet. Users add/remove piece definitions (label, width, height, quantity), configure sheet dimensions (width, height, kerf, grain direction), and the app holds this state reactively using Svelte 5 runes. This slice makes the app interactive and provides the data that downstream slices (algorithm, visualization) consume.

## User-Facing Behavior (Gherkin)

```gherkin
Feature: Piece Entry

  Scenario: Add a piece
    Given the piece list is empty
    When the user enters label "Shelf" width 12 height 24 quantity 3
    And clicks "Add Piece"
    Then the piece list contains one entry "Shelf" with dimensions 12×24 and quantity 3

  Scenario: Add multiple pieces
    Given the piece list contains "Shelf"
    When the user adds a piece "Side Panel" with width 24 height 48 quantity 2
    Then the piece list contains 2 entries

  Scenario: Remove a piece
    Given the piece list contains "Shelf" and "Side Panel"
    When the user clicks remove on "Shelf"
    Then the piece list contains only "Side Panel"

  Scenario: Edit piece inline
    Given the piece list contains "Shelf" with width 12
    When the user changes the width to 14
    Then the piece list shows "Shelf" with width 14

  Scenario: Default empty state
    Given the app has just loaded
    Then the piece list is empty
    And the sheet config shows defaults: 48×96, kerf 0.125, grain direction off

Feature: Sheet Configuration

  Scenario: Change sheet dimensions
    Given sheet config shows 48×96
    When the user changes width to 24 and height to 48
    Then the sheet config reflects 24×48

  Scenario: Toggle grain direction
    Given grain direction is off
    When the user toggles grain direction on
    Then grain direction shows as enabled

  Scenario: Adjust kerf
    Given kerf is 0.125
    When the user changes kerf to 0.25
    Then the sheet config reflects kerf 0.25
```

## Architecture Specification

**Components affected:**
- `src/lib/stores.svelte.ts` (new) — centralized `$state` for pieces array and sheet config, `$derived` for cutlist result (wired in a later slice)
- `src/lib/components/PieceInput.svelte` (new) — single row: label, width, height, quantity inputs + remove button
- `src/lib/components/PieceList.svelte` (new) — renders list of `PieceInput` rows + "Add Piece" button
- `src/lib/components/SheetConfig.svelte` (new) — inputs for width, height, kerf, grain direction toggle
- `src/routes/+page.svelte` (modify) — compose PieceList and SheetConfig side by side

**Interfaces consumed:** `PieceDefinition`, `SheetConfig` from `types.ts` (already exist)

**Constraints:**
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$bindable`)
- All dimensions in inches
- No algorithm integration in this slice — stores expose pieces and config but do not call `calculateCutlist()` yet
- Each `PieceDefinition` gets a unique `id` (crypto.randomUUID or counter)
- Color assignment uses index into the palette from `colors.ts`

**Dependencies:** `types.ts` (exists), `colors.ts` (exists)

## Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Piece CRUD | User can add, edit inline, and remove pieces; list reflects changes immediately |
| 2 | Sheet config | Width, height, kerf, grain direction are editable and reactive |
| 3 | Defaults | On fresh load: empty piece list, sheet 48×96, kerf 0.125, grain off |
| 4 | State reactivity | Changing any input updates the store without page reload |
| 5 | Unique IDs | Each piece has a unique ID that persists across edits |
| 6 | No algorithm coupling | Stores expose pieces/config but do not import or call algorithm.ts |
| 7 | Tailwind styling | All components use Tailwind classes, no inline styles or separate CSS files |

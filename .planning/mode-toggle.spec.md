# Spec: Plywood / Lumber / Both Mode Toggle (Slice B)

Status: **Consistency gate PASSED** — ready for planning.

Slice: single vertical slice, IA reshape only — adds a mode selector at the
top of the input rail and conditionally renders the plywood vs lumber UI
based on the selected mode. No new functional behavior, no algorithm
changes, no aesthetic changes (Slice C handles those). Branch:
`feat/mode-toggle` off `main` (independent of Slice A and Slice C; can
land in any order).

---

## 1. Intent Description

Cutlist supports two cutting workflows: panel goods (plywood, MDF, sheet
goods) and dimensional lumber (1×4, 2×4 boards). Today both UIs render
simultaneously, so any user always sees three input sections (plywood
pieces, lumber types, lumber pieces) and two output sections (plywood
layout, lumber layout) — even when their project only uses one. This adds
visual noise and makes the empty-state hero from Slice A compete with
unrelated lumber empty cards.

This slice adds a small mode selector at the top of the input rail with
three options: **Plywood**, **Lumber**, **Both**. The selected mode
determines which input and output panels render. Mode persists in
`localStorage` alongside the existing pieces/config state so a user's
choice survives page reloads. A first-time visitor with no persisted
state defaults to **Plywood**. An existing visitor whose persisted state
includes any lumber data is auto-set to **Both** on first load after the
upgrade so their existing project doesn't visually disappear.

CSV imports do **not** auto-switch mode in v1 — the user picks the mode,
the import buttons only appear for whichever category the mode shows.

---

## 2. User-Facing Behavior (Gherkin)

```gherkin
Feature: Plywood / Lumber / Both mode toggle

  Scenario: First-time visitor sees the Plywood mode by default
    Given I have never visited the app before
    When I load the page
    Then the mode selector shows three buttons: "Plywood", "Lumber", "Both"
    And "Plywood" is the active selection
    And only the plywood input sections (Sheet config, Pieces) are visible
    And only the plywood layout output is visible
    And the lumber input sections are not present in the DOM

  Scenario: Existing visitor with lumber data is migrated to Both
    Given I have persisted state containing at least one lumber type or one lumber piece
    And the persisted state predates this slice (no `mode` field)
    When I load the page after the upgrade
    Then the mode is set to "Both"
    And both plywood and lumber input sections are visible

  Scenario: Existing visitor with only plywood data is migrated to Plywood
    Given I have persisted state with plywood pieces but no lumber data
    And the persisted state predates this slice
    When I load the page after the upgrade
    Then the mode is set to "Plywood"

  Scenario: Switching to Lumber hides the plywood sections
    Given I am in Plywood mode with imported pieces
    When I click the "Lumber" mode button
    Then the Pieces input section is removed from the DOM
    And the plywood layout output is removed
    And the Lumber Types and Lumber Pieces input sections are visible
    And the lumber layout output is visible
    And my plywood pieces remain in the store and are restored when I switch back

  Scenario: Switching to Both shows everything
    Given I am in Plywood or Lumber mode
    When I click the "Both" mode button
    Then both plywood and lumber input sections are visible simultaneously

  Scenario: Mode persists across reloads
    Given I have selected Lumber mode
    When I reload the page
    Then the mode is still Lumber

  Scenario: Sheet configuration is hidden in Lumber-only mode
    Given I am in Lumber mode
    Then the Sheet width / length inputs are not visible
    And a minimal Kerf input is visible (since the lumber algorithm uses kerf)
    And changing the kerf still updates store.config.kerf

  Scenario: Sheet configuration is visible in Plywood and Both modes
    Given I am in Plywood mode (or Both)
    Then the full Sheet configuration (width, length, kerf, lock grain, allow tight pairings) is visible

  Scenario: CSV import does not change the mode
    Given I am in Plywood mode
    When I import a CSV containing both plywood and lumber rows
    Then the toast confirms only the plywood pieces imported
    And the mode remains Plywood
    And lumber rows from the CSV are not silently added to lumberPieces
    (because the lumber Import CSV button is not visible to be clicked in this mode)

  Scenario: Mode selector is keyboard accessible
    Given I have focused the mode selector via Tab
    Then I can move between the three options with the keyboard
    And pressing Enter or Space activates the focused option
    And the selected option is announced to assistive technology

  Scenario: Mode selector reflects the current selection visually
    Given the current mode is Plywood
    Then the "Plywood" button has visibly different styling from the others
    (e.g. filled background or distinct border, plus aria-pressed="true")
    And only one mode button is the active selection at any time
```

---

## 3. Architecture Specification

### Type and store changes

- **New type** in `src/lib/types.ts`:
  ```ts
  export type CutlistMode = 'plywood' | 'lumber' | 'both';
  ```
- **Store** (`src/lib/stores.svelte.ts`):
  - New field: `mode = $state<CutlistMode>('plywood')`.
  - New action: `setMode(mode: CutlistMode): void`.
  - **Hydration migration**: in `#hydrate()`, if persisted state has a `mode` field, use it. If absent (pre-slice persisted state), pick:
    - `'both'` if `data.lumberTypes.length > 0 || data.lumberPieces.length > 0`
    - `'plywood'` otherwise
  - Persisted state schema (`src/lib/persistence.ts`) gains an optional `mode?: CutlistMode` field; the persistence write now serializes `store.mode`. Reads tolerate missing field (handled by hydrate-time migration above).

### Mode selector component

- **New** `src/lib/components/ModeSelector.svelte`:
  - Renders a three-button segmented control labeled "Plywood", "Lumber", "Both".
  - Active button uses filled treatment (`bg-plywood text-shop-dark`); inactive buttons use the existing `btnGhost` style.
  - Each button has `aria-pressed={isActive}` so screen readers announce state.
  - Clicking a button calls `store.setMode(value)`.
  - The container has `role="group"` with `aria-label="Cutlist mode"`.

### Conditional rendering

- **`src/routes/+page.svelte`** (the input rail and the output panel):
  - Render `<ModeSelector />` at the top of the left rail, above `<SheetConfig />`.
  - Wrap `<SheetConfig />` and `<PieceList />` in `{#if store.mode !== 'lumber'}…{/if}` so they hide in Lumber-only mode.
  - Wrap `<LumberTypeList />` and `<LumberPieceList />` in `{#if store.mode !== 'plywood'}…{/if}` so they hide in Plywood-only mode.
  - Wrap `<LayoutResults />` in `{#if store.mode !== 'lumber'}…{/if}`.
  - Wrap `<LumberResults />` in `{#if store.mode !== 'plywood'}…{/if}`.
  - In Lumber-only mode, render a minimal `<KerfInput />` component above the Lumber sections so the user can still adjust kerf (the lumber algorithm consumes `config.kerf`).
  - The horizontal-rule dividers between sections only render where the adjacent sections are both visible.

### Minimal kerf input for Lumber mode

- **New** `src/lib/components/KerfInput.svelte`:
  - One labeled numeric input bound to `store.config.kerf`, mirroring the existing kerf input inside `SheetConfig.svelte` (same step, same min, same styling).
  - Clearly labeled "Kerf" with a `(in)` unit.

### Files touched

- **New**: `src/lib/components/ModeSelector.svelte`, `src/lib/components/KerfInput.svelte`
- **Modified**:
  - `src/lib/types.ts` — `CutlistMode` type
  - `src/lib/stores.svelte.ts` — `mode` state, `setMode` action, hydration migration
  - `src/lib/persistence.ts` — schema gains optional `mode`
  - `src/routes/+page.svelte` — mount `<ModeSelector />`, conditional `{#if}` wrappers around the four section components, conditional `<KerfInput />`
- **Tests**: store-mode unit tests, persistence migration unit tests

### Constraints

- No algorithm changes, no API changes to existing components.
- Plywood / lumber data is **not** deleted when switching modes — only hidden. Switching back restores the prior data.
- The mode selector and KerfInput inherit the chrome aesthetic from whatever Slice C delivers when it lands. This slice uses the existing button utility classes and won't cherry-pick blueprint styling.
- `prefers-reduced-motion: reduce` is honored for any switch transition (and currently no transition is added — the {#if} swap is instant).

### Out of scope

- Auto-switching mode based on imported CSV content
- A "what's this?" tooltip explaining each mode
- Keeping a per-mode independent copy of `config` (kerf is shared across modes)
- Changing the mode selector's wording or replacing the segmented control with tabs
- Aesthetic refresh of the selector itself (Slice C territory)
- Hiding the donate button or any cross-cutting chrome based on mode

---

## 4. Acceptance Criteria

Functional:
- [ ] On a fresh visitor (no persisted state), `mode` is `'plywood'`, the mode selector shows Plywood as active, only plywood UI renders.
- [ ] An existing visitor whose persisted state has lumber data is migrated to `mode='both'`; existing plywood-only visitors are migrated to `mode='plywood'`.
- [ ] Clicking the "Lumber" button hides plywood inputs and outputs and shows lumber inputs and outputs; switching back restores the plywood UI with prior data intact.
- [ ] The selected mode persists across `location.reload()`.
- [ ] In Lumber mode, the SheetConfig component is not rendered, but a kerf input is visible and updates `store.config.kerf`.
- [ ] In Plywood and Both modes, the full SheetConfig (width, length, kerf, lock grain, allow tight pairings) is visible.
- [ ] CSV imports do not auto-change the mode; only the visible category's import button is functional.

Persistence / migration:
- [ ] A persisted blob without `mode` and without lumber data hydrates to `mode='plywood'`.
- [ ] A persisted blob without `mode` and with `lumberTypes.length > 0` hydrates to `mode='both'`.
- [ ] A persisted blob with `mode='lumber'` hydrates back to lumber mode.

Accessibility / UX:
- [ ] The mode selector has `role="group"` with `aria-label="Cutlist mode"`.
- [ ] Each button has `aria-pressed` reflecting state.
- [ ] The buttons are reachable via Tab and activate with Enter/Space.
- [ ] Keyboard focus is visible on the selector buttons.

Quality:
- [ ] All existing Vitest suites still pass.
- [ ] New Vitest tests cover: `setMode` updates state and persistence, the hydrate-time migration logic.
- [ ] `npm run check` passes.
- [ ] No new dependencies.
- [ ] Manual at 360 / 768 / 1440 px: visit empty (Plywood default), import closet CSV, switch to Lumber (plywood UI gone, lumber empty, kerf input present), back to Both, reload (mode persists).

---

## Consistency Gate

- [x] Intent unambiguous — mode selector with three states, exhaustive coverage of which sections render in which mode.
- [x] Every behavior in intent has at least one Gherkin scenario.
- [x] Architecture constrained to two new components, one type, four `{#if}` wrappers, and a hydration migration.
- [x] Naming consistent: `CutlistMode`, `'plywood' | 'lumber' | 'both'`, `setMode`, `<ModeSelector>`, `<KerfInput>`, `mode`.
- [x] No artifact contradicts another.

**Verdict: PASS.** Ready for `/agentic-dev-team:plan`.

---

## Decisions log

- **Three modes** (Plywood / Lumber / Both), segmented control. Confirmed by maintainer earlier in the conversation.
- **Default for new visitors**: `'plywood'`.
- **Migration default**: detect existing lumber data and pick `'both'` to avoid hiding existing user content. Plywood-only persisted state migrates to `'plywood'`.
- **CSV import does not switch mode** in v1. Only the active category's import button exists, so the user can't accidentally land on a list that hides what they just imported.
- **Kerf is shared** across modes; in Lumber-only mode, a minimal `<KerfInput>` exposes that single field instead of the full SheetConfig.
- **Mode selector is plain Tailwind** (`btnPrimary` / `btnGhost`) for now. Blueprint styling (hairlines, corner ticks) lives in Slice C and would apply to this selector too if the maintainer wants in a follow-up.
- **No auto-deletion** of hidden data. Lumber pieces stay in the store while in Plywood mode; they reappear if the user switches back.

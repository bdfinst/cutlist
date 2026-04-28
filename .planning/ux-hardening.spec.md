# Spec: UX Hardening — Imported-Cutlist Experience (Slice A)

Status: **Consistency gate PASSED** — ready for planning.

Slice: **single vertical slice** focused on making the imported-cutlist
experience not feel broken. Aesthetic refresh (Direction A blueprint) is
Slice C; plywood/lumber mode toggle is Slice B. Branch: `feat/ux-hardening`
off `main`.

---

## 1. Intent Description

After importing a real cutlist (the closet example or any non-trivial CSV),
several rough edges show up at every viewport: piece labels truncate
("Adjustable S"), decimal dimensions clip ("24.7!"), the sticky page header
hides the "Sheet 1" caption when the user scrolls into the layout, the first
load shows three competing empty cards, summary stats are duplicated, the
"Download PDF" button is under-merchandised, the import has no
acknowledgement, and the high-value "Ways to reduce waste" suggestion is
buried.

This slice fixes those rough edges without changing the underlying feature
set, the brand chrome, or the information architecture (no plywood/lumber
mode toggle yet — that's Slice B). The result: the existing app feels
finished at every viewport size for any reasonable input.

---

## 2. User-Facing Behavior (Gherkin)

```gherkin
Feature: Hardened imported-cutlist experience

  Scenario: Long piece labels remain fully readable
    Given I have imported a CSV containing a piece named "Hanger Center Divider"
    When I view the piece list at any viewport width from 360 px upward
    Then the full piece name is readable without manual interaction
    And labels never silently clip without an accessible alternative
    (e.g. a tooltip, a 2-row card, or a wider label column)

  Scenario: Decimal dimensions display without clipping
    Given I have imported a piece with length 24.75
    When I view the piece list at any viewport width from 360 px upward
    Then the dimension input shows "24.75" without any character cut off
    And the same is true for values up to 5 visible characters such as 23.875

  Scenario: Sheet caption is visible when navigated to
    Given I am scrolling toward a "Sheet N" caption (via wheel, touch, anchor link, or keyboard)
    When the caption stops at the top of the viewport
    Then the caption is fully visible and not occluded by the sticky page header

  Scenario: First-load empty state focuses the primary action
    Given I am on the page with no pieces, lumber types, or lumber pieces configured
    Then I see one prominent area inviting me to add plywood pieces
    And that area exposes Add piece, Import CSV, and Example CSV controls together
    And the lumber sections are present but visually de-emphasized
    (smaller text, no large dashed empty card, no equal-weight competition with the plywood empty state)
    And the page does not show three "no X yet" cards of equal size and weight

  Scenario: Summary stats appear in only one place
    Given I have imported pieces and the layout has rendered
    Then the totals (pieces, sheets, waste %) appear once, in the layout summary card
    And the page header does not carry a duplicate stats strip on any viewport

  Scenario: Download PDF is the dominant action after a layout renders
    Given I have at least one rendered sheet
    Then the "Download PDF" control is the most visually prominent CTA in the summary area
    (filled, primary color, larger than peer controls, has an icon affordance)
    And after I scroll past the first sheet, a sticky floating "Download PDF"
    button is visible without scrolling back up
    And the floating button hides itself when the summary card is back in view

  Scenario: CSV import is acknowledged
    Given I import a CSV file named "closet_cutlist_final.csv" containing 22 valid rows
    When the import completes
    Then I see a transient confirmation message naming the file and the count
    (for example: "Imported 22 pieces from closet_cutlist_final.csv")
    And the message is announced to assistive technology via aria-live="polite"
    And the message dismisses itself after about 5 seconds
    And it is also dismissable via a close control

  Scenario: CSV import warns about skipped rows
    Given I import a CSV file with 22 valid rows and 3 invalid rows
    Then the confirmation message reports both counts
    (for example: "Imported 22 pieces from closet_cutlist_final.csv. 3 rows skipped.")

  Scenario: Reducing-waste suggestion is actionable
    Given the optimizer has produced a suggestion with at least one concrete action
    (a TrimSuggestion, a ConfigSuggestion such as enabling tight pairings, or a PairingHint)
    Then the suggestion appears with the same visual prominence as the summary stats
    And each concrete action has a one-click "Apply" button
    And clicking Apply mutates the inputs accordingly and the layout recomputes immediately
    And applied actions are reflected in the persisted store

  Scenario: Reduced motion is honored
    Given my browser reports prefers-reduced-motion: reduce
    Then no new animation, transition, or motion introduced by this slice runs
    (the page state changes instantly without animated reveals)
```

---

## 3. Architecture Specification

### Components touched

- **Modified** `src/lib/components/PieceList.svelte`
  - Empty-state markup: when `pieces.length === 0`, render the existing CTA cluster (Reset / Example CSV / Import CSV / Add piece) inside a hero card with a brief prompt and a dimensioned-line placeholder (the placeholder visual is *not* the blueprint refresh — that's Slice C; here we just consolidate visually).
  - Keep the Reset / Example CSV / Import CSV / Add piece controls; no new behavior.
- **Modified** `src/lib/components/PieceInput.svelte`
  - Label cell: on viewports < `sm` (640 px), use a 2-row layout (label on top, dim×dim×qty on bottom). At `sm`+ keep the current single row but with a wider label cell (`min-w-[12ch]`) and `truncate` plus `title={label}` for the tail of overflow cases.
  - Dimension inputs: bump `min-w` so 5 chars (e.g. `23.875`) fit without clipping; right-align numerics; keep step controls.
- **Modified** `src/lib/components/LumberPieceList.svelte` and `LumberPieceInput.svelte`
  - Same label and dimension fixes as the plywood equivalents.
- **Modified** `src/lib/components/LumberTypeList.svelte` and the lumber empty cards
  - Empty state shrinks to a single small "No lumber types defined — Add type" line; no large dashed card on first load. Once any lumber data exists, the existing detail UI returns.
- **Modified** `src/lib/components/LayoutResults.svelte`
  - Promote the `Download PDF` control to a filled primary button with an icon, sized larger than peer controls.
  - Extract the existing inline waste-suggestion list into the new `<SuggestionsPanel>` component (see below) and render it at higher visual prominence — same horizontal width as the stats card, immediately under the totals.
- **Modified** `src/lib/components/LayoutPreview.svelte`
  - Per-sheet section gets `scroll-margin-top: <header-height>` (Tailwind `scroll-mt-16` or equivalent — match the actual sticky header height).
  - The "Sheet N" caption row gets a small sticky sub-header treatment so it stays visible while scrolling through that sheet.
- **Modified** `src/routes/+page.svelte`
  - Remove the in-header summary strip (`{#if store.pieces.length > 0 || ...}` block in the header right cluster). The header keeps only the brand mark + subtitle.
  - Adjust the main grid so the empty-state hero is the first thing a no-data visitor sees.

- **New** `src/lib/components/SuggestionsPanel.svelte`
  - Renders all four suggestion arrays from the store: `pairingHints`, `smallStockSuggestions`, `configSuggestions`, `trimSuggestions`.
  - Each suggestion item shows a one-line description and, where applicable, an `Apply` button that calls a corresponding store action.
  - Hidden when all four arrays are empty.

- **New** `src/lib/components/Toast.svelte`
  - Minimal toast that listens to `store.lastImportNotice` and renders a fixed-position notification with the message text, an `aria-live="polite"` region, and a close button.
  - Auto-dismiss after 5 seconds (timer respects `prefers-reduced-motion: reduce` by skipping the fade-out transition; the dismiss timing is unchanged).

- **New floating download** in `LayoutResults.svelte` or a small extracted `StickyDownloadButton.svelte`
  - Fixed-position bottom-right button visible only when the summary card is scrolled out of view. Uses `IntersectionObserver` on the summary card to toggle visibility.

### Store changes (`src/lib/stores.svelte.ts`)

- New transient field: `lastImportNotice: { filename: string; count: number; skipped: number; timestamp: number } | null`
  - Set by a new method `recordImport(filename, count, skipped)`. Auto-cleared after 5 seconds via `setTimeout` (in browser only).
  - **Not** persisted to localStorage.
- New action methods (used by `<SuggestionsPanel>` Apply buttons):
  - `applyTrim(pieceId: string, newDimension: 'width' | 'height', newValue: number)` — mutates the piece via `updatePiece`.
  - `applyConfig(updates: Partial<SheetConfig>)` — passthrough to `updateConfig`.
  - (Pairing hints are informational and do not get an Apply button in v1; small-stock suggestions either either propose a config or pieces change — handle case-by-case.)
- `PieceList`'s `onchange` CSV handler is updated to call `store.recordImport(filename, addedCount, skippedCount)` after adding pieces.

### Constraints

- Tailwind 4 + Svelte 5 runes only.
- No new runtime dependencies.
- Vitest stays green; new tests for `recordImport`, `applyTrim`, and the auto-clear timer.
- All new motion respects `prefers-reduced-motion: reduce` via either CSS media query or a Svelte `$effect` reading `matchMedia`.
- No content text changes outside of the new toast strings and the new empty-state hero copy.
- The blueprint aesthetic refresh (typography, textures, palette, custom wordmark, dimensioned-line illustration) is **out of scope**. Slice C handles all of that.
- The plywood/lumber mode toggle is **out of scope**. Slice B handles that.

### Out of scope

- Brand typography or font changes
- Background textures, paper-fiber overlays, hairline rules, corner ticks
- Custom wordmark, logo redesign, or favicon changes
- Mode selector (Plywood / Lumber / Both)
- Persisting the toast state across reloads (it's transient)
- Undo for CSV import (mentioned earlier, deferred — `Reset` already handles the nuclear option)
- Internationalization of toast strings

---

## 4. Acceptance Criteria

Functional:
- [ ] At 360 / 768 / 1440 px, every imported piece label from `closet_cutlist_final.csv` renders fully readable without horizontal scrolling.
- [ ] Dimensions of `24.75`, `23.875`, and `66` all render without character clipping at every viewport.
- [ ] Scrolling to "Sheet 1" via anchor or keyboard places the caption fully visible below the sticky header.
- [ ] On a fresh load (no pieces, no lumber), the page shows one dominant empty hero with the CTA cluster, and the lumber sections are present but visually de-emphasized.
- [ ] The page header contains no summary stats strip after this slice merges.
- [ ] On a populated layout, "Download PDF" is the largest, most prominent button in the summary area.
- [ ] After scrolling past the first sheet, a floating "Download PDF" button appears bottom-right; it disappears when the summary card returns to the viewport.
- [ ] Importing `closet_cutlist_final.csv` shows a toast: "Imported 8 pieces from closet_cutlist_final.csv" (8 part types; the closet CSV expands to 22 piece instances — copy uses *types* count to match what appears in the list, or use the explicit "rows" terminology — implementer's call, document in plan).
- [ ] Importing a CSV with skipped rows shows a count of skipped rows.
- [ ] At least one suggestion category (TrimSuggestion or ConfigSuggestion) renders an Apply button when applicable; clicking Apply mutates the relevant store field and the layout recomputes within 100 ms.
- [ ] With `prefers-reduced-motion: reduce`, no new transitions or animations introduced by this slice play.

Quality:
- [ ] All existing Vitest suites still pass.
- [ ] New Vitest tests for `recordImport` (sets and auto-clears state), `applyTrim` (mutates piece dimension), and `applyConfig` (mutates config field).
- [ ] `npm run check` passes.
- [ ] No new dependencies in `package.json`.
- [ ] Manual verification at 360 / 768 / 1440 px: import `closet_cutlist_final.csv`, scroll through both sheets, click Download PDF, click Apply on a suggestion (if present), import a malformed CSV to see the skipped-rows message.

---

## Consistency Gate

- [x] Intent unambiguous.
- [x] Every behavior in intent has at least one Gherkin scenario.
- [x] Architecture constrains implementation to the listed components and a single new store field; the blueprint aesthetic and mode toggle are explicitly out of scope.
- [x] Naming consistent: "Download PDF", "Import CSV", `<SuggestionsPanel>`, `<Toast>`, `lastImportNotice`, `applyTrim`, `applyConfig`, "Sheet N", `prefers-reduced-motion`.
- [x] No artifact contradicts another.

**Verdict: PASS.** Ready for `/agentic-dev-team:plan`.

---

## Decisions log

- **Header stats removed entirely** (not just hidden on mobile). Confirmed by maintainer.
- **Mode toggle deferred to Slice B.** Slice A keeps the lumber sections visible but visually de-emphasized so they don't compete with the plywood empty state.
- **Aesthetic refresh deferred to Slice C.** Slice A uses existing Tailwind classes and palette; only structural changes here.
- **Toast UI is custom**, not a library. Single use site, ~30 LOC.
- **Reduced motion respected** for any new transitions (sticky download fade, toast fade, suggestion apply confirmation).
- **Apply scope**: `applyTrim` and `applyConfig` cover the most common actionable suggestions. Other suggestion categories (pairing hints, small-stock suggestions) display informationally in v1; broader Apply coverage is a follow-up.
- **CSV count copy**: defer the "8 types vs 22 pieces" choice to the plan/implementation. Both numbers are useful; the plan picks one and locks it.

---

## Out-of-band: Slice B and Slice C summaries (queued for separate specs)

Captured here so the maintainer can confirm direction without a full re-spec turn.

### Slice B — Plywood / Lumber mode toggle (deferred spec)
- New `mode: 'plywood' | 'lumber' | 'both'` field on the store; persisted in localStorage alongside existing state.
- Mode selector at the top of the input rail. Default: `'plywood'`.
- In `'plywood'` mode, lumber sections do not render. In `'lumber'` mode, plywood sections do not render. In `'both'`, both render (current behavior).
- Importing a CSV does not change mode automatically in v1; user picks first.

### Slice C — Direction A: Blueprint aesthetic (deferred spec)
- **Typography**: blueprint-style — the maintainer requested explicit "blueprint typography." Candidates: a technical drawing display font (e.g. **Archivo Narrow**, **Saira Condensed**, or **Iosevka** for a more drafted feel); a humanist/technical body sans (e.g. **IBM Plex Sans** which has draftsman roots); monospaced numbers everywhere via the existing `font-mono` utility. Final pick documented in the Slice C spec — Google Fonts only (no licensing burden).
- **Palette**: shift the dark theme toward a faint blueprint-cyan accent in addition to the existing plywood-orange. Cards become hairline-bordered with corner ticks instead of fully rounded boxes.
- **Wordmark**: custom letterspaced "CUTLIST" with a hairline rule above and below, mimicking a shop-drawing title block.
- **Empty state illustration**: faint dimensioned-line drawing of a 4×8 sheet with arrow heads, tick marks, and label callouts (`48"` / `96"`). SVG, accessible.
- **Background**: very low-opacity SVG noise / paper-fiber overlay.
- **Sheet captions and rule lines**: 1-pixel hairlines, dashed dimension lines on hover, optional callout numbers in monospace.
- **Waste color scale**: 3-stop (green < 15%, amber 15–30%, red > 30%) with the threshold visible in the legend.
- **Motion**: choreographed page-load with staggered card reveals (200 ms each), respect `prefers-reduced-motion: reduce`.

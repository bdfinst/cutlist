# Plan: UX Hardening — Imported-Cutlist Experience (Slice A)

**Created**: 2026-04-28
**Branch**: feat/ux-hardening (to be created off `main`)
**Status**: approved
**Spec**: [.planning/ux-hardening.spec.md](./ux-hardening.spec.md)

## Goal

Make the imported-cutlist experience not feel broken at any viewport size:
labels stay readable, decimals don't clip, the sticky header doesn't eat the
Sheet caption, the empty state focuses one CTA, summary stats live in one
place, the PDF download is the dominant action, CSV imports get
acknowledged, and the "Ways to reduce waste" suggestions become
one-click-applyable. No font, palette, or texture changes — those are
Slice C.

## Acceptance Criteria

- [ ] Every label in `closet_cutlist_final.csv` (e.g. "Hanger Center Divider", "Adjustable Shelf") renders fully readable at 360 / 768 / 1440 px.
- [ ] `24.75`, `23.875`, and `66` all render in dimension inputs without character clipping at every viewport.
- [ ] Scrolling to a Sheet caption stops it below the sticky header, fully visible.
- [ ] First-load page shows one dominant plywood empty hero with the CTA cluster; lumber empty states are visually de-emphasized.
- [ ] No summary stats strip in the page header at any viewport.
- [ ] "Download PDF" is the largest filled primary button in the summary area; a sticky floating Download PDF appears only when the summary card is scrolled out of view.
- [ ] Importing `closet_cutlist_final.csv` shows a toast `"Imported 8 pieces from closet_cutlist_final.csv"` (count = added rows, not expanded instances; locked in Step 2 below).
- [ ] Importing a malformed CSV adds skipped-row count to the toast.
- [ ] At least `applyTrim` and `applyConfig` Apply buttons appear when their suggestions are non-empty, and clicking them mutates state and recomputes the layout immediately.
- [ ] With `prefers-reduced-motion: reduce`, no new transitions run.
- [ ] All existing Vitest suites still pass; new unit tests cover the store additions.
- [ ] `npm run check` passes; no new dependencies.

## Steps

### Step 1: Store additions — transient import notice + apply actions

**Complexity**: standard
**RED**: Add `test/store-hardening.spec.ts`:

```
describe('store.recordImport')
  it('sets lastImportNotice with filename, count, skipped, and timestamp')
  it('clears lastImportNotice after 5 seconds via fake timers')
  it('replacing an existing notice resets the auto-clear timer')

describe('store.applyTrim')
  it('updates the named dimension on the matching piece')
  it('does nothing if the piece id is unknown')
  it('triggers a fresh derived cutlist result')

describe('store.applyConfig')
  it('passes a partial config update through to updateConfig')
  it('triggers a fresh derived cutlist result')
```

Uses `vi.useFakeTimers()` for the auto-clear timer.

**GREEN**: In `src/lib/stores.svelte.ts`:
- Add `lastImportNotice = $state<{ filename: string; count: number; skipped: number; timestamp: number } | null>(null)`.
- Add private `#noticeTimer: ReturnType<typeof setTimeout> | null = null`.
- Add `recordImport(filename: string, count: number, skipped: number): void` — clears prior timer, sets state, schedules a 5-second clear (only when `browser` is true).
- Add `applyTrim(pieceId: string, dimension: 'width' | 'height', newValue: number): void` — calls `updatePiece(pieceId, { [dimension]: newValue })`.
- Add `applyConfig(updates: Partial<SheetConfig>): void` — passthrough to `updateConfig`.

**REFACTOR**: None expected.

**Files**: `src/lib/stores.svelte.ts`, `test/store-hardening.spec.ts`

**Commit**: `feat(store): add lastImportNotice + applyTrim + applyConfig actions`

---

### Step 2: Toast component + CSV-import wire-up

**Complexity**: standard
**RED**: No automated test (no Svelte component test harness). E2E coverage in Step 8 manual gate.

**GREEN**:
- Create `src/lib/components/Toast.svelte`:
  - Reads `store.lastImportNotice` reactively.
  - When non-null, renders a fixed-position element (top-right or bottom-center on mobile) with the message and a close button. The container has `role="status"` and `aria-live="polite"`.
  - Message format: `"Imported {count} piece{s} from {filename}{skippedSuffix}"` where `skippedSuffix` is `". {n} row{s} skipped."` if `skipped > 0`, else empty.
  - Tailwind transitions use `motion-reduce:transition-none motion-reduce:duration-0` so reduced-motion users get no fade.
  - Close button calls `store.lastImportNotice = null` (clearing also cancels the auto-clear via Step 1's logic — make sure recordImport clears any pending timer when state is mutated externally; or tolerate the noop because nullable state stays null).
- Mount `<Toast />` once in `src/routes/+layout.svelte` so it's available on every page.
- Modify `src/lib/components/PieceList.svelte`:
  - In the `parseCSV` `onload` handler, after pieces are added, call `store.recordImport(filename, addedCount, skippedCount)` where `filename` comes from `event.target.files[0].name` and `addedCount` is the number of rows successfully appended (not the expanded `quantity` total).
  - Make the same change in `LumberPieceList.svelte` if it has its own CSV path; otherwise leave alone.

**Locked decision** (resolves the spec's open call): the toast counts **rows added** (i.e. distinct piece types), matching what the user sees materialize in the list — not the expanded instance count from quantities. Closet CSV → "Imported 8 pieces…". Plural matches grammatically.

**REFACTOR**: None expected.

**Files**: `src/lib/components/Toast.svelte` (new), `src/routes/+layout.svelte`, `src/lib/components/PieceList.svelte`, possibly `src/lib/components/LumberPieceList.svelte`

**Commit**: `feat(ui): toast confirmation on CSV import`

---

### Step 3: PieceInput + LumberPieceInput hardening

**Complexity**: standard
**RED**: No automated UI test. Manual at 360 / 768 / 1440 px is the gate (covered in Step 8).

**GREEN**: In `src/lib/components/PieceInput.svelte`:
- Wrap the row in a layout that becomes 2-row at narrow widths: label spans full width on top, dimensions row below. Use Tailwind `flex flex-col sm:flex-row sm:items-center` with `sm:gap-3` and a `min-w-0` label cell.
- Label cell: `truncate min-w-0 sm:min-w-[12ch]` and add `title={piece.label}` so the full name is reachable via tooltip even when truncated.
- Dimension inputs: `min-w-[5ch] tabular-nums text-right` (or appropriate utility classes); ensure `inputmode="decimal"`.
- Quantity input: similar widening, right-aligned, `tabular-nums`.

Apply the same changes to `src/lib/components/LumberPieceInput.svelte`.

**REFACTOR**: If both files end up with identical input markup, extract a small `<DimensionInput>` helper. Don't pre-emptively refactor — only if the diff makes the duplication obvious.

**Files**: `src/lib/components/PieceInput.svelte`, `src/lib/components/LumberPieceInput.svelte`

**Commit**: `ui: keep piece labels and decimals readable at every viewport`

---

### Step 4: Empty-state hero + header stats removal

**Complexity**: standard
**RED**: No automated UI test. Manual at 360 / 768 / 1440 px is the gate.

**GREEN**:
- In `src/routes/+page.svelte`, **remove** the entire `<div class="hidden sm:flex …stats…">` block from the header right cluster (the `{#if store.pieces.length > 0 || store.lumberPieces.length > 0}` block). The header retains the brand mark, subtitle, and any existing right-side controls.
- In `src/lib/components/PieceList.svelte`, restructure the empty state when `pieces.length === 0`:
  - Replace the small dashed "No pieces yet" card with a hero card using existing card classes; place the CTA cluster (Reset / Example CSV / Import CSV / Add piece) inside, with a one-line prompt above (e.g. "Add a part list to plan your cuts."). No new illustrations or palette — Slice C.
- In `src/lib/components/LumberTypeList.svelte` and `LumberPieceList.svelte`, when their respective arrays are empty, replace the existing dashed cards with a single muted line that reads "No lumber types defined — Add type" / "No lumber pieces yet — Add piece", with the existing Add button still present. Once any data exists in those sections, the previous detail UI returns unchanged.

**REFACTOR**: None expected.

**Files**: `src/routes/+page.svelte`, `src/lib/components/PieceList.svelte`, `src/lib/components/LumberTypeList.svelte`, `src/lib/components/LumberPieceList.svelte`

**Commit**: `ui: focus first-load on a single plywood empty-state hero, remove duplicate header stats`

---

### Step 5: Sheet caption scroll-margin + sticky sub-header

**Complexity**: trivial
**RED**: No automated test.
**GREEN**: In `src/lib/components/LayoutPreview.svelte`:
- Add `scroll-mt-20` (or whatever matches `header` height; verify by inspecting the rendered header) to the wrapper of each per-sheet section.
- The "Sheet N" caption row gets `sticky top-16 bg-shop-bg/90 backdrop-blur z-[5]` (header is `z-10`, so sub-header sits below); add `motion-reduce:backdrop-blur-none` to keep things instant under reduced motion.

**REFACTOR**: None.

**Files**: `src/lib/components/LayoutPreview.svelte`

**Commit**: `ui: keep "Sheet N" caption visible while scrolling each sheet`

---

### Step 6: PDF prominence + sticky floating download

**Complexity**: standard
**RED**: No automated test.
**GREEN**:
- In `src/lib/components/LayoutResults.svelte`, restyle the existing `Download PDF` button:
  - Filled primary (`bg-plywood text-shop-dark hover:bg-plywood-light`), larger padding (`px-4 py-2 text-sm font-semibold`), with a download icon (inline SVG, decorative `aria-hidden`).
  - Place it as the rightmost item in the summary stats row.
- Add a new `<StickyDownloadButton>` component (or inline element):
  - Renders a fixed-position `bottom-4 right-4` button with the same icon + label.
  - Uses an `IntersectionObserver` (created in `$effect` in browser only) on the in-page Download PDF button. Visible only when the in-page one is **not** intersecting the viewport. Hidden by default.
  - Calls the same download handler as the in-page button (extract handler into a small store action or a local function passed via props — implementer's call).
  - Includes `motion-reduce:transition-none` on its fade transition.

**REFACTOR**: If the PDF download logic is duplicated, hoist the click handler to a small store method `downloadPdf()`. Otherwise leave inline.

**Files**: `src/lib/components/LayoutResults.svelte`, possibly `src/lib/components/StickyDownloadButton.svelte` (new), possibly `src/lib/stores.svelte.ts`

**Commit**: `ui: promote Download PDF and add a sticky floating download once scrolled`

---

### Step 7: SuggestionsPanel with Apply buttons

**Complexity**: standard
**RED**: Add `test/suggestions-panel-actions.spec.ts` — actually the visible-component bit is hard to test, but the store additions (`applyTrim`, `applyConfig`) are already covered by Step 1. Add one more test verifying that calling `applyTrim` against a `TrimSuggestion`'s payload mutates the piece such that the suggestion would no longer fire (regression seal).

**GREEN**:
- Create `src/lib/components/SuggestionsPanel.svelte`:
  - Reads `store.pairingHints`, `store.smallStockSuggestions`, `store.configSuggestions`, `store.trimSuggestions`.
  - Returns `null` (renders nothing) when all four arrays are empty.
  - Otherwise renders a card sized like the stats summary, immediately under the totals row.
  - For each `trimSuggestions` item: render the human-readable reason and an "Apply trim" button that calls `store.applyTrim(suggestion.pieceId, suggestion.dimension, suggestion.newValue)`. Button is disabled briefly after click to avoid double-apply (visual only).
  - For each `configSuggestions` item: render the reason and an "Apply" button that calls `store.applyConfig(suggestion.configPatch)` (or whatever shape the suggestion type exposes — verify in `suggestions.ts`).
  - For `pairingHints` and `smallStockSuggestions`: render text only, no Apply button in v1.
- In `src/lib/components/LayoutResults.svelte`, replace the existing inline suggestions block with `<SuggestionsPanel />`.

**REFACTOR**: If the suggestion item rendering grows past ~3 cases each, extract a small `<SuggestionItem>` component. Otherwise leave inline.

**Files**: `src/lib/components/SuggestionsPanel.svelte` (new), `src/lib/components/LayoutResults.svelte`, possibly `test/suggestions-panel-actions.spec.ts`

**Commit**: `feat(ui): one-click Apply for trim and config suggestions`

---

## Complexity Classification

| Step | Rating | Reason |
|------|--------|--------|
| 1 | standard | New store fields, new methods, fake-timer tests |
| 2 | standard | New component, integration with PieceList, accessibility-sensitive |
| 3 | standard | Layout responsive change; affects all populated lists |
| 4 | standard | Restructures empty state across 3 components and the header |
| 5 | trivial | Two CSS utility changes |
| 6 | standard | New IntersectionObserver-driven UI |
| 7 | standard | New component bridging suggestions to actions |

## Pre-PR Quality Gate

- [ ] `npm test` passes (Vitest, including the new `store-hardening.spec.ts` and `suggestions-panel-actions.spec.ts`)
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] **Manual viewports** — at 360 / 768 / 1440 px, import `~/Downloads/closet_cutlist_final.csv` and verify:
  - All 8 piece labels are fully readable
  - `24.75`, `23.875`, and other decimals display fully
  - Scrolling to "Sheet 1" leaves the caption visible under the header
  - One empty-state hero on first load; lumber sections muted
  - No header stats strip
  - Download PDF is the dominant button; sticky floating button appears once summary scrolls out
  - Toast appears on CSV import with file + count
  - At least one Apply button is visible in SuggestionsPanel (the closet CSV's `21.9% waste` includes a TrimSuggestion for the Adjustable Shelf — this is the canonical demo case)
- [ ] **Reduced motion**: in DevTools, set `prefers-reduced-motion: reduce`, repeat the manual flow; confirm no transitions or animations run
- [ ] **Accessibility**: tab through the page, confirm the toast is announced, the suggestions panel is keyboard-reachable, and the floating download button is in tab order
- [ ] No new dependencies in `package.json`
- [ ] `/code-review --changed` passes

## Risks & Open Questions

- **Toast timer cleanup on rapid imports** — If a user imports two CSVs in 4 seconds, the auto-clear timer for the first import fires while the second is showing. Mitigation: `recordImport` cancels the prior timer before scheduling a new one (Step 1 implementation).
- **IntersectionObserver in SSR** — SvelteKit may try to render the `StickyDownloadButton`'s effect on the server. Guard the `IntersectionObserver` creation with `if (browser)` from `$app/environment` or use a `$effect` (which only runs in the client).
- **Suggestion shape variance** — `TrimSuggestion` and `ConfigSuggestion` shapes need verification against `src/lib/suggestions.ts`. The plan assumes a `pieceId` + `dimension` + `newValue` for trim and a partial config for config. If the shapes differ, adapt the Apply binding without changing user-facing behavior.
- **Header height for `scroll-margin-top`** — Tailwind utility (`scroll-mt-20`) is approximate. Exact match requires reading the rendered header height; `20` (= 5rem = 80px) is a good first guess. Adjust during manual verification in Step 5.
- **Empty-state CTA click semantics** — The Add piece / Import CSV / Example CSV controls already have handlers in `PieceList.svelte`; restructuring the markup must preserve those bindings.
- **`<Toast>` mounted in `+layout.svelte`** — Currently `+layout.svelte` is a 9-line shell. Adding the toast there means it's available across all routes (only one route exists today, but this is the right place). No visible change for users without a notice.

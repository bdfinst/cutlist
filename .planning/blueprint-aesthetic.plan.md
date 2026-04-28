# Plan: Blueprint Aesthetic Refresh (Slice C)

**Created**: 2026-04-28
**Branch**: feat/blueprint-aesthetic (off `feat/ux-hardening` until that PR merges; rebase to `main` afterward)
**Status**: approved
**Spec**: [.planning/blueprint-aesthetic.spec.md](./blueprint-aesthetic.spec.md)

## Goal

Repaint the Cutlist chrome as a shop drawing: drafting typography, hairline
rules, corner ticks, cyan dimension lines, paper-fiber background, custom
letterspaced wordmark, dimensioned-line empty-state illustration, 3-stop
waste color, and a respectful page-load stagger. Functional behavior, IA,
algorithm output, and the Tableau piece-color palette are untouched.

## Acceptance Criteria

- [ ] All UI text outside the SVG renders in IBM Plex Sans; numbers and the wordmark render in IBM Plex Mono.
- [ ] Wordmark reads "CUTLIST" in mono uppercase, letterspaced, framed by visible corner ticks.
- [ ] Empty layout area shows a dimensioned-line 4×8 sheet illustration (cyan hairlines, `48"` and `96"` callouts, corner ticks) instead of the dotted-square placeholder.
- [ ] Layout summary, SuggestionsPanel, and the empty-state hero use a hairline border + visible corner ticks.
- [ ] A subtle paper-fiber noise texture is visible on the page background; doesn't interfere with text contrast.
- [ ] Waste percentages render green/amber/red per a 3-stop scale (`<15 / 15–30 / >30`) with a tiny adjacent legend on the totals card.
- [ ] On initial load with N≥1 sheets, sheet cards stagger-fade in (200 ms duration, 80 ms stagger). With `prefers-reduced-motion: reduce`, no stagger.
- [ ] The Tableau piece-color palette in the SVG is unchanged.
- [ ] Algorithm output for the closet CSV is identical to before.
- [ ] All existing Vitest and Playwright suites still pass; `npm run check` is clean.
- [ ] Bundle delta < 80 KB gzipped.
- [ ] Only new dependencies are `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`.

## Steps

### Step 1: Install fonts + wire CSS variables

**Complexity**: standard
**RED**: No automated test (visual change). Manual verification covered in pre-PR gate.
**GREEN**:
- `npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`
- In `src/routes/+layout.svelte`, import `@fontsource/ibm-plex-sans/400.css`, `@fontsource/ibm-plex-sans/600.css`, `@fontsource/ibm-plex-mono/400.css`, `@fontsource/ibm-plex-mono/600.css`.
- In `src/routes/layout.css`:
  - Override `--font-sans` and `--font-mono` to point at the new families.
  - Add `--color-blueprint-cyan: #5DA9D6` and `--color-blueprint-cyan-dim: #355A6F` tokens; `--color-warn: #d4a017` for the amber waste stop.
- In `src/lib/components/SheetSVG.svelte`, set `font-family: var(--font-mono)` on `<text>` elements (or set `font-family` directly to `'IBM Plex Mono', ui-monospace, monospace`) so dimension callouts inherit the blueprint mono.

**REFACTOR**: None.
**Files**: `package.json`, `package-lock.json`, `src/routes/+layout.svelte`, `src/routes/layout.css`, `src/lib/components/SheetSVG.svelte`
**Commit**: `feat(ui): adopt IBM Plex Sans + Mono and add blueprint color tokens`

---

### Step 2: Wordmark with title-block corner ticks

**Complexity**: standard
**RED**: No automated test.
**GREEN**:
- In `src/routes/+page.svelte`, restyle the brand cluster:
  - Wrap the icon + `<h1>` in a `<div class="blueprint-title-block">` with `position: relative` and a small inline pad.
  - The `<h1>` text becomes `CUTLIST` in `font-mono uppercase tracking-[0.18em] text-white text-lg`.
  - Add two pseudo-element corner ticks (top-left, bottom-right) via a `.blueprint-title-block::before / ::after` rule in `layout.css` — 8×8 px L-shapes drawn with two 1px borders in `--color-blueprint-cyan`.
  - The `cut optimizer` subtitle gets `font-mono uppercase tracking-widest text-[10px]` styling.
- The plywood-icon image stays unchanged.

**REFACTOR**: None.
**Files**: `src/routes/+page.svelte`, `src/routes/layout.css`
**Commit**: `feat(ui): letterspaced "CUTLIST" wordmark with title-block corner ticks`

---

### Step 3: Dimensioned-line empty-state illustration

**Complexity**: standard
**RED**: No automated test (purely SVG).
**GREEN**:
- Create `src/lib/components/BlueprintSheetIllustration.svelte`:
  - Pure SVG, no script. Accepts an optional `width` prop (default 96, the configured length) and `height` (default 48).
  - Renders a 4:8-ratio rectangle with a 1px cyan stroke (no fill).
  - Top horizontal dimension line above the rectangle with two arrowheads and a centered text label "96\"" (uses `width` prop for the label).
  - Left vertical dimension line to the left of the rectangle with arrowheads and a rotated centered label "48\"".
  - Four small L-shaped corner ticks at each corner of the rectangle.
  - `aria-hidden="true"` on the root SVG.
  - Sized via `viewBox` so it scales; container clamps to `max-w-[260px]` or similar.
- In `src/lib/components/LayoutResults.svelte`, replace the existing dotted-square SVG inside the empty state with `<BlueprintSheetIllustration />`. The "Add pieces to see the layout" copy is preserved.

**REFACTOR**: None.
**Files**: `src/lib/components/BlueprintSheetIllustration.svelte`, `src/lib/components/LayoutResults.svelte`
**Commit**: `feat(ui): replace empty-state placeholder with a dimensioned-line sheet illustration`

---

### Step 4: Blueprint card utility (hairline + corner ticks)

**Complexity**: standard
**RED**: No automated test.
**GREEN**:
- In `src/routes/layout.css`, define a `.blueprint-card` class:
  ```css
  .blueprint-card {
    position: relative;
    border: 1px solid var(--color-blueprint-cyan-dim);
    border-radius: 2px;
  }
  .blueprint-card::before,
  .blueprint-card::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-color: var(--color-blueprint-cyan);
  }
  .blueprint-card::before {
    top: -1px; left: -1px;
    border-top: 1px solid;
    border-left: 1px solid;
  }
  .blueprint-card::after {
    bottom: -1px; right: -1px;
    border-bottom: 1px solid;
    border-right: 1px solid;
  }
  ```
- Apply to:
  - The summary card in `LayoutResults.svelte` (the `<div class="flex items-center justify-between rounded-lg bg-shop-mid border border-shop-light/60 px-4 py-3 max-w-2xl">` — drop `rounded-lg` and the existing border, add `blueprint-card`).
  - The `<SuggestionsPanel>` card.
  - The empty-state hero in `<PieceList>` (replaces the soft dashed border).
  - The empty-layout hero in `LayoutResults.svelte` (the wrapper around `<BlueprintSheetIllustration>`).

**REFACTOR**: None.
**Files**: `src/routes/layout.css`, `src/lib/components/LayoutResults.svelte`, `src/lib/components/SuggestionsPanel.svelte`, `src/lib/components/PieceList.svelte`
**Commit**: `feat(ui): hairline + corner-tick treatment on key cards`

---

### Step 5: Paper-fiber background + 3-stop waste color

**Complexity**: standard
**RED**: Add a tiny unit test for the new helper in `test/waste-color.spec.ts`:
```
describe('wasteClass')
  it('returns text-success below 15')
  it('returns text-warn at 15')
  it('returns text-warn at 30')
  it('returns text-danger above 30')
  it('returns text-warn for 21.9 (closet CSV case)')
```

**GREEN**:
- Create `src/lib/waste-color.ts` exporting `wasteClass(percent: number): 'text-success' | 'text-warn' | 'text-danger'`. Boundaries: `< 15` → success; `15..30` (inclusive both ends) → warn; `> 30` → danger.
- Wire `wasteClass` into `LayoutResults.svelte` (replace the existing `wasteColor = $derived(...)` chain) and `LayoutPreview.svelte` (replace the per-sheet derived color).
- Add a small legend element next to the totals waste display: three dots colored success / warn / danger with the threshold labels (`<15`, `15-30`, `>30`) in tiny mono text.
- In `src/routes/layout.css`, add a paper-fiber overlay:
  ```css
  body {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.03'/></svg>");
    background-attachment: fixed;
  }
  ```
- Confirm `--color-warn` was added in Step 1 and is mapped to a Tailwind utility (Tailwind 4 reads CSS vars directly, so `text-warn` works once the var exists).

**REFACTOR**: None.
**Files**: `src/lib/waste-color.ts`, `test/waste-color.spec.ts`, `src/lib/components/LayoutResults.svelte`, `src/lib/components/LayoutPreview.svelte`, `src/routes/layout.css`
**Commit**: `feat(ui): 3-stop waste color scale + paper-fiber background overlay`

---

### Step 6: Sheet-reveal stagger animation

**Complexity**: trivial
**RED**: No automated test.
**GREEN**:
- In `src/routes/layout.css`:
  ```css
  @keyframes sheet-reveal {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  .sheet-reveal {
    animation: sheet-reveal 200ms ease-out backwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet-reveal { animation: none; }
  }
  ```
- In `src/lib/components/LayoutResults.svelte`, wrap each `<LayoutPreview>` in a div with class `sheet-reveal` and `style:animation-delay={\`${i * 80}ms\`}` using `{#each ... as sheet, i}`.

**REFACTOR**: None.
**Files**: `src/routes/layout.css`, `src/lib/components/LayoutResults.svelte`
**Commit**: `feat(ui): stagger-fade sheet cards on initial render`

---

## Complexity Classification

| Step | Rating | Reason |
|------|--------|--------|
| 1 | standard | New deps + CSS variables + SVG font-family change |
| 2 | standard | New CSS rule, new wordmark markup |
| 3 | standard | New SVG component |
| 4 | standard | CSS utility + apply across four call sites |
| 5 | standard | New helper + tests + CSS |
| 6 | trivial | Two CSS rules + one templated style attribute |

## Pre-PR Quality Gate

- [ ] `npm test` passes (167+ tests, includes new `waste-color.spec.ts`)
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds; check the bundle size delta with the existing build output
- [ ] **Visual at 1440 / 768 / 390 px**: import the closet CSV; confirm:
  - "CUTLIST" wordmark with corner ticks
  - Body in IBM Plex Sans, numbers in IBM Plex Mono
  - Hairline + corner-tick borders on summary, suggestions, empty hero
  - Dimensioned-line empty-state illustration before any pieces are added
  - Paper-fiber noise texture visible (zoom 100%)
  - 21.9% waste renders amber (mid stop), with the legend showing thresholds
  - Sheet cards stagger-fade in on first load
- [ ] **Reduced-motion**: with DevTools `prefers-reduced-motion: reduce`, sheet cards appear instantly with no fade
- [ ] **Algorithm parity**: confirm that for the closet CSV, the totals (`2 sheets`, `21.9% waste`) and the unfit-pieces list are unchanged from `main`
- [ ] **Piece colors unchanged**: visual diff of any sheet rendering against `main` shows piece fills identical
- [ ] **Bundle size**: `du -h .svelte-kit/output/client/_app/immutable/` delta < 80 KB
- [ ] No new packages in `dependencies` other than the two `@fontsource` packages

## Risks & Open Questions

- **Tailwind 4 + CSS variable utilities** — Tailwind 4 uses `@theme` blocks for custom utilities. Adding a `text-warn` utility may need an explicit `@theme` definition in `layout.css`, not just a CSS variable. Verify in Step 5; if needed, extend the `@theme` block.
- **Font load FOUT/FOUC** — `@fontsource` packages set `font-display: swap` by default. First paint will use the system fallback briefly. Acceptable.
- **SVG `font-family` inheritance** — In current `SheetSVG`, `<text>` elements may not have an explicit `font-family`, picking it up from CSS. Verify the cascade reaches into the SVG; if not, set `font-family` attribute directly. Step 1 covers this.
- **Corner ticks visibility on mobile** — With small cards on narrow viewports, 6×6 px ticks may look cramped. Visual check during pre-PR gate; tighten to 5×5 px if needed.
- **Paper-fiber visibility on dark theme** — At 3% opacity over the deep `#1a1a1f` body the noise may be barely perceptible. That's intentional — texture, not pattern. Adjust to 4–5% if it disappears entirely on common displays.
- **Stagger animation on edits** — The `sheet-reveal` keyframe runs on initial mount of each `<LayoutPreview>`. If Svelte preserves nodes across re-renders (which it should, given keyed `{#each}`), edits won't re-trigger. Verify in the visual check.
- **Wordmark accessibility** — `CUTLIST` letterspaced may read oddly to screen readers. Use `<span aria-label="Cutlist">CUTLIST</span>` to give SR users a normal pronunciation while keeping the visual letterspacing.
- **PDF unchanged** — confirmed in spec; if a future slice wants the PDF to match, it'll need jsPDF font registration. Not this slice.

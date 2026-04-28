# Spec: Blueprint Aesthetic Refresh (Slice C — Direction A)

Status: **Consistency gate PASSED** — ready for planning.

Slice: single vertical slice, aesthetic refresh of the existing chrome
without changing functional behavior, IA, or piece-color contracts.
Branch: `feat/blueprint-aesthetic` off `main` (lands after Slice A is merged
to avoid restyling broken layout).

---

## 1. Intent Description

Cutlist is a tool for woodworkers and shop owners. The current UI is
"competent dark admin panel"; the maintainer wants it to read like an
engineering shop drawing — a blueprint. This slice repaints the chrome
around the existing app: typography, surface treatment, accent color,
empty-state illustration, wordmark, and motion. **The Tableau-colorblind
piece-color palette in the layout SVG stays unchanged** — those colors are
functional data encoding and switching them would harm legibility.

The result reads as drafted: monospace numbers and dimensions, hairline
rules, corner ticks on key cards, a deep-cyan accent that complements (not
replaces) the plywood-orange action color, a dimensioned-line illustration
in the empty state, and a custom letterspaced wordmark inside a title-block
frame. Background carries a very low-opacity paper-fiber overlay. Page-load
animates the sheet cards in with a staggered fade (skipped under
`prefers-reduced-motion: reduce`). Waste color tightens to a 3-stop scale
with a small legend so 21.9% no longer looks celebratory.

This slice changes look, not behavior. No new features. No IA changes
(that's Slice B). No new dependencies beyond `@fontsource/*` for the two
self-hosted Google fonts.

---

## 2. User-Facing Behavior (Gherkin)

```gherkin
Feature: Blueprint aesthetic chrome

  Scenario: Body and UI text use IBM Plex Sans
    Given I view any text element outside the layout SVG
    Then it is rendered in IBM Plex Sans (or a system fallback only if the font fails to load)
    And font weight, size, and line-height match the existing typographic scale within +/- one Tailwind step

  Scenario: Numbers, dimensions, and the wordmark use IBM Plex Mono
    Given I view a numeric display (sheet count, waste %, dimension input value, dimension callout in the SVG, sheet "Sheet N pc waste%" caption, the "CUTLIST" wordmark in the header)
    Then it is rendered in IBM Plex Mono

  Scenario: Wordmark is a title-block treatment
    Given I view the page header at any viewport
    Then the brand reads "CUTLIST" in IBM Plex Mono uppercase with positive letter-spacing
    And it is enclosed by hairline corner ticks (top-left, bottom-right) suggesting a drawing title block
    And the existing plywood-icon glyph is preserved next to it

  Scenario: Empty layout area shows a dimensioned-line sheet
    Given I am on the page with no pieces configured
    Then the empty layout placeholder is an SVG line drawing of a 4×8 sheet
    And the drawing has dimension lines with arrowheads labelling 48" and 96"
    And the drawing has corner ticks
    And the drawing renders in cyan hairlines on the existing dark surface
    And the placeholder copy "Add pieces to see the layout" is preserved

  Scenario: Cards carry hairline rules and corner ticks
    Given I view the layout summary card or the SuggestionsPanel
    Then the card has a 1px border in cyan-tinted hairline color
    And small corner ticks are visible at top-left and bottom-right corners
    And the card no longer uses fully rounded borders

  Scenario: Body has a low-opacity paper-fiber texture
    Given I view the page background
    Then a subtle SVG-noise texture is overlaid at very low opacity (~3%)
    And the texture does not interfere with text contrast or hover states

  Scenario: 3-stop waste color scale
    Given the layout has computed total waste percent W
    Then waste text is rendered in:
      | range            | color tag     |
      | W < 15%          | text-success  |
      | 15% <= W <= 30%  | text-warn     |
      | W > 30%          | text-danger   |
    And a small legend or threshold marker is visible adjacent to the waste display
    And the per-sheet waste callouts use the same scale

  Scenario: Sheet cards stagger-fade in on page load
    Given the optimizer has produced N >= 1 sheets
    When the page first renders the layout
    Then each sheet card fades and slides in with a 200 ms stagger between siblings
    And after all cards are visible no further motion is triggered by piece edits (recomputes are instant)

  Scenario: Reduced motion is honored
    Given my browser reports prefers-reduced-motion: reduce
    Then the page-load stagger is skipped — sheet cards appear instantly
    And no other transitions, fades, or backdrop blurs introduced by this slice run

  Scenario: Functional layer is preserved
    Given any imported or hand-entered cutlist
    Then the SVG sheet rendering uses the existing Tableau-colorblind piece palette unchanged
    And the algorithm output (sheet count, waste %, unfit pieces) is unchanged from before this slice
    And all existing keyboard interactions, focus styles, and aria-* attributes still work
```

---

## 3. Architecture Specification

### Typography

- **Body / UI text**: **IBM Plex Sans** (regular 400, semibold 600). Self-hosted via `@fontsource/ibm-plex-sans`. Replaces the default Tailwind sans stack across all UI chrome.
- **Display / Numbers / Wordmark**: **IBM Plex Mono** (regular 400, semibold 600). Self-hosted via `@fontsource/ibm-plex-mono`. Used for: the `CUTLIST` wordmark, all numeric displays (sheet count, waste %, dimension inputs), per-sheet callouts (`11 pc 11.8% waste`), the SVG dimension callouts.
- **Fallbacks**: `system-ui, sans-serif` for sans, `ui-monospace, monospace` for mono. Loading uses `font-display: swap` so first paint isn't blocked.
- **Tailwind config** (`src/routes/layout.css`): override the default `--font-sans` and `--font-mono` CSS variables to point at the new families. Existing `font-mono` utility classes start using IBM Plex Mono automatically.

### Color additions / shifts

- Add new tokens (defined in `layout.css`):
  - `--color-blueprint-cyan: #5DA9D6` — primary hairline / accent / dimension-line color
  - `--color-blueprint-cyan-dim: #355A6F` — secondary / subtle accent
  - `--color-warn: #d4a017` — amber for the middle waste stop (currently `text-plywood` is borrowed; make explicit)
- Existing `shop-*` palette stays. Plywood-orange stays as the primary action color (Apply, Download PDF, primary buttons).
- The Tableau-colorblind palette in `src/lib/colors.ts` is **not** touched.

### Wordmark

- Replace the current header brand with a small layout block:
  - Existing plywood-icon `<img>` stays at the same size.
  - Text becomes `<span class="font-mono uppercase tracking-[0.18em] text-white">CUTLIST</span>`.
  - Wrapping element gets `position: relative` plus pseudo-elements (or inline SVG) at top-left and bottom-right corners drawing 8×8 px L-shaped corner ticks in `--color-blueprint-cyan`.
  - The `cut optimizer` subtitle stays, restyled in IBM Plex Mono uppercase, dimmer, smaller.

### Empty-state illustration

- New `src/lib/components/BlueprintSheetIllustration.svelte` — pure SVG, no JS:
  - Outer rectangle 4:8 ratio (matches default sheet)
  - Cyan hairline stroke, no fill
  - Top dimension line with arrowheads at both ends + centered label `96"` (or `length` from config if available; default is fine)
  - Left dimension line with arrowheads + centered rotated label `48"`
  - Four small corner ticks
  - `aria-hidden="true"` (decorative); the existing "Add pieces to see the layout" text stays as the accessible content
- Replaces the existing dotted-square SVG in `LayoutResults.svelte`'s empty state.

### Card treatment

- Define a Tailwind utility class (or a `.blueprint-card` CSS class in `layout.css`) that:
  - Border 1px solid `--color-blueprint-cyan-dim`
  - `rounded-none` (or very small radius like 2px)
  - Has `::before` and `::after` pseudo-elements drawing 6×6 px corner ticks in `--color-blueprint-cyan` at top-left and bottom-right
- Apply to: layout summary card, SuggestionsPanel card, the empty-state hero in PieceList. **Not** applied to the per-sheet SVG container (the SVG itself is the drawing).

### Background texture

- Inline SVG-noise filter referenced as a `data:` URI background image on `<body>` or the root `<div>`:
  - SVG `<filter>` with `feTurbulence` baseFrequency ~0.9, numOctaves 2
  - Layer at ~3% opacity over the existing dark surface
- Pure CSS, no JS, ~200 bytes.

### Waste color scale

- Compute color in a small helper `wasteClass(percent: number): 'text-success' | 'text-warn' | 'text-danger'` in `src/lib/colors.ts` (or a new `src/lib/waste-color.ts`):
  - `< 15` → `text-success`
  - `15..30` → `text-warn`
  - `> 30` → `text-danger`
- Apply in `LayoutResults.svelte` and `LayoutPreview.svelte` (replacing the inline `wasteColor = $derived(...)` chains and the per-sheet color logic). Existing `text-kerf`/`text-plywood`/`text-success` usages collapse to this helper.
- Add a tiny three-dot legend next to the waste display: three small circles in green/amber/red with thresholds, only on the totals card.

### Page-load motion

- New CSS class `.sheet-reveal` applied to per-sheet wrappers:
  - `@keyframes sheet-reveal` — translateY(8px) → 0, opacity 0 → 1, 200ms ease-out.
  - `animation-delay` set inline via Svelte: `style:animation-delay={`${index * 80}ms`}` on each `<LayoutPreview>` wrapper.
  - `@media (prefers-reduced-motion: reduce) { .sheet-reveal { animation: none; opacity: 1; transform: none; } }`
- No motion on subsequent piece edits — only on initial mount or when the sheets array changes from empty to non-empty.

### Files touched

- **New**: `src/lib/components/BlueprintSheetIllustration.svelte`, `src/lib/waste-color.ts`
- **Modified**:
  - `src/routes/layout.css` — font imports, new color tokens, blueprint-card utility, paper-noise background, sheet-reveal animation
  - `src/routes/+page.svelte` — wordmark with corner ticks, optional title-block subtitle styling
  - `src/lib/components/LayoutResults.svelte` — replace empty-state SVG with `<BlueprintSheetIllustration>`, apply blueprint-card to summary, use `wasteClass`, add legend, mount sheet-reveal on `<LayoutPreview>`
  - `src/lib/components/LayoutPreview.svelte` — apply `wasteClass`
  - `src/lib/components/SuggestionsPanel.svelte` — apply blueprint-card
  - `src/lib/components/PieceList.svelte` — apply blueprint-card to the empty-state hero
  - `src/lib/components/SheetSVG.svelte` — set `font-family` on text elements to IBM Plex Mono so the SVG inherits the blueprint typography
- `package.json` — `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` added under `dependencies`

### Constraints

- **Tableau piece palette unchanged.** Do not touch `src/lib/colors.ts` getColor / palette.
- **Algorithm output unchanged.** No changes to `algorithm.ts`, `lumber-algorithm.ts`, `suggestions.ts`.
- **Aria/keyboard semantics unchanged.** Wordmark stays an `<h1>` (semantically the page title). Corner-tick decorations are CSS pseudo-elements or `aria-hidden` SVG.
- **No new motion outside the sheet-reveal**, with `prefers-reduced-motion` honored.
- **No new third-party CSS or component libraries.** Tailwind 4 + Svelte 5 runes only. Self-hosted fonts, not Google CDN (privacy + offline).
- **Bundle delta**: < 80 KB gzipped including both fonts (IBM Plex Sans regular+semibold + IBM Plex Mono regular+semibold; subset to Latin only via `@fontsource`'s default).
- **PDF output**: the jsPDF-rendered PDF currently uses jsPDF default fonts. **Out of scope** for this slice — leaving PDF typography alone. Spec'd for a future slice if desired.

### Out of scope

- Light-mode / cream-paper variant
- Cyanotype full-blue background (spec stays on the existing dark base; only the accent/hairline color is cyanotype)
- Custom logo redesign / favicon update
- Animated dimension lines on hover
- PDF typography refresh
- Any IA changes (Slice B)
- Any text/copy changes (the text content stays exactly as Slice A left it)

---

## 4. Acceptance Criteria

Visual / aesthetic:
- [ ] All UI text outside the layout SVG renders in IBM Plex Sans (verified in DevTools → Computed → font-family).
- [ ] All numeric displays render in IBM Plex Mono.
- [ ] The wordmark reads "CUTLIST" in IBM Plex Mono uppercase, letterspaced, with visible corner ticks framing it.
- [ ] The empty layout area displays the dimensioned-line sheet illustration with `48"` / `96"` callouts and arrows.
- [ ] The summary card, SuggestionsPanel, and the empty-state hero all carry hairline borders and visible corner ticks.
- [ ] A subtle paper-fiber texture is visible on the page background at 100% zoom; not visible enough to interfere with text contrast.
- [ ] Waste percentages render `green / amber / red` per the 3-stop scale; a small legend adjacent to the totals card shows the thresholds.
- [ ] Sheet cards stagger-fade in on initial page load with N>=1 sheets.

Functional / regression:
- [ ] All existing Vitest suites pass.
- [ ] All existing Playwright e2e suites' green tests stay green; pre-existing csv-import failures remain pre-existing.
- [ ] The Tableau piece-color palette in the SVG is unchanged. (Visual diff against `main` for a known cutlist shows piece colors identical.)
- [ ] Algorithm output (`store.result.totalSheets`, `store.result.totalWastePercent`, `store.result.unfitPieces`) is identical for the closet CSV before and after.
- [ ] `npm run check` passes.

Performance / a11y:
- [ ] Bundle size delta < 80 KB gzipped.
- [ ] First contentful paint regression < 100 ms (rough eyeball; not a strict gate).
- [ ] With `prefers-reduced-motion: reduce`, no sheet-reveal animation runs.
- [ ] Lighthouse accessibility score does not regress against `main`.
- [ ] All focus rings remain visible against the new chrome.

---

## Consistency Gate

- [x] Intent unambiguous.
- [x] Every behavior in intent has at least one Gherkin scenario.
- [x] Architecture constrains implementation to chrome-only changes; piece colors, algorithm, IA, and PDF output explicitly out of scope.
- [x] Naming consistent: "blueprint", "cyan hairline", "corner ticks", "dimensioned-line illustration", "wordmark", "title block", "3-stop waste scale", `wasteClass`, `BlueprintSheetIllustration`, `blueprint-card`, `sheet-reveal`.
- [x] No artifact contradicts another.

**Verdict: PASS.** Ready for `/agentic-dev-team:plan` (and your sign-off on the call-out items below first if any need redirecting).

---

## Decisions log

- **Theme base**: keep dark. Do not flip to light/cream. Reason: existing piece colors are tuned for dark, persisted-state users would be jarred by a flip, and the dark base happens to be a defensible "drafting table at night" reading.
- **Cyanotype intensity**: cyan is used as **accent / hairline / dimension** color, not as the dominant background. Full cyanotype-blue background was considered and rejected as too high-risk for this slice.
- **Typography pair**: **IBM Plex Sans** + **IBM Plex Mono** (Google Fonts; self-hosted via `@fontsource`). Same family, different shapes — gives a coherent "machine-precise drafting" voice. The user asked for "blueprint typography"; IBM Plex is the cleanest open-source pair that reads as engineering/drafting without being a hand-lettered novelty face. **Open to redirect** if the user prefers a hand-drafted look (e.g., Architects Daughter), in which case I'll re-spec.
- **Plywood-orange retention**: kept as the primary action color (Apply, Download PDF). It harmonizes well with cyan — orange and cyan are complementary. Replacing it with cyan would weaken the action affordance and make every CTA feel passive.
- **Wordmark**: simple HTML+CSS implementation with pseudo-element corner ticks. Avoids dragging in an SVG asset that needs to be maintained alongside the existing plywood-icon glyph.
- **Background texture**: SVG `feTurbulence` `data:` URI, ~3% opacity. Cheap (no extra image asset) and easy to dial up/down.
- **3-stop waste thresholds**: `< 15% / 15..30% / > 30%`. Open to redirect if you want different thresholds (e.g., `< 10 / 10..20 / > 20` for a stricter shop).
- **Page-load motion**: 200 ms duration, 80 ms stagger. Subtle, not flashy. `prefers-reduced-motion` honored.
- **PDF stays on default fonts**: matching the PDF to the new typography requires registering custom fonts with jsPDF, which is non-trivial. Deferred to a possible Slice D.

---

## Calls that warrant maintainer sign-off before planning

1. **IBM Plex Sans + Mono** — confirm or pick differently. Alternatives if you want a more hand-drafted feel: **Architects Daughter** (handwritten engineering), **Special Elite** (typewriter), **Big Shoulders Stencil + IBM Plex Mono** (engineering stencil wordmark + technical body). My recommendation stands as IBM Plex pair for the cleanest result.
2. **Cyan accent intensity** — keep cyan as hairlines + dimension callouts only, **or** push it further (e.g., recolor links and progress hints to cyan)?
3. **Waste thresholds** — accept `<15 / 15-30 / >30`, or different cutoffs?
4. **PDF typography** — confirm we leave the PDF alone for v1 (recommended) or commit to matching the new chrome (adds a Slice D).

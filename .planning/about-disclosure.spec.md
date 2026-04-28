# Spec: Collapse the "About Cutlist" section into a `<details>` disclosure

Status: **Consistency gate PASSED** — ready for planning.

Slice: single vertical slice. One file changed: `src/routes/+page.svelte`.

---

## 1. Intent Description

The home page currently shows a ~250-word "About Cutlist" prose section below
the app. It carries the page's only `<h2>` and most of its keyword-rich body
copy ("free cut list optimizer for woodworkers", "kerf-aware bin packing",
"plywood / MDF / sheet goods", "1D bin packing for dimensional lumber",
"4×8 sheet of plywood", etc.). The visual goal is to declutter the page; the
SEO constraint is that we must not lose this content from the indexed HTML.

Wrap the section in a native `<details>` disclosure, closed by default, with
a short `<summary>` button. The full prose and the existing `<h2>` stay
inside the `<details>` content — they remain in the rendered DOM regardless
of open/closed state, so Google indexes them normally (this is the documented
behavior of `<details>`, unlike CSS-hidden or JS-injected modal content).
Visitors see a collapsed disclosure by default and can expand it on demand.

No content changes. No new components. No new dependencies. No JavaScript —
`<details>` is a native HTML element with built-in keyboard and screen-reader
support.

---

## 2. User-Facing Behavior (Gherkin)

```gherkin
Feature: About-section disclosure

  Scenario: First-time visitor sees the disclosure collapsed
    Given I load the Cutlist Calculator page
    Then I see a "About Cutlist" disclosure trigger below the main app
    And the prose body is not visible
    And the page layout below the app is shorter than before

  Scenario: Visitor expands the disclosure to read the about content
    Given the "About Cutlist" disclosure is collapsed
    When I click the disclosure trigger
    Then the prose body becomes visible
    And the heading "Free cut list optimizer for woodworkers" is visible
    And all four paragraphs of the previous About section are visible

  Scenario: Visitor collapses the disclosure
    Given the "About Cutlist" disclosure is expanded
    When I click the disclosure trigger
    Then the prose body is hidden again

  Scenario: Keyboard user toggles the disclosure
    Given the "About Cutlist" disclosure is collapsed and focused
    When I press Enter or Space
    Then the disclosure expands
    And pressing Enter or Space again collapses it

  Scenario: Search engine crawler sees the keyword content
    Given a crawler fetches the page HTML
    Then the rendered DOM contains the "Free cut list optimizer for woodworkers" h2
    And the rendered DOM contains all four paragraphs of about content
    And the content is in the DOM regardless of the disclosure's open/closed state

  Scenario: Screen reader user hears the disclosure semantics
    Given I navigate to the disclosure with a screen reader
    Then it is announced as a collapsed disclosure (or "button, collapsed")
    And expanding it announces the contained heading and content
```

---

## 3. Architecture Specification

### Components

- **Modified** `src/routes/+page.svelte` — wrap the existing
  `<section aria-label="About Cutlist">` block (lines 143–175) in a
  `<details>` element. Replace the section's outer wrapper with `<details>`
  and add a `<summary>` as its first child. Keep all existing children
  (the `<h2>` and four `<p>` paragraphs) unchanged inside.

### Markup shape (target)

```html
<details class="mt-12 max-w-3xl">
  <summary class="text-base font-semibold text-shop-text cursor-pointer
                  text-shop-muted hover:text-shop-text">
    About Cutlist
  </summary>
  <div class="mt-4 text-sm leading-relaxed text-shop-muted space-y-4">
    <h2 class="text-base font-semibold text-shop-text">
      Free cut list optimizer for woodworkers
    </h2>
    <p>…</p>
    <p>…</p>
    <p>…</p>
    <p>…</p>
  </div>
</details>
```

### Constraints

- Content text inside the disclosure MUST be byte-identical to the current
  prose. No edits, condensations, or rewrites.
- The `<h2>` heading MUST remain in the DOM (inside the `<details>` content,
  not replaced by the summary).
- The disclosure MUST default to closed (`<details>` without the `open`
  attribute).
- The disclosure MUST be a native `<details>` element. Do not implement a
  custom JS modal, ARIA-only widget, or CSS-only hide trick.
- No `aria-hidden`, `hidden` attribute, or `display:none` toggling on the
  inner content (would defeat indexing or break native behavior).
- No new dependencies, no new components, no JavaScript.

### Out of scope

- Any rewrite, expansion, or trimming of the About content
- Multiple disclosures (e.g., per-paragraph, FAQ-style) — single disclosure only
- Animation / transition styling beyond the browser default
- Persisting open/closed state across page loads (localStorage)
- Moving the section to a separate route

---

## 4. Acceptance Criteria

Functional:
- [ ] On first page load, the prose body is collapsed; only the summary "About Cutlist" is visible.
- [ ] Clicking the summary expands the disclosure and reveals the existing `<h2>` and all four paragraphs.
- [ ] Clicking again collapses it.
- [ ] The Enter and Space keys toggle the disclosure when the summary has focus.

SEO / content:
- [ ] `view-source:` of the page shows the `<h2>Free cut list optimizer for woodworkers</h2>` and all four paragraphs in the rendered HTML, regardless of whether the disclosure is open.
- [ ] No paragraph text was edited; a `diff` against `main` shows only structural wrapping (`<section>` → `<details>`/`<summary>`/`<div>`) and class changes, no prose changes.
- [ ] The page still has exactly one `<h1>` ("Cutlist") and at least one `<h2>` (the About heading).

Accessibility:
- [ ] The summary is keyboard-reachable in natural Tab order.
- [ ] Screen reader announces the summary as a disclosure / button with expanded/collapsed state.
- [ ] No `outline:none` or other focus-suppressing styles on the summary.

Quality:
- [ ] No new dependencies.
- [ ] No new components or files.
- [ ] `npm run check` passes.
- [ ] All existing Vitest and Playwright tests still pass.
- [ ] Manual visual check at 360 / 768 / 1280 px viewport widths: layout looks intact, summary tap target is comfortable on mobile.
- [ ] Manual SEO smoke: `curl -s http://localhost:5173/ | grep -c "Free cut list optimizer for woodworkers"` returns ≥ 1.

---

## Consistency Gate

- [x] Intent unambiguous.
- [x] Every behavior in intent has at least one Gherkin scenario.
- [x] Architecture constrains implementation to a one-element refactor.
- [x] Naming consistent across artifacts: "About Cutlist" (summary), "Free cut list optimizer for woodworkers" (h2), `<details>`, `<summary>`.
- [x] No artifact contradicts another.

**Verdict: PASS.** Ready for `/agentic-dev-team:plan`.

---

## Decisions log

- Implementation: **native `<details>` / `<summary>`** — Google indexes
  contained content regardless of open state, no JS required, free
  keyboard + screen-reader support.
- Default state: **closed** — matches the "declutter" motivation. SEO is
  unaffected by open/closed since the content stays in the DOM either way.
- Summary text: **"About Cutlist"** — short, button-like. Open to redirect:
  alternatives include "About this tool", "What is this?", or putting the
  H2 itself inside the summary.
- Heading placement: **`<h2>` stays inside the `<details>` body**, not
  inside `<summary>`. Cleanest semantics: summary is the disclosure trigger,
  the heading is part of the disclosed content.
- Position on page: **unchanged** — same place in the DOM as today.
- Tests: **manual verification only**. The change is one element wrapping
  existing JSX; an automated regression test would verify framework behavior
  rather than our logic. The pre-PR `curl | grep` and visual check are
  sufficient.

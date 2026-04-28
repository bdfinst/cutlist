# Plan: Collapse About section into `<details>` disclosure

**Created**: 2026-04-28
**Branch**: feat/about-disclosure (to be created)
**Status**: approved
**Spec**: [.planning/about-disclosure.spec.md](./about-disclosure.spec.md)

## Goal

Wrap the existing About-Cutlist prose section in `src/routes/+page.svelte`
in a native `<details>`/`<summary>` element, closed by default. The full
prose and `<h2>` stay in the DOM (so SEO is unchanged) but the page is
visually decluttered on first load.

## Acceptance Criteria

- [ ] Page first-load shows a collapsed disclosure with "About Cutlist" as the trigger; the prose is hidden by default.
- [ ] Clicking (or pressing Enter/Space on) the summary expands the disclosure and reveals the existing `<h2>` and all four paragraphs.
- [ ] `view-source:` of the rendered page contains the `<h2>Free cut list optimizer for woodworkers</h2>` and all four paragraphs verbatim, with no edits to the prose text.
- [ ] No new dependencies, no new files, no JavaScript added.
- [ ] All existing Vitest and Playwright tests still pass.
- [ ] `npm run check` passes.

## Steps

### Step 1: Replace `<section>` wrapper with `<details>` / `<summary>`

**Complexity**: trivial
**RED**: No automated test added — the change is structural HTML wrapping; a unit test would assert framework behavior, not our logic. Manual verification per the pre-PR gate covers regression risk.
**GREEN**: Edit `src/routes/+page.svelte`. Replace the existing block at lines 143–175:

```svelte
<section
    aria-label="About Cutlist"
    class="mt-12 max-w-3xl text-sm leading-relaxed text-shop-muted space-y-4"
>
    <h2 class="text-base font-semibold text-shop-text">
        Free cut list optimizer for woodworkers
    </h2>
    <p>…</p>
    <p>…</p>
    <p>…</p>
    <p>…</p>
</section>
```

with:

```svelte
<details class="mt-12 max-w-3xl">
    <summary class="cursor-pointer text-base font-semibold text-shop-muted hover:text-shop-text">
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

The four `<p>` elements and their content are preserved byte-for-byte from the existing file.

**REFACTOR**: None. If browser default `▶` marker styling looks visually off against the dark theme, adjust the `summary` color/marker styling minimally — but only if the visual check fails.

**Files**: `src/routes/+page.svelte`

**Commit**: `ui: collapse About section into a <details> disclosure`

---

## Complexity Classification

| Step | Rating | Reason |
|------|--------|--------|
| 1 | trivial | One file, structural wrap, no logic change |

## Pre-PR Quality Gate

- [ ] `npm test` — full Vitest suite still passes
- [ ] `npm run check` — 0 errors, 0 warnings
- [ ] `CI=1 npx playwright test e2e/donate.spec.ts` (and any other authored e2e) — pass; pre-existing `csv-import.spec.ts` failures stay pre-existing
- [ ] `npm run build` — succeeds
- [ ] **SEO smoke**: with `npm run dev` running, `curl -s http://localhost:5173/ | grep -c "Free cut list optimizer for woodworkers"` returns ≥ 1, AND `curl -s http://localhost:5173/ | grep -c "kerf-aware guillotine bin packing"` returns ≥ 1 (confirms paragraph content is in the rendered HTML even when disclosure is closed)
- [ ] **Visual check** at 360 / 768 / 1280 px: summary is visible and tap-friendly, expands/collapses cleanly
- [ ] **Keyboard check**: Tab to summary, Enter expands, Enter collapses
- [ ] **Heading hierarchy**: page still has one `<h1>` (Cutlist) and at least one `<h2>` (About heading inside the disclosure)

## Risks & Open Questions

- **Default `▶` marker on dark background** — Browser default disclosure markers vary (filled triangle in Chrome, arrow in Safari) and may render at low contrast against the dark theme. Mitigation: visual check; if poor, set a minimal `marker-color` via CSS or use `list-style: none` and a custom indicator. Not pre-emptively styling — fix only if the visual check flags it.
- **Cumulative Layout Shift (CLS) when expanded** — Expanding the disclosure pushes nothing below it (it's the last block in `<main>`), so CLS impact is negligible. No mitigation needed.
- **No regression test** — A future edit could remove the disclosure wrapper or hide the H2 without any failing test. Accepted risk for v1; can be added later as a Playwright `expect(page.locator('details summary')).toContainText('About Cutlist')` if the section grows or risk increases.

# Plan: Plywood / Lumber / Both Mode Toggle (Slice B)

**Created**: 2026-04-28
**Branch**: feat/mode-toggle (off `main`, independent of Slice A and C)
**Status**: approved
**Spec**: [.planning/mode-toggle.spec.md](./mode-toggle.spec.md)

## Goal

Add a 3-state mode selector at the top of the input rail and conditionally
render the plywood vs lumber UI based on selection. Persist mode in
localStorage with a smart migration for existing visitors. No algorithm
changes, no aesthetic changes (Slice C territory).

## Acceptance Criteria

- [ ] New `CutlistMode` type (`'plywood' | 'lumber' | 'both'`).
- [ ] `<ModeSelector>` renders three buttons; the active one shows `aria-pressed="true"` and a filled visual treatment; the group has `role="group" aria-label="Cutlist mode"`.
- [ ] `store.mode` defaults to `'plywood'` for new visitors.
- [ ] Hydration migrates pre-slice persisted state: `'both'` if any lumber data exists, otherwise `'plywood'`.
- [ ] In Plywood mode: only `<SheetConfig>`, `<PieceList>`, `<LayoutResults>` render.
- [ ] In Lumber mode: `<SheetConfig>` is hidden, a minimal `<KerfInput>` renders instead, plus `<LumberTypeList>`, `<LumberPieceList>`, `<LumberResults>`.
- [ ] In Both mode: everything renders (current behavior).
- [ ] Mode survives `location.reload()`.
- [ ] All existing Vitest suites still pass; new tests cover the store + migration.
- [ ] `npm run check` passes; no new deps.

## Steps

### Step 1: Type + store + persistence migration with tests

**Complexity**: standard
**RED**: Add `test/store-mode.spec.ts`:

```
describe('store.mode')
  it('defaults to "plywood"')
  it('setMode("lumber") updates state')
  it('setMode("both") updates state')

describe('hydrate migration')
  it('uses persisted mode when present')
  it('migrates pre-slice state with lumber types to "both"')
  it('migrates pre-slice state with lumber pieces to "both"')
  it('migrates pre-slice state with no lumber data to "plywood"')
```

**GREEN**:
- Add `CutlistMode` to `src/lib/types.ts`.
- In `src/lib/persistence.ts`, extend `PersistedState` with `mode?: CutlistMode`. The save path serializes whatever the store has; the read path tolerates the missing field.
- In `src/lib/stores.svelte.ts`:
  - `mode = $state<CutlistMode>('plywood')`.
  - `setMode(mode: CutlistMode): void` — `this.mode = mode`.
  - `#hydrate()` — when the loaded blob has `mode`, use it. When absent, derive from `data.lumberTypes.length > 0 || data.lumberPieces.length > 0`.
  - The persistence `$effect` snapshot now includes `mode: this.mode`.
- Reset action (`reset()`) sets `mode = 'plywood'` (matches default; user can re-toggle).

**REFACTOR**: None.
**Files**: `src/lib/types.ts`, `src/lib/stores.svelte.ts`, `src/lib/persistence.ts`, `test/store-mode.spec.ts`
**Commit**: `feat(store): add mode field with smart hydration migration`

---

### Step 2: ModeSelector + KerfInput components

**Complexity**: standard
**RED**: No automated test (visual / DOM behavior).
**GREEN**:
- Create `src/lib/components/ModeSelector.svelte`:
  - Three buttons rendered from a `[{value: 'plywood', label: 'Plywood'}, …]` array.
  - Active button: `bg-plywood text-shop-dark font-semibold` + `aria-pressed="true"`. Inactive: existing ghost-button styles + `aria-pressed="false"`.
  - Container: `<div role="group" aria-label="Cutlist mode" class="flex gap-1.5">`.
  - Click handler: `store.setMode(value)`.
- Create `src/lib/components/KerfInput.svelte`:
  - Standalone Kerf field bound to `store.config.kerf`. Shape mirrors the existing kerf input inside `SheetConfig.svelte` (same `step={0.0625}`, `min="0"`, error styling, "in" suffix).
  - One-line, consistent with the SheetConfig kerf row.

**REFACTOR**: If the kerf input markup duplicates the SheetConfig version verbatim, leave the duplication for v1; extracting a shared atom would balloon the diff. Note in the plan; reassess in a follow-up if a third call site appears.
**Files**: `src/lib/components/ModeSelector.svelte`, `src/lib/components/KerfInput.svelte`
**Commit**: `feat(ui): add ModeSelector and minimal KerfInput components`

---

### Step 3: Conditional rendering in `+page.svelte`

**Complexity**: standard
**RED**: No automated test.
**GREEN**:
- Import `ModeSelector` and `KerfInput` in `src/routes/+page.svelte`.
- Render `<ModeSelector />` at the top of the left rail (above SheetConfig).
- Wrap sections per the spec:
  ```svelte
  {#if store.mode !== 'lumber'}
    <SheetConfig />
    <div class="border-t border-shop-light"></div>
    <PieceList />
  {:else}
    <KerfInput />
  {/if}
  {#if store.mode !== 'plywood'}
    {#if store.mode === 'both'}
      <div class="border-t border-shop-light"></div>
    {/if}
    <LumberTypeList />
    <div class="border-t border-shop-light"></div>
    <LumberPieceList />
  {/if}
  ```
  And in the right rail:
  ```svelte
  {#if store.mode !== 'lumber'}<LayoutResults />{/if}
  {#if store.mode !== 'plywood'}<LumberResults />{/if}
  ```
- Verify the dividers don't double up at edges. Adjust `space-y-5` on the wrapping `<section>` if it now creates redundant spacing.

**REFACTOR**: None.
**Files**: `src/routes/+page.svelte`
**Commit**: `feat(ui): hide irrelevant sections per Cutlist mode`

---

## Complexity Classification

| Step | Rating | Reason |
|------|--------|--------|
| 1 | standard | Type, store action, persistence schema, migration logic, all unit-tested |
| 2 | standard | Two new Svelte components touching store actions and config field |
| 3 | standard | Conditional rendering across the input rail and right panel |

## Pre-PR Quality Gate

- [ ] `npm test` passes (existing 174 + new mode tests)
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] Manual at 1440 / 768 / 390 px:
  - Fresh visitor (clear localStorage) lands in Plywood mode; only plywood sections visible
  - Clicking Lumber hides plywood UI and reveals lumber UI plus the small Kerf input
  - Clicking Both shows everything
  - Importing the closet CSV in Plywood mode adds plywood pieces only; the toast confirms the count
  - Reloading after switching to Lumber stays in Lumber mode
- [ ] Migration sanity: clear localStorage, manually inject a pre-slice blob with `lumberTypes` populated and no `mode`, reload, confirm app comes up in `'both'`
- [ ] No new dependencies in `package.json`

## Risks & Open Questions

- **Persistence schema bump** — Adding `mode?` is forward-compatible. Older app builds reading future blobs simply ignore unknown fields. Newer builds reading older blobs run the migration. No version bump required.
- **Reset behavior** — `store.reset()` already nukes pieces/lumber/config; setting `mode = 'plywood'` keeps the reset semantics consistent. Confirmed in Step 1.
- **Layout reflow on switch** — When switching modes, the input rail height changes. There's no animation; the swap is instant. With `prefers-reduced-motion`, this is fine. Without, a brief flash is acceptable for v1.
- **Kerf input duplication** — `<KerfInput>` and the kerf field inside `<SheetConfig>` carry duplicate markup. v1 accepts this; a future refactor can extract a shared `<NumericField>` atom if a third call site emerges.
- **Mode selector aesthetic** — Uses existing button utilities, not the blueprint card / corner-tick treatment from Slice C. After both slices land, a small follow-up could blueprint-skin the mode selector (e.g. corner-tick around the active button) — out of scope here.
- **`<ModeSelector>` placement vs Slice A's empty hero** — In Plywood mode the Pieces empty hero (Slice A) sits below the mode selector + SheetConfig. Visually this still works, but the hero is no longer the very first thing on the page. Acceptable; the mode selector is small.

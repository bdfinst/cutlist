# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run check` |
| All tests (single run) | `npm test` |
| Tests (watch mode) | `npm run test:unit` |
| Single test file | `npx vitest run test/algorithm.spec.ts` |

## Architecture

Single-page SvelteKit app (Svelte 5, TypeScript) that optimizes plywood cutting layouts.

**Data flow**: User inputs (pieces + sheet config) → reactive `$derived` recomputation of `calculateCutlist()` → SVG visualization → optional PDF export via jsPDF.

### Key modules

- **`src/lib/types.ts`** — All shared interfaces: `PieceDefinition` (user input), `PlacedPiece` (algorithm output), `SheetLayout`, `SheetConfig`, `CutlistResult`
- **`src/lib/algorithm.ts`** — Guillotine bin-packing. Tries four sort strategies (area, longest dimension, shortest dimension, perimeter); picks the result with fewest sheets and least waste. Best-area-fit placement scoring. Kerf consumed when piece doesn't fill the full rect dimension (a cut is needed). Splits free rects into two sub-rects per placement.
- **`src/lib/csv.ts`** — CSV parser with auto header detection, column aliases, quoted field support
- **`src/lib/stores.svelte.ts`** — Centralized reactive state using Svelte 5 runes (class-based: `class CutlistStore` with `$state` for pieces/config, `$derived` for cutlist result)
- **`src/lib/pdf.ts`** — Vector PDF generation with jsPDF (one page per sheet, landscape letter)
- **`src/lib/colors.ts`** — 12-color Tableau colorblind-safe palette, indexed by piece order
- **`src/lib/components/`** — UI components (SheetSVG for SVG rendering, PieceList/PieceInput for data entry, SheetConfig for settings, LayoutResults/LayoutPreview for output)

### Algorithm details

The algorithm uses guillotine cuts only (every cut goes edge-to-edge, matching real woodworking). Kerf is consumed when a piece doesn't fill the full dimension of its free rectangle (meaning a cut is needed to separate it from remaining material). When `grainDirection` is true, pieces cannot rotate. Pieces too large for any sheet are collected in `unfitPieces[]`. Four sort strategies are tried and the best result is selected.

### Tests

Tests live in `./test/` (not alongside source). Import source via `$lib/` aliases.

## Conventions

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`, `$props`, `$bindable`. No legacy stores or `onMount`/`beforeUpdate`.
- **All dimensions in inches** — sheet defaults: 48×96 (4'×8'), kerf default: 0.125 (1/8")
- **ES modules only** — `"type": "module"` in package.json, no `require()` or `module.exports`
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin, imported in `src/routes/layout.css`
- **Vitest** requires assertions (`expect.requireAssertions: true` in config) — every test must assert

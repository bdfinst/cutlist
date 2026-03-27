# Cutlist Calculator

When you're building something out of plywood -- a bookshelf, a closet organizer, a shop cabinet -- you start with a list of parts and a stack of 4'x8' sheets. The question is: how do you cut all those parts from as few sheets as possible?

This app answers that. You give it your parts list (or import one from a CSV), tell it your sheet size and saw blade width, and it figures out how to arrange every piece on the fewest sheets with the least waste. Then it draws the layout so you can see exactly where each cut goes, and exports a PDF you can print and take to the shop.

Every cut in the layout is a **guillotine cut** -- a straight line that goes all the way across the sheet, because that's the only kind of cut you can make with a table saw or a track saw on a full sheet of plywood.

## What it looks like

1. **Left panel** -- enter your sheet dimensions (default 4'x8'), kerf (saw blade width, default 1/8"), and your parts. Each part has a name, width, height, and quantity. You can type them in one at a time or import a CSV.
2. **Right panel** -- the optimized layout appears immediately. Each sheet is drawn as a color-coded diagram showing where every part goes, with waste areas shown as a grid pattern. A summary bar shows total sheet count and waste percentage.
3. **Download PDF** -- one click gives you a printable document with each sheet on its own page, plus a parts list summary at the end.

## Why it exists

Plywood is expensive. A typical 4'x8' sheet of cabinet-grade birch plywood runs $60-90. If your project needs 15 parts across 3 sheets, poor layout planning can push you to 4 or 5 sheets -- $120-180 wasted because you didn't think through the cuts. This tool does that thinking for you.

It also accounts for details that are easy to forget by hand:
- **Kerf** -- your saw blade removes material (typically 1/8"). Two pieces that look like they fit side-by-side might not once you account for the blade width between them.
- **Grain direction** -- when wood grain matters, parts can't be rotated 90 degrees to fit better. The optimizer respects this constraint.

## Getting started

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

1. **Configure your sheet** -- set width, height, kerf, and whether grain direction matters
2. **Add pieces** -- click "Add piece" for manual entry, or "Import CSV" to load from a spreadsheet
3. **Review the layout** -- the right panel updates instantly as you change inputs
4. **Download PDF** -- get a printable shop document

### CSV format

The importer accepts CSV files with or without headers. With headers, columns are matched by name (case-insensitive):

```csv
name,width,height,qty
Shelf,14,25.5,5
Side Panel,14,66,2
Wall Cleat,3.5,55,1
```

Without headers, columns are positional: label, width, height, quantity. Quantity defaults to 1 if omitted. Rows with invalid dimensions are skipped with warnings.

Supported column names: `label`/`name`/`piece`, `width`/`w`, `height`/`h`, `quantity`/`qty`/`count`.

## How the optimizer works

The algorithm uses guillotine bin-packing -- every cut goes fully edge-to-edge, the only cut type possible on a table saw or with a track saw and straight edge.

1. Expand part quantities into individual pieces (e.g., "Shelf x5" becomes 5 separate pieces)
2. Try four different sorting strategies: by area, longest dimension, shortest dimension, and perimeter
3. For each strategy, greedily place each piece into the tightest-fitting free rectangle across all sheets
4. If rotation is allowed (grain lock off), try both orientations for each piece
5. After placing a piece, split the remaining free space into two sub-rectangles (the guillotine split)
6. Kerf is consumed only when a cut is actually needed -- if a piece fills the full width or height of its free rectangle, no blade width is subtracted on that edge
7. Compare all four strategies and keep the layout with the fewest sheets and least waste

## Features

- **Kerf-aware placement** -- accounts for saw blade width between pieces
- **Multi-strategy optimization** -- tries four sort strategies, picks the best result
- **Grain direction lock** -- prevents piece rotation when wood grain matters
- **CSV import** -- bulk-load parts from a spreadsheet with auto-detected headers
- **SVG visualization** -- color-coded layouts with labels, dimensions, and grid-pattern waste areas
- **PDF export** -- vector PDF with one page per sheet plus a parts list summary
- **Persistent state** -- your pieces and config survive page refreshes via localStorage
- **Accessible** -- semantic HTML, keyboard navigation, screen-reader support

## Project structure

```
src/
  lib/
    algorithm.ts          -- Guillotine bin-packing with multi-strategy sort
    csv.ts                -- CSV parser with header detection
    colors.ts             -- Tableau colorblind-safe palette, hex-to-RGB, contrast
    pdf.ts                -- Vector PDF generation with jsPDF
    types.ts              -- Shared TypeScript interfaces
    stores.svelte.ts      -- Reactive state (Svelte 5 class-based runes)
    components/
      SheetConfig.svelte  -- Sheet dimensions, kerf, grain lock
      PieceList.svelte    -- Piece list with add/remove/reset/import
      PieceInput.svelte   -- Single piece row with inline editing
      LayoutResults.svelte -- Summary stats, unfit warnings, PDF download
      LayoutPreview.svelte -- Per-sheet header with waste indicator
      SheetSVG.svelte     -- SVG rendering with grid waste, clipped labels
  routes/
    +page.svelte          -- Main page layout
    +layout.svelte        -- App shell
    layout.css            -- Tailwind config, theme, custom styles
test/
  algorithm.spec.ts       -- 16 algorithm tests
  csv.spec.ts             -- 20 CSV parser tests
```

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run check` |
| All tests | `npm test` |
| Tests (watch) | `npm run test:unit` |
| Single test file | `npx vitest run test/algorithm.spec.ts` |

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) with Svelte 5 runes
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/) via `@tailwindcss/vite`
- [jsPDF](https://github.com/parallax/jsPDF) for client-side PDF generation
- [Vitest](https://vitest.dev/) for unit tests

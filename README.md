# Cutlist Calculator

A plywood cutting optimizer for woodworkers. Enter your parts, configure your sheet stock, and get an optimized cutting layout that minimizes waste with guillotine-only cuts.

Built with SvelteKit (Svelte 5), TypeScript, and Tailwind CSS 4.

## Features

- **Guillotine bin-packing** -- every cut goes edge-to-edge, matching how you actually cut plywood on a table saw or track saw
- **Kerf-aware placement** -- accounts for saw blade width between pieces; no kerf consumed against sheet edges where no cut is needed
- **Multi-strategy optimization** -- tries four sort strategies (area, longest dimension, shortest dimension, perimeter) and picks the layout with the least waste
- **Grain direction lock** -- prevents piece rotation when wood grain orientation matters
- **CSV import** -- bulk-load parts from a spreadsheet; auto-detects headers, supports column aliases (`name`/`label`/`piece`, `w`/`width`, `h`/`height`, `qty`/`quantity`/`count`)
- **SVG visualization** -- color-coded pieces with labels, dimensions, and grid-pattern waste areas; text auto-scales and clips to piece bounds
- **PDF export** -- vector PDF with one landscape letter-size page per sheet plus a parts list summary
- **localStorage persistence** -- your pieces and config survive page refreshes
- **Accessible** -- semantic HTML, aria-live announcements, aria-describedby on validation errors, keyboard navigation, focus management, screen-reader piece detail tables

## Getting started

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

1. **Configure your sheet** -- set width, height (default 4'x8' / 48"x96"), kerf (default 1/8"), and grain lock
2. **Add pieces** -- click "Add piece" for manual entry, or "Import CSV" to load from a file
3. **Review the layout** -- the right panel shows optimized sheet layouts with waste percentages
4. **Download PDF** -- get a printable shop document to take to the workshop

### CSV format

The importer accepts CSV files with or without headers. With headers, columns are matched by name (case-insensitive):

```csv
name,width,height,qty
Shelf,14,25.5,5
Side Panel,14,66,2
Wall Cleat,3.5,55,1
```

Without headers, columns are positional: label, width, height, quantity. Quantity defaults to 1 if omitted. Rows with invalid dimensions are skipped with warnings.

## Project structure

```
src/
  lib/
    algorithm.ts          -- Guillotine bin-packing with multi-strategy sort
    algorithm.spec.ts     -- 16 algorithm tests
    csv.ts                -- CSV parser with header detection
    csv.spec.ts           -- 20 CSV parser tests
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
```

## Algorithm

The optimizer uses guillotine bin-packing, which means every cut goes fully edge-to-edge -- the only cut type possible on a table saw or with a straight edge.

1. Expand piece quantities into individual items
2. Try four sort strategies: area descending, longest dimension first, shortest dimension first, perimeter descending
3. For each strategy, greedily place each piece into the best-fit free rectangle across all sheets
4. If rotation is allowed (grain lock off), try both orientations
5. On placement, split the free rectangle into two sub-rects (guillotine split)
6. Kerf is consumed only when the piece doesn't fill the full rect dimension (a cut is needed)
7. Pick the strategy that produces the fewest sheets and least waste

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run check` |
| All tests | `npm test` |
| Tests (watch) | `npm run test:unit` |
| Single test file | `npx vitest run src/lib/algorithm.spec.ts` |

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) with Svelte 5 runes
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/) via `@tailwindcss/vite`
- [jsPDF](https://github.com/parallax/jsPDF) for client-side PDF generation
- [Vitest](https://vitest.dev/) for unit tests
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) typography

## License

Private project.

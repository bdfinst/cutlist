# Cutlist Calculator - Implementation Plan

## Context

Building a cutlist calculator web app from scratch. The tool helps woodworkers optimize how to cut pieces from plywood sheets, minimizing waste. Users input desired pieces, configure sheet size/kerf/grain direction, and get a visual layout with PDF download.

## Tech Stack

- SvelteKit (Svelte 5 with runes) + TypeScript
- Tailwind CSS (via `@tailwindcss/vite`)
- jsPDF for PDF generation
- SVG for layout visualization
- Vitest for algorithm tests

## Project Structure

```
src/
  lib/
    types.ts                 -- All TypeScript interfaces
    algorithm.ts             -- Guillotine bin-packing algorithm
    pdf.ts                   -- PDF generation logic
    colors.ts                -- Color palette for pieces
    stores.svelte.ts         -- Shared reactive state (Svelte 5 runes)
    components/
      PieceInput.svelte      -- Single piece row (dimensions + qty)
      PieceList.svelte       -- List of pieces with add/remove
      SheetConfig.svelte     -- Sheet size + kerf + grain toggle
      LayoutPreview.svelte   -- One sheet with header + stats
      LayoutResults.svelte   -- All sheets + summary + PDF button
      SheetSVG.svelte        -- Pure SVG rendering of a single sheet
  routes/
    +page.svelte             -- Main page
    +layout.svelte           -- App shell
  app.css                    -- Tailwind imports
```

## Data Model (`types.ts`)

- **PieceDefinition**: id, label, width, height, quantity, color
- **PlacedPiece**: pieceId, label, x, y, width, height, rotated, color
- **SheetLayout**: sheetIndex, pieces[], wastePercent
- **SheetConfig**: width (default 48"), height (default 96"), kerf (default 0.125"), grainDirection (boolean)
- **CutlistResult**: sheets[], totalSheets, totalWastePercent, unfitPieces[]

## Algorithm: Guillotine Bin-Packing

Guillotine cuts are the only realistic approach for woodworking — every cut goes edge-to-edge.

1. Expand piece quantities into flat list
2. Sort descending by area (largest first)
3. For each piece, find best-area-fit among free rectangles across all sheets
4. If `grainDirection` is false, also try rotated orientation
5. On placement, split free rectangle into two sub-rectangles (guillotine split)
6. Kerf handling: piece consumes `w + kerf` × `h + kerf`, except when flush against sheet edge (no cut needed)
7. Track edge adjacency on free rectangles via `isLeftEdge`, `isTopEdge`, `isRightEdge`, `isBottomEdge`

## SVG Visualization (`SheetSVG.svelte`)

- Inline SVG with `viewBox="0 0 {sheetWidth} {sheetHeight}"`
- Color-coded pieces with labels and dimension text
- Kerf gaps shown as thin lines between pieces
- Responsive scaling via `width="100%"` + `preserveAspectRatio`

## PDF Generation (`pdf.ts`)

- jsPDF with landscape orientation
- One page per sheet, vector drawing (no rasterization)
- Same colors/layout as SVG preview
- Scale factor: `min(10/sheetWidth, 7.5/sheetHeight)` for letter-size pages
- Summary page with parts list

## Implementation Phases

### Phase 1: Scaffold

- `npx sv create` with minimal template + TypeScript
- Install deps: jspdf, tailwindcss, @tailwindcss/vite
- Create `types.ts`, `colors.ts`, base layout

### Phase 2: Data Entry UI

- `stores.svelte.ts` with `$state` and `$derived`
- `SheetConfig.svelte` with presets (4×8, 5×5, 4×4)
- `PieceInput.svelte` + `PieceList.svelte`
- Wire up `+page.svelte`

### Phase 3: Algorithm

- Implement guillotine bin-packing in `algorithm.ts`
- Kerf-aware placement logic
- Vitest unit tests (single piece, exact fit, rotation, multiple sheets, oversized piece, kerf overflow)

### Phase 4: Visualization

- `SheetSVG.svelte`, `LayoutPreview.svelte`, `LayoutResults.svelte`
- Connect `$derived` result to results panel

### Phase 5: PDF Export

- Implement `pdf.ts` with jsPDF
- "Download PDF" button in `LayoutResults.svelte`

### Phase 6: Polish

- Responsive layout (stack on mobile)
- Input validation with error messages
- localStorage persistence
- Reset button, empty/loading states

## Verification

1. `npm run dev` — app loads, can add pieces, configure sheet
2. Add several pieces of varying sizes → layout preview shows colored pieces on sheets
3. Toggle grain direction → pieces should not rotate when enabled
4. Adjust kerf → layout changes, may require more sheets
5. Click "Download PDF" → opens/saves PDF matching the preview
6. `npx vitest` — algorithm tests pass

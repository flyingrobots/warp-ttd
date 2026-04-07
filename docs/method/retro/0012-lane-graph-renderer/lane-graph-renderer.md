# Retrospective — Cycle 0012: Lane Graph Renderer

**Outcome:** hill partially met

## What shipped

- `src/tui/laneGraph.ts` — pure rendering module: `assignColumns`,
  `buildGraphGutter`, `buildGraphGutterCells`, `laneColor`
- Colored lane rails (8-color palette, stable per column)
- Worldline/strand visual distinction (solid `│` vs dashed `┆`)
- Fork connectors (`├` with horizontal `─` to parent column)
- Active dots, pass-through rails, quiet markers
- Graph gutter omitted below 40 cols
- Tick lines simplified to frame index + BLAKE3 digest
- `! conflict` legend in keybinding bar
- 14 new tests (11 graph unit + 3 render integration), 139 total

## Playback

### Agent

1. Testable lane-column assignment? **Yes.**
2. Fork, active, quiet, end-of-life without collisions? **Yes.**
3. Braided strands without column re-allocation? **Yes.**

### User

1. See which lane a tick belongs to without text labels? **Yes** —
   colored dots per column.
2. Strand forks visually connected to parent? **Yes** — horizontal
   `─` connectors between parent and child column.
3. Distinguish worldlines from strands? **Yes** — solid vs dashed
   pass-through, distinct colors.
4. Readable with 5 lanes? **Yes** — but the view is sparse. Frame
   numbers and empty space dominate.

## Drift check

The graph renderer shipped as designed. The rendering primitives are
correct. However, user playback revealed a deeper problem: the
worldline viewer's data model assumes a global frame ordering. WARP
lanes tick independently — there is no global "what tick are we on."
A strand can be thousands of ticks ahead without the parent ever
ticking. The graph renderer is decorating the wrong abstraction.

The hill ("git-log-style lane graph in the gutter") is met in the
literal sense — colored rails, fork connectors, dot markers. But the
view doesn't honestly represent WARP topology because it forces
independent causal histories into a single ordered list.

Additionally, the right 70% of the screen is wasted — selecting a
tick shows nothing about it.

## What we learned

1. Colored lane rails work. Per-column color is the right way to
   distinguish lanes.
2. Fork connectors work. Horizontal `─` between parent and child
   is visually clear.
3. The rendering primitives (column assignment, gutter cells, color
   mapping) are reusable regardless of how the view is restructured.
4. The data model (global frame list, one row per frame) does not
   faithfully represent independent lane ticking.
5. The view needs a detail panel for the selected tick — receipts,
   effects, lane states.

## New backlog items

- `worldline-view-rethink` (ASAP) — rethink the data model to
  represent independent lane ticking honestly
- `worldline-inspector-split` (cool idea) — split view with detail
  panel on the right
- `worldline-strand-selection` (up-next) — select specific lanes
  at a tick, not just jump to frame

## Tech debt

None introduced. The graph primitives are clean and reusable.

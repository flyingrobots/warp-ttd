# Design Doc — Lane Graph Renderer

**Cycle:** 0012-lane-graph-renderer
**Legend:** CV (CORE_VIEWS)
**Type:** feature cycle

## Sponsor Human

Developer scrolling the worldline viewer. Currently sees a flat text
list of ticks with writer names and digest. Needs to see the lane
topology — which strands fork from which worldlines, which lanes are
active vs quiet at each tick, and where conflicts live — at a glance.

## Sponsor Agent

Agent querying `worldline --json`. Already gets `strandIds` per tick.
The graph renderer is a TUI concern — agent benefit is indirect: the
same column-assignment algorithm that drives the visual graph can power
a structured `--graph` JSON output later.

## Hill

The worldline viewer renders a git-log-style lane graph in the gutter:
vertical rails per lane, dots at active ticks, fork connectors where
strands appear, and visual distinction between worldlines and strands.

## Playback Questions

### Agent

1. Does `buildGraphColumn` produce a testable lane-column assignment
   for a given tick history?
2. Does the column assignment handle fork, active, quiet, and
   end-of-life without column collisions?
3. Are braided strands (quiet → active → quiet → active) handled
   without column re-allocation?

### User

1. Can I see which lane a tick belongs to without reading text labels?
2. Are strand forks visually connected to their parent worldline?
3. Can I distinguish worldlines from strands at a glance?
4. Does the graph stay readable with 5 lanes (the complex scenario)?

## Design

### Column assignment

Each lane gets a stable column index for its entire lifetime. Columns
are assigned in catalog order (worldlines first, then strands). No
column reuse — WARP lanes don't merge, so freed columns stay freed.
This keeps the graph stable as you scroll.

The column allocator is a pure function:
`assignColumns(catalog: LaneRef[]) → Map<string, number>`

Worldlines get columns 0..N. Strands get columns N+1..M.

### Graph gutter characters

Per row, per column, one of:

| State | Char | Description |
|-------|------|-------------|
| Active | `●` | This lane has activity at this tick |
| Pass-through | `│` | Lane alive but not active here |
| Fork | `├` | Strand forks from parent at this tick |
| Quiet gap | `·` | Lane alive, no activity, dim indicator |
| Empty | ` ` | Column not allocated or lane not yet born |

Worldline rails use `│`. Strand rails use `┆` (dashed). This gives
instant visual distinction.

### Color

Each column gets a stable color from a palette. Worldlines get bold
colors. Strands get dim variants. Color is decorative — the graph
must be readable without color (accessibility, piped output).

### Integration point

`buildTickLine` currently renders:
```
  ! 0003  mno7890  carol
```

After this cycle:
```
  ● │ ┆   ! 0003  mno7890  carol
```

The graph gutter is prepended. `buildGraphGutter(row, columns, catalog)`
returns a fixed-width string. `buildTickLine` calls it and prepends.

### Width budget

Graph gutter width = `columnCount * 2` characters. With 5 lanes
that's 10 chars. The remaining width goes to the existing tick line
content. If terminal is too narrow (< 40 cols), the graph gutter is
omitted.

## Non-Goals

- Color theming or user-configurable palettes
- Column reuse / compaction when lanes die
- Animated transitions when scrolling
- `--graph` JSON output for CLI (future cycle)
- Horizontal graph orientation

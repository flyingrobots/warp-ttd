# Retrospective — Cycle 0010: Worldline Viewer

**Outcome:** hill partially met

## What shipped

- `src/tui/worldlineLayout.ts` — pure rendering module: `buildTickRows`,
  `buildTickLine`, `scrollWindow`, `renderWorldline`
- `worldline --json` CLI command — `WorldlineTick` JSONL envelopes
- TUI page (4th page) with keyboard navigation (↑/↓ scroll, Enter
  jumps Navigator to selected tick)
- Complex scenario fixture (200 ticks, 5 lanes, 4 writers, conflict
  hotspots, braided strands, periodic effects)
- 28 tests (14 pure helpers, 6 CLI contract, 8 render)

## Playback

### Agent

1. Full tick history as structured JSONL? **Yes.**
2. Writer attribution per tick? **Yes.**
3. Strand fork points? **Yes** (strandIds array).
4. Filter by lane? **No.** Missing `--lane` flag.

### User

1. Scroll through full causal history? **Yes.**
2. Strand forks visually distinct? **No.** Flat text list, not a
   lane graph. This is the main gap.
3. See writers without receipt detail? **Yes.**
4. Jump from worldline to Navigator? **Yes.**
5. Handle 1000+ ticks? **Not tested.** 200 works with virtual scroll.

## Drift check

The design doc said "git-log-like view" with "tree connectors (like
`git log --graph`)." What we built is a scrollable text list with
metadata columns. The data layer is right — `buildTickRows` produces
the correct topology. The rendering layer is wrong — it renders flat
text instead of a lane graph with colored rails and fork connectors.

The design also specified a `worldlineLayout` pure module following
the `navigatorLayout` pattern. This was done correctly.

Additional drift: the Navigator's side-by-side tables clip at narrow
terminal widths. Pre-existing but surfaced during testing.

## What we learned

1. The data model (TickRow with writers, strandIds, hasConflict) is
   sound. The lane graph renderer can consume it directly.
2. WARP strands don't merge — the graph renderer must handle fork,
   active, quiet, reactivate, and end-of-life without assuming a
   merge lifecycle. Braided strands (quiet → active → quiet) are a
   first-class pattern.
3. The complex scenario fixture (200 ticks, 5 lanes) is valuable
   for stress-testing all TUI views, not just the worldline viewer.
4. The Inspector page is a raw data dump and needs its own redesign.

## New backlog items

- `CV_lane-graph-renderer` — the missing piece for visual topology
- `navigator-table-overflow` — side-by-side tables clip at narrow widths
- `inspector-redesign` — raw dump needs a design cycle
- CLI `--lane` filter flag for worldline command (agent playback gap)

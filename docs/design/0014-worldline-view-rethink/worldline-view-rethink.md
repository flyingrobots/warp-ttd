# Design Doc — Worldline View Rethink

**Cycle:** 0014-worldline-view-rethink
**Legend:** CV (CORE_VIEWS)
**Type:** feature cycle

## Sponsor Human

Debugger user investigating a multi-lane WARP session. Needs to select a
lane from the topology, then see that lane's tick history scoped to its
own local clock — without a global frame index flattening independent
causal histories into one list.

## Sponsor Agent

Agent navigating worldline data. Needs to distinguish lane topology
(which lane forks from which) from per-lane tick detail (what happened
inside one lane) so it can answer questions about a specific lane's
history without confusion from other lanes' ticks.

## Hill

The worldline page shows lane topology and per-lane tick history as
two distinct concerns: a lane tree on the left for navigation, and a
scoped tick timeline on the right for the selected lane. No global
frame ordering. Each lane tells its own story.

## Playback Questions

### Agent

1. Can the agent identify which lane is currently selected?
2. Can the agent read the selected lane's tick history without ticks
   from other lanes mixed in?
3. Can the agent see the lane tree topology (parent/child relationships)?
4. Can the agent navigate between lanes and see the timeline update?

### User

1. When I select a lane, do I see only that lane's ticks?
2. Can I see the lane hierarchy (worldlines, strands, forks)?
3. Can I navigate lanes with keyboard and see the detail update?
4. Is the view useful when a strand is thousands of ticks ahead?

## Design

### Layout: split view

```
┌─ Lane Tree ──────────┬─ Tick Timeline ───────────────────────┐
│ ● wl:alpha           │  #42  abc1234  writer-a               │
│   ├ strand:feature-a  │  #41  def5678  writer-b  !           │
│   └ strand:hotfix     │  #40  789abcd  writer-a               │
│ ○ wl:beta            │  #39  ...                              │
│                      │  #38  ...                              │
│                      │                                        │
│                      │                                        │
│ [j/k] nav  [Enter]  │  [j/k] scroll  [q] back                │
└──────────────────────┴────────────────────────────────────────┘
```

Left pane: lane tree with parent/child hierarchy. Worldlines first,
strands indented under their parents. Selected lane highlighted.

Right pane: tick timeline scoped to the selected lane. Each row shows
the lane's local tick index, BTR digest, writer attribution, and
conflict marker. Rendered using the existing `buildTickRows` and
`buildTickLine` helpers — but filtered to a single lane.

### Data flow

1. Session connects → load lane catalog → build lane tree
2. User navigates tree → select a lane
3. On lane selection → filter frames to that lane → `buildTickRows`
   with only that lane's data → render tick timeline
4. Cursor movement in timeline → scroll within that lane's history

### Reuse from existing code

- `buildTickRows` / `buildTickLine` / `scrollWindow` — already pure
  functions in worldlineLayout.ts. They work per-frame but can be
  filtered to a single lane's perspective.
- `buildLaneTree` from navigatorLayout.ts — already builds the
  tree structure we need.
- `laneGraph.ts` — graph gutter is orthogonal. May appear in the
  per-lane timeline later but not in this cycle.

### What changes

- `worldlinePage.ts` model gains `selectedLaneId` and a two-pane
  focus state (tree vs timeline).
- `renderWorldline` becomes a two-pane layout: tree left, timeline
  right.
- Lane tree navigation: j/k to move between lanes, Enter or
  right-arrow to focus the timeline, left-arrow or q to return to
  tree.
- Tick timeline filters to the selected lane only.

### Narrow terminal fallback

Below 60 columns, collapse to single-pane: show the lane tree, and
on Enter show the tick timeline full-width. Back returns to tree.

## Non-Goals

Deferred to future work:

- Cross-lane comparison (viewing multiple lanes simultaneously)
- Graph gutter rails in the per-lane timeline
- Inspector integration (selecting a tick opens the inspector)
- Lane filtering or search

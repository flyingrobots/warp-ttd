# Worldline View Rethink

**Legend:** CV (CORE_VIEWS)

The worldline viewer's fundamental model is wrong. It renders a global
frame index (one row per frame, lanes as columns). But WARP lanes tick
independently — there is no global "what tick are we on." A strand can
be thousands of ticks ahead of its parent worldline without the parent
ever ticking.

The graph renderer (colored rails, fork connectors) is decorating the
wrong abstraction.

## What's wrong

- Global frame ordering flattens independent causal histories
- Can't represent a strand that's 10000 ticks ahead of its worldline
- No way to see what each lane was doing at a selected point
- Selecting a tick gives no detail (70% of the screen is empty)

## What might be right

### Directory-tree + per-lane timeline (strongest candidate)

Lanes are a tree. Display them like a filesystem:

```
wl:alpha/
  strand:long-lived/
  strand:feature-a/
  strand:hotfix/
wl:beta/
```

Navigate the tree to pick a lane. When selected, the right side shows
*that lane's* tick timeline — its own local history, receipts, writers,
effects. No global frame ordering. Each lane ticks at its own pace.

The tree solves topology (which lane forks from which) and independent
ticking (each lane has its own timeline) in one shot. The colored rails
from cycle 0012 could appear in the per-lane timeline to show when
*other* lanes were also active at that lane's ticks — but the primary
axis is the selected lane's local history.

Left: tree nav (filesystem metaphor). Right: timeline (scoped to
selected lane).

### Accordion view

The tree could be an accordion — expand a lane to see its tick
timeline inline, collapse it to just the lane header. Multiple lanes
could be expanded simultaneously for comparison. Keeps everything in
one scrollable surface instead of a left/right split.

### Bijou DAG component

Use Bijou's DAG renderer to display the lane topology. Each node is a
lane (not a tick). Edges show fork relationships. Selecting a node
opens that lane's tick timeline. This avoids inventing a new tree
widget — Bijou already knows how to render DAGs. We don't need to show
every tick as a node; the DAG is just the lane-level topology. Tick
detail is what you see after selecting a lane.

### Other ideas (may complement the tree approach)

1. **Per-lane tick columns** — each lane is its own column with its
   own tick count. Vertical position = that lane's local tick.
   Horizontal lines connect where lanes interact (fork, shared reads).

2. **Topology-first view** — show lane lifetimes, fork points, and
   relative progress without forcing a global time axis. Maybe each
   lane is a vertical rail with its own scale.

3. **Split view** — regardless of left-side representation, the right
   side shows detail for the selected point: all lane states, receipts,
   effects, deliveries. This is orthogonal and good no matter what.

## What we learned from cycle 0012

- Colored lane rails work — distinguishing lanes by color is correct
- Fork connectors (horizontal `─` between parent and child) work
- Frame + digest tick lines are clean but sparse
- The *rendering primitives* are fine; the *data model* (global frame
  list, one row per frame) is the problem

## Origin

User feedback during cycle 0012. The graph renderer shipped but
exposed the underlying model mismatch.

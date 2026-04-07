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

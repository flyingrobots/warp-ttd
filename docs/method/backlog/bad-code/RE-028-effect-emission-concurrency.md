**Legend:** RE (Reliability)
**Source:** Code review round 2 (2026-04-18)

## Problem

`extractGitWarpEffectEmissions` calls `graph.materialize({ ceiling })` which
mutates shared WarpCore state, then reads node props. Concurrent calls for
different frame indices can cross-contaminate — the second `materialize()`
clobbers the first's ceiling before its `getNodeProps` calls complete.

The adapter's per-frame emission cache prevents redundant calls for the *same*
frame, but does not serialize calls for *different* frames.

## Fix

Add a per-adapter async mutex (e.g., a `Promise` chain) around the
`materialize + getNodeProps` sequence in `GitWarpAdapter.effectEmissions`.

## Effort

Small — add a serialization gate in `GitWarpAdapter.effectEmissions`.

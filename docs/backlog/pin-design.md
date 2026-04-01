# Pin Design — Observation Watch & Comparison

**Status:** queued

## Problem

Pinning exists as a prototype (cycle 0008) but lacks design rigor.
Currently it grabs the first observation at the current frame and
stores it. There's no selection, no comparison view, no annotation.

## What Pins Should Be

Pins are **watch expressions for observations**. You freeze a
delivery observation at tick X, then navigate to tick Y and see both
side by side — what happened then vs what's happening now.

Use cases:

- "This notification was suppressed at frame 2 during replay. Is it
  delivered at frame 5 in live mode?" Pin frame 2, step to frame 5,
  compare.
- "Bob's rewrite was rejected at frame 1. What did Alice's admitted
  rewrite look like?" Pin Bob's observation, navigate to Alice's.
- "The export effect failed at frame 3. Did it succeed at frame 7
  after the config change?" Pin frame 3, seek to frame 7.

## Design Questions

- How does the user select which observation to pin? (Currently:
  always the first. Needs: navigable observation list or index.)
- What does the comparison view look like? Side-by-side? Diff?
  Overlay?
- Should pins capture receipts and emissions too, or only delivery
  observations?
- How many pins should be supported? Arbitrary? Capped?
- Should pins have user annotations / labels?
- How do pins interact with the Inspector page?
- Should the CLI support pin operations (pin at frame N, compare
  pins)?

## Current State

- `DebuggerSession.pin(observationId)` captures observation +
  parent emission, frozen at current frame
- `DebuggerSession.unpin(observationId)` removes by ID
- Pins survive stepping and are included in `toJSON()`
- TUI: `[P]` pins first observation, `[u]` unpins most recent,
  Pins panel shows in Navigator

## Scope (when this becomes a cycle)

1. Design doc with sponsor framing and playback questions
2. Observation selection UI in Navigator
3. Comparison view (pinned vs current)
4. Pin labels / annotations
5. CLI pin operations

## Non-Goals

- No pin persistence to disk (until session persistence lands)
- No cross-session pin sharing

# TTD Invariants

**Status:** DESIGN
**Date:** 2026-03-26

This document collects the invariants that should remain explicit as WARP TTD
is extracted into its own repo.

## Product Invariants

1. TTD is a human-facing debugger product, not just a bag of inspection
   commands.
2. TTD must be able to serve multiple WARP hosts without inventing a separate
   debugger ontology for each host.
3. Human explanation is derived from substrate facts; it is never an
   alternative source of truth.

## Time Invariants

1. Substrate time is lane-local.
2. Human playback time may be composite.
3. A composite debugger frame does not imply a single real global substrate
   clock.
4. Rewind/step/play/pause in TTD resolve per-lane coordinates; they do not
   redefine worldline identity.

## Observation Invariants

1. Historical observation is read-only.
2. Observation must not mutate the live frontier.
3. Continuing from the past requires a fork or strand, not silent rewind
   of canonical history.
4. Multiple observer-relative panels may legitimately disagree on what matters
   while still inspecting the same underlying frame.

## Architecture Invariants

1. `PlaybackHead` is a coordination primitive, not the debugger itself.
2. `DebuggerSession` is a higher-layer debugger object, not a substrate
   history object.
3. UI layout, bookmarks, watched entities, and panel state belong to debugger
   session state, not to substrate objects.
4. The TTD core must depend on capability ports, not host internals.

## Authority Invariants

1. Read-only observation by multiple playback heads is always allowed.
2. Writable control authority must be explicit.
3. Overlapping writable authority across playback heads must be surfaced before
   silent advancement.
4. Dynamic intent overlap must not be treated as benign just because static
   ownership looked safe.

## Schema / Codegen Invariants

1. If the Wesley path is adopted, GraphQL becomes the authored contract, not a
   generated afterthought.
2. Generated host artifacts must be deterministic for the same schema input.
3. Version changes must be explicit and reviewable.
4. Footprint declarations must be treated as safety contracts, not as optional
   documentation.
5. GraphQL schema shape alone is not sufficient for every WARP law; directives,
   IR constraints, and runtime validation remain legitimate.

## Non-Goals

1. TTD does not require one universal UI.
2. TTD does not require embedding all debugger code into git-warp or Echo.
3. TTD does not require immediate schema-first migration of every rewrite in
   every host.

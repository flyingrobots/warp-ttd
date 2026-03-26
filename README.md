# WARP TTD

Cross-host Time Travel Debugger for WARP systems.

## Status

This repo is in a docs-first bootstrap phase.

The immediate job is to extract the Time Travel Debugger into its own design
home so it can serve:

- git-warp
- Echo
- XYPH
- future WARP-based runtimes

without the debugger architecture being trapped inside any one host repo.

## Thesis

TTD is not just a CLI family and it is not just a UI.

TTD is a human-facing debugger product built on top of WARP substrate facts:

- worldlines
- immutable materialized snapshots
- observers
- working sets
- BTRs
- provenance
- deterministic replay

The debugger should be reusable across hosts, while remaining honest about the
substrate semantics underneath.

## Why This Repo Exists

The current design work touched several repos at once:

- `git-warp` owns the JavaScript substrate and current CLI/debug surfaces
- `echo` contains an earlier Rust/WASM/browser TTD prototype
- `wesley` points toward a schema-first, cross-language codegen path
- `xyph` is the main human-facing application context driving the debugger DX

That is exactly why TTD deserves its own repo. The debugger is now clearly a
product and architecture concern in its own right.

## Current Design Direction

1. The substrate keeps independent worldlines and working sets.
2. Human playback is a derived composite frame model, not proof of a global
   substrate clock.
3. `PlaybackHead` is a substrate-facing coordination primitive.
4. `DebuggerSession` is the human-facing debugger object above the substrate.
5. Panels are observer families over the same causal history.
6. Observation is read-only; speculation is explicit and fork-based.
7. Cross-host TTD should target capability ports and shared schemas, not host
   internals.

## Wesley / GraphQL Direction

One promising direction is to make GraphQL the authored contract for:

- graph/domain types
- graph rewrite operations
- playback/control protocol types
- deterministic binary serialization metadata
- footprint declarations
- versioning

with Wesley generating the Rust, TypeScript, and codec artifacts required by
different hosts.

This repo does not assume that move is already complete, but it treats it as a
serious architecture path rather than a side experiment.

## Initial Repo Layout

- `docs/design/human-centered-hex-architecture.md`
  Human-centered debugger framing and hexagonal architecture.
- `docs/design/graphql-wesley-strategy.md`
  Schema-first/codegen strategy for protocol, footprints, and cross-host
  compatibility.
- `docs/design/invariants.md`
  TTD-specific invariants that must stay explicit as the design evolves.

## Current Spike

The current narrow design spike is captured in:

- `docs/design/0001-why-warp-ttd.md`
- `docs/design/0002-wesley-schema-profile.md`
- `docs/design/0003-shared-schema-strategy.md`
- `docs/design/0004-ttd-protocol-surface.md`

Those docs are intentionally more constrained than the broader architecture
notes. They are meant to define the first real protocol/schema/design slice
instead of trying to solve the whole ecosystem in one pass.

## Near-Term Questions

1. What is the minimal cross-host TTD capability protocol?
2. Which playback/session concepts belong in substrate repos versus this repo?
3. How far can Wesley carry footprint enforcement and protocol generation?
4. Which first implementation target should prove the architecture:
   git-warp, Echo, or a host-neutral protocol package first?

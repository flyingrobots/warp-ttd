# 0003: Shared Schema Strategy

**Status:** DESIGN
**Date:** 2026-03-26

## Purpose

This note defines how Echo, git-warp, and WARP TTD can share schema safely
without collapsing into one monolithic runtime.

The goal is interoperability, not forced implementation uniformity.

## Problem

Several layers want to share shape information:

- substrate identifiers and coordinates
- playback control/state
- provenance and receipt envelopes
- debugger protocol payloads
- possibly later rewrite operation contracts

If each host hand-maintains these, drift is guaranteed.

If everything is shoved into one giant shared schema, host boundaries disappear
and the architecture becomes muddy.

## Strategy

Use multiple related schema families with explicit ownership.

### 1. Shared runtime substrate schema

Defines stable concepts that more than one host/runtime should mean the same
way, such as:

- worldline identifiers
- ticks/coordinates
- playback control modes
- opaque ids
- logical counters
- stable receipt/provenance envelopes where they genuinely align

Echo's runtime schema fragments are evidence that this layer is already
starting to exist.

### 2. Shared TTD protocol schema

Defines what the debugger consumes across hosts, such as:

- playback heads
- playback frames
- session payloads
- inspection result envelopes
- provenance/conflict/counterfactual payloads
- comparison and fork result surfaces

This schema is the natural center of gravity for `warp-ttd`.

### 3. Host-specific rewrite/domain schema

Defines host-specific graph entities and operation vocabularies, such as:

- node and edge families
- attachment payloads
- rewrite intents/mutations
- host-specific footprint laws
- storage-specific extensions

These may share style and tooling, but they do not have to be fully identical
across hosts.

## Ownership Rules

### `warp-ttd`

Owns:

- the host-neutral debugger protocol schema
- debugger architecture docs
- debugger invariants
- portability requirements for playback/session semantics

### `git-warp`

Owns:

- git-native substrate implementation
- materialization/replay/storage behavior
- host adapter into the shared TTD protocol

### Echo

Owns:

- Rust runtime implementation
- runtime-specific scheduling/transport internals
- host adapter into the shared TTD protocol

### Wesley

Owns:

- schema compilation semantics
- IR generation
- version/manifest/codec generation rules

## What Should Be Common

Prefer sharing contracts for:

1. identifiers and coordinates
2. playback control shapes
3. immutable inspection payloads
4. provenance/result envelopes
5. deterministic serialization rules
6. protocol version negotiation metadata

## What Should Stay Host-Specific

Prefer leaving these host-specific until proven otherwise:

1. storage-engine internals
2. scheduler implementation details
3. rewrite execution machinery
4. host-local optimization artifacts
5. UI presentation concerns

## Version Evolution

Version evolution should be explicit at the schema family boundary.

That means:

1. shared runtime schema can version independently
2. shared TTD protocol schema can version independently
3. host-specific rewrite schemas can version independently
4. compatibility declarations between them must be machine-visible

This is safer than pretending one version number can express every change
across every layer.

## Practical Migration Path

Do not start by trying to unify all runtime and rewrite schemas.

Start with:

1. a minimal shared read-only TTD protocol schema
2. one Echo adapter implementing it
3. one git-warp adapter implementing it
4. compatibility tests on generated artifacts

Only after that should the ecosystem consider deeper rewrite-schema sharing.

## Success Condition

The strategy is working if:

1. the same TTD client can inspect Echo and git-warp through adapters
2. shared payload types stop drifting across repos
3. schema/version changes become explicit instead of accidental
4. host-specific runtime innovation remains possible without protocol chaos

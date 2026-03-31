# 0004: TTD Protocol Surface

**Status:** DESIGN
**Date:** 2026-03-26

## Purpose

This note defines the first narrow protocol surface the web/TUI/CLI TTD should
consume.

It is intentionally read-mostly and protocol-first.

The goal is to prove cross-host debugger interoperability before attempting a
full schema-first rewrite of every host operation.

## Principle

Do not start with the full GraphQL query language as the universal interface.

Start with:

- schema/types
- inspection payloads
- playback/session contracts
- version contracts
- deterministic codec contracts

Then layer richer observation/query surfaces later if the model survives first
contact with reality.

## First Required Concepts

The minimal host-neutral TTD protocol should expose:

### 1. Host identity and protocol identity

- host kind
- host version
- protocol version
- schema identifiers / schema hashes
- capability declarations

### 2. Lane catalog

- worldline ids
- strand ids
- ancestry/fork relations
- available playback heads
- readable versus writable lanes

### 3. Playback state

- playback head identity
- current frame
- current per-lane coordinates
- paused/playing/stepping mode
- authority/overlap hazards if present

### 4. Immutable inspection payloads

- snapshot identifiers/digests
- coordinate identifiers
- observer or aperture identifiers
- visible state payloads or state references

### 5. Provenance and receipts

- BTR identifiers/digests
- receipt summaries
- admitted/rejected rewrite summaries
- counterfactual summaries
- provenance anchors

### 6. Comparison payloads

- frame-to-frame comparisons
- coordinate-to-coordinate comparisons
- fork/base comparisons
- visible state diffs

### 7. Fork/speculation hooks

These may be capability-gated and can remain thin at first:

- create fork from coordinate
- create strand from coordinate/frontier
- return the resulting lane identity and frontier metadata

## Recommended Envelope Shape

The first protocol slice should bias toward explicit envelopes rather than
generic query execution.

Examples of likely top-level payload families:

1. `HostHello`
2. `CapabilitySet`
3. `LaneCatalog`
4. `PlaybackHeadSnapshot`
5. `PlaybackFrame`
6. `ObservedState`
7. `ReceiptSummary`
8. `ConflictSummary`
9. `CounterfactualSummary`
10. `ForkResult`

The precise names can change. The important part is keeping them explicit,
finite, and versioned.

## Why This Should Stay Narrow

A narrow protocol helps us prove:

1. the same TTD can talk to multiple hosts
2. generated Rust/TS artifacts are genuinely useful
3. deterministic serialization is enforceable
4. host adapters are enough for interoperability

without prematurely turning the debugger into a universal graph query engine.

## What To Defer

Defer these until the base protocol is proven:

1. full generic query semantics
2. host-specific introspection explosion
3. full rewrite-op execution contracts
4. schema-first expression of every runtime internal
5. rich UI schema generation

## Verification Criteria

The first TTD protocol surface is successful if:

1. an Echo adapter and a git-warp adapter can both expose it
2. one TypeScript TTD client can consume both
3. schema/version mismatches are surfaced explicitly
4. payload serialization is deterministic across regeneration
5. playback and provenance concepts remain substrate-honest

# RFC: GraphQL + Wesley Strategy for WARP TTD

**Status:** DESIGN
**Date:** 2026-03-26
**Scope:** Schema-first path for TTD protocol, graph rewrites, footprints, and cross-host compatibility

---

## Problem

WARP hosts need several things at once:

- shared type definitions across languages
- stable protocol/versioning
- deterministic serialization
- explicit footprint declarations for graph rewrites
- safer enforcement than a runtime-only honor system

In earlier designs, rewrites often declared footprints in host-native code and
then relied on implementation discipline to honor those declarations during the
actual rewrite. That is useful, but it leaves a dangerous gap:

- the declared footprint can drift from the real rewrite behavior
- generated TS/Rust protocol types can drift from the runtime model
- versioning becomes a manual coordination problem

---

## Thesis

Use GraphQL as the human-authored contract and Wesley as the cross-language
compiler.

The authored schema should cover:

- graph/domain types
- rewrite operation shapes
- playback/control protocol shapes
- version metadata
- deterministic codec metadata
- footprint declarations

Wesley can then generate:

- Rust types for Echo
- TypeScript types for TTD
- JS/TS types for git-warp
- deterministic serialization helpers
- manifest/IR artifacts for schema pinning and compatibility checks

This does not make GraphQL "the runtime." It makes GraphQL the authored
contract that runtime code and debugger code both obey.

---

## Why This Is Attractive

This path solves several problems with one authored source:

### 1. Cross-language drift

Echo, git-warp, and TTD no longer need to hand-maintain matching type families
in Rust, TypeScript, and JavaScript.

### 2. Protocol versioning

Schema evolution can be treated as an explicit versioned artifact rather than a
set of ad hoc DTO edits spread across repos.

### 3. Deterministic serialization

If Wesley owns the codec metadata and artifact generation, TTD protocol values
and replay-adjacent structures can be serialized in a repeatable way across
hosts.

### 4. Footprint enforcement

If footprint declarations are authored in the same contract as the operations
they describe, the generator can reject missing/inconsistent declarations
before the runtime ever admits the operation.

### 5. Cross-host compatibility

If git-warp and Echo converge on the same authored protocol and rewrite
contracts, a WARP TTD can debug both through host adapters instead of learning
two unrelated type universes.

---

## Footprints

Wesley already has a footprint directive:

- `@wes_footprint(reads:, writes:, creates:, deletes:)`

That suggests a strong design path:

1. A rewrite operation is declared in GraphQL.
2. Its footprint is declared alongside the operation.
3. Wesley generates host-language types and metadata for that operation.
4. Hosts use the generated artifact as the typed contract for admission and
   tooling.

The goal is not to eliminate runtime verification entirely. The goal is to move
footprint omission and obvious contract drift into the compile/generation loop
instead of discovering them only as live scheduler bugs.

In short:

- schema-level declaration
- generated host artifacts
- runtime admission/checking

instead of:

- handwritten operation
- handwritten footprint
- hope they match

---

## Scope Split

The GraphQL/Wesley path should likely be split into three schema families.

### 1. Runtime substrate schema

Defines stable substrate-facing concepts such as:

- worldline ids
- ticks/coordinates
- playback control modes
- receipt/provenance envelopes
- opaque ids and logical counters

Echo already started down this path with runtime schema fragments.

### 2. TTD protocol schema

Defines the host-neutral debugger contract:

- playback heads
- playback frames
- debugger session payloads
- panel/query result envelopes
- explanation/provenance payloads
- comparison/fork requests and responses

This schema belongs most naturally in `warp-ttd`.

### 3. Rewrite/domain schema

Defines host/domain-level graph entities and rewrite ops:

- node/edge families
- attachment payloads
- mutations / rewrite intents
- footprint declarations
- version metadata

Some of this may remain host-specific, but the contract style can still be
shared.

---

## Constraints

GraphQL is powerful here, but it is not magic.

There are several things the architecture must remain honest about:

### 1. GraphQL cannot express every semantic law directly

Some WARP constraints are richer than ordinary schema shape:

- recursive attachment semantics
- DPO rewrite laws
- observer-aperture laws
- provenance completeness rules
- lawful footprint over-approximation

Those may require:

- directives
- comments plus validation rules
- IR-level constraints
- generated test/verification artifacts

### 2. Footprints remain an over-approximation contract

A footprint law is only useful if it is safe.

That means generated contracts should bias toward sound over-approximation, not
toward optimistic minimality.

### 3. Versioning must be explicit

If schemas drive codecs and host types, every incompatible change must become a
visible contract/version event.

### 4. Host adapters still matter

Shared schemas do not erase host differences. They reduce accidental mismatch.
git-warp and Echo will still have distinct substrate implementations and
adapter concerns.

---

## Proposed Direction For `warp-ttd`

`warp-ttd` should become the natural home for the host-neutral TTD protocol
schema and its generated artifacts.

That implies a likely future structure such as:

- `schemas/ttd/`
  Human-authored GraphQL fragments for playback/session/provenance/query
  contracts.
- `generated/`
  Vendored IR/manifests/codegen outputs or pointers to them.
- `packages/`
  Shared TypeScript protocol packages.
- `crates/`
  Shared Rust protocol crates if needed.
- `docs/`
  Architecture, invariants, and protocol governance notes.

This would let:

- Echo consume generated Rust/TS protocol artifacts
- git-warp consume generated JS/TS protocol artifacts
- TTD UI code consume the same TypeScript protocol package

from one authored contract.

---

## Recommended First Slice

The first proof slice should stay narrow.

Do not try to schema-encode all of WARP immediately.

Instead:

1. Freeze the minimal read-only TTD protocol in GraphQL.
2. Generate Rust + TypeScript types and deterministic codecs.
3. Implement one Echo adapter and one git-warp adapter against that contract.
4. Only then decide how much of rewrite-intent and footprint declaration should
   move into the same schema family.

That sequence proves:

- cross-host protocol sharing
- Wesley generation value
- versioning discipline
- deterministic codec discipline

before attempting the larger rewrite-schema migration.

---

## Open Questions

1. Should footprint directives live directly on GraphQL mutations, on separate
   operation objects, or in a sidecar IR layer?
2. Which codec and manifest artifacts belong in `warp-ttd` versus in Wesley?
3. How much of git-warp's rewrite model can be expressed cleanly in GraphQL
   without turning the schema into a second programming language?
4. At what point should the runtime reject host-local rewrites that are not
   schema-backed?

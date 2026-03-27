# 2026-03-26 Braindump

**Status:** Informal note
**Purpose:** Preserve current thinking without accidentally promoting all of it to roadmap or doctrine

---

## Bearings

`warp-ttd` matters, but it is not the current critical path.

The primary mission is still in `git-warp`:

- replace the fake observer model
- make read semantics substrate-native
- make materialization produce immutable snapshots
- make observers first-class read handles over worldline coordinates

This repo exists so TTD thinking can continue in parallel without dragging the
`git-warp` observer rewrite off course.

That means:

- `git-warp` observer rewrite is the critical path
- `warp-ttd` is a sidecar for debugger architecture and protocol exploration
- TTD should follow substrate truth, not lead it

---

## Core TTD Thesis

TTD is not just a UI and not just a command family.

TTD is a cross-host observational layer for deterministic graph systems.

Good framing:

- observer of worldlines
- deterministic replay inspector
- provenance lens
- receipt/conflict/counterfactual explorer
- boundary transition visualizer

Bad framing:

- generic query engine
- simulation engine
- orchestration engine
- magical omniscient graph console

---

## The Big Architecture Play

The strongest long-term idea on the table is not "GraphQL everywhere."

It is:

- GraphQL syntax
- Wesley semantics

More concretely:

- GraphQL as the authored contract
- Wesley as the compiler spine
- generated Rust/TS/JS protocol artifacts
- deterministic serialization owned by compiler/codegen
- footprint declarations treated as safety contracts
- shared debugger protocol across hosts

If this works, then:

- Echo
- git-warp
- XYPH
- future runtimes

could all become inspectable through a shared observational protocol.

That is a platform move, not just a UI convenience.

---

## Why The Wesley Angle Is So Strong

It bundles several ugly problems into one cleaner contract layer:

- shared schema language
- generated types across Rust and TypeScript
- deterministic binary serialization
- versioned protocol surfaces
- declared rewrite footprints
- tooling leverage for docs and introspection

The really important inversion is:

not "GraphQL for queries"

but:

"GraphQL as a schema-and-operation declaration language for deterministic graph
systems."

That is worth exploring aggressively, but only under strict guardrails.

---

## Guardrails

If we go down the Wesley path, these rules should remain absolute:

### 1. Raw GraphQL semantics are not trusted semantics

The trusted rule is:

- GraphQL syntax
- Wesley semantics

### 2. The profile must stay narrow

Do not let the trusted core depend on:

- arbitrary resolver behavior
- generic GraphQL runtime assumptions
- dynamic server-shaped semantics
- incidental nondeterminism
- ecosystem creep justified as "standard GraphQL"

### 3. Footprints are stronger contracts, not magic proofs

Compile-time footprint enforcement is a serious improvement.

It is not automatically a proof of rewrite correctness.

Stay honest:

- strong approximation is still valuable
- do not confuse it with full formal verification

### 4. Do not over-unify too early

Keep the current three-family split:

- shared runtime substrate schema
- shared TTD protocol schema
- host-specific rewrite/domain schema

If everything gets shoved into one giant schema too early, iteration speed
dies.

### 5. TTD must not become the runtime

TTD should remain:

- observer
- inspector
- explainer
- comparator

Speculation may exist, but it must be explicit and capability-gated.

---

## PlaybackHead vs DebuggerSession

This distinction still feels right.

### `PlaybackHead`

A substrate-facing coordination primitive over lanes.

Useful for:

- stepping a composite frame
- coordinating lanes
- app/runtime control surfaces
- debugger playback control

### `DebuggerSession`

A human-facing object above the substrate that owns:

- selected playback head
- watched entities
- chosen observers/apertures
- bookmarks
- breakpoints
- panel state
- explanation preferences

That split makes the debugger reusable without collapsing the runtime into UI
state.

---

## Current Protocol Slice

The first build slice in this repo is intentionally tiny:

- `HostHello`
- `LaneCatalog`
- `PlaybackHeadSnapshot`
- `PlaybackFrame`
- `ReceiptSummary`

This is correct.

It proves the right first thing:

- one finite protocol
- one host-shaped adapter
- one dumb client
- tests as spec

without prematurely dragging Wesley or GraphQL into the trusted path.

---

## What Feels Most Promising Next

Not all of this should happen now. This is just the parking lot.

### Near-term

- replace the Echo fixture adapter with one real host adapter
- decide whether Echo or git-warp is the better first real adapter target
- keep the protocol narrow and explicit

### Medium-term

- extract the first host-neutral TTD protocol schema into `warp-ttd`
- generate Rust and TypeScript artifacts with Wesley
- prove one TTD client can talk to multiple hosts

### Longer-term

- shared observational protocol for deterministic systems
- shared receipt/provenance/conflict visualization tooling
- host-neutral TTD client surfaces
- eventual schema-backed rewrite/footprint contracts where justified

---

## What Must Not Happen

The following failure modes feel especially dangerous:

### 1. TTD scope creep

If TTD tries to become:

- query engine
- runtime controller
- orchestration layer
- UI meta-framework

the architecture will rot.

### 2. Schema religion

If we start pretending that all of WARP can or should be expressed in GraphQL
immediately, the project will turn into an ornate swamp.

### 3. Losing sight of the real critical path

If TTD exploration delays the `git-warp` observer rewrite, we are doing the
wrong work in the wrong order.

---

## Working Conclusion

The TTD idea is real.

The Wesley/GraphQL angle is real.

The repo split was correct.

But the correct immediate move remains:

- preserve the TTD thinking here
- keep the protocol work narrow
- return focus to the `git-warp` observer rewrite

This note exists to make that possible without losing the surrounding context.

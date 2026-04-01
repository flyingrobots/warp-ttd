# WARP TTD — Vision & Architecture

This is the living design document for warp-ttd. It describes what the
debugger IS, what it's FOR, how it thinks, and where it's going.

This document evolves. Cycle-specific design docs capture decisions
frozen at a point in time; they are not updated. This document captures the current truth.

## What warp-ttd IS

warp-ttd is a cross-host time-travel debugger and wide-aperture
observer for deterministic graph systems built on WARP-like causal
history.

It observes substrate facts honestly and, when the host declares the
capability, can drive explicit debugging controls: pause, step, seek,
strand fork, speculative ticking, comparison, and multi-strand
composition.

It works across hosts. The same debugger protocol serves git-warp,
Echo, and future WARP-based runtimes through host adapters.

## What warp-ttd is NOT

- Not a query engine. It inspects finite protocol envelopes.
- Not the simulation engine. Hosts perform replay and speculative
  execution; warp-ttd may request and inspect those operations.
- Not a general-purpose orchestrator. It does not own application
  workflows or runtime policy, but it may drive explicit
  debugger/scenario controls through substrate-defined capabilities.
- Not a UI framework. The TUI is one delivery adapter among many.
- Not an application. It does not interpret domain meaning.

## The Three-Layer Invariant

The system obeys a strict boundary discipline:

1. **Graph (causal)** — the substrate owns causal truth and execution
   semantics. Worldlines, patches, materialization, deterministic
   replay, speculative execution. git-warp and Echo implement this
   layer.

2. **Debugger (observer + explicit control)** — TTD observes, pauses,
   steps, seeks, forks, and ticks through substrate-owned capabilities.
   It is a wide-aperture observer with control surfaces. It never
   silently rewrites canonical history. Every continuation from the
   past is explicit, capability-gated, and provenance-bearing.

3. **Application (domain act)** — applications interpret meaning,
   policy, and workflows. They consume substrate facts and debugger
   observations. warp-ttd does not own this layer.

### The Real Invariant

The honest boundary is not "read-only forever." It is:

> Canonical history is never silently rewritten. Every continuation
> from the past is explicit, capability-gated, and provenance-bearing.

This is what makes TTD a debugger and not a sneaky second runtime.
It can drive speculative operations — but those operations are
substrate-executed, explicitly requested, and the results are
inspectable substrate facts with full provenance.

## Theoretical Foundations

warp-ttd's architecture is grounded in the AION Observer Geometry papers
and the WARP Optics formalism.

### Observer Geometry (OG-I)

An observer is not a scalar. It is a structural five-tuple:

- **Projection (O)** — what the debugger display shows
- **Basis (B)** — the native coordinate system of events
- **State (M)** — the accumulated observational state
- **Update (K)** — how new observations are integrated
- **Emission (E)** — the accumulated structural description produced

The debugger's job is to surface what survives each layer of
observation, not to collapse everything into one view.

### Aperture

Aperture is the measure of what task-relevant distinctions survive
observation. It is three-axis:

- **Projection aperture** — what is visible in raw trace output
- **Basis aperture** — what is visible in native coordinates
- **Accumulated aperture** — what is visible after accumulation over time

The debugger should eventually expose aperture profiles: which bugs are
visible in raw traces vs. only in accumulated history vs. require
understanding causal structure.

### Degeneracy

Degeneracy is the hidden multiplicity behind an observation. Two
distinct executions may produce the same final state but different
histories. The debugger's job is to **surface degeneracy**, not
collapse it.

- Zero task degeneracy (the debugger shows enough for the task) does
  NOT imply zero structural degeneracy (there may still be hidden
  alternatives).
- Counterfactual inspection is exploring degeneracy — showing what
  COULD have happened.

### Worldlines and Suffix Transport (OG-IV)

Worldlines are not timelines. A worldline is a causal history — a
chain of patches with deterministic materialization.

When comparing or replaying across worldlines:

- The **common frontier** is the last shared state between two worldlines
- **Suffix transport** replays an effect across the unseen suffix of
  a target worldline
- **State convergence does not imply provenance convergence** — two
  worldlines can arrive at the same state through different histories

This is why the debugger must track provenance, not just final state.

### WARP Optics

A WARP optic is a footprinted, observer-relative rewrite:

**Ω = (π, φ, ρ, ω, σ)**

- **π** — observer-relative projection (which view)
- **φ** — footprint / focus boundary (what part is being transformed)
- **ρ** — local rewrite over the focused region
- **ω** — witness sufficient for local reversibility
- **σ** — reintegration map producing updated whole

The same declared rewrite can be interpreted as execution, cost
estimation, conflict detection, debugger explanation, or Wesley
compilation. This is the profunctor parametricity story.

**Receipts ⊇ Witnesses.** A receipt carries more than the minimum
needed for reversal — it includes footprint metadata, scheduling
decisions, rejected intents, and debugging context. The debugger
reads receipts.

## Protocol Philosophy

### Explicit envelopes, not implicit side channels

Every inspectable fact gets a named envelope type with a versioned
shape. No inferring adapter behavior from missing side effects.

### Capability-gated evolution

Adapters declare what they support. New envelope types and methods
are additive and capability-gated. Existing adapters continue to
work without modification.

### Three distinct effect layers

1. **Effect emission** — the system produced an outbound effect
   candidate at a coordinate (substrate fact)
2. **Delivery observation** — what happened to it at each sink
   (delivered, suppressed, failed, skipped)
3. **Execution context** — the session-level lens governing
   externalization (live, replay, debug)

These must never be collapsed into one thing.

### Receipts are central

The debugger is receipt-centric. Receipts carry:

- What was admitted (applied rewrites)
- What was rejected (counterfactual rewrites)
- What effects were emitted
- What delivery outcomes occurred
- Enough witness data for local reversibility

### Counterfactuals are first-class

Rejected receipts are counterfactuals — what COULD have happened.
The debugger should let users:

- Select a counterfactual receipt
- Inspect what it would have done
- Fork a strand to explore that alternative worldline
- Compare the strand against the canonical worldline

This is not speculation. It is structured exploration of degeneracy.

### Speculative control surfaces

TTD is not limited to observing what happened. When the host declares
the capability, TTD can drive speculative operations:

- **Batch strand creation** — fork N strands from a tick to explore
  counterfactual alternatives in parallel
- **Independent ticking** — advance a speculative strand without
  advancing the canonical worldline
- **Multi-strand composition** — coordinate, compare, or present
  multiple speculative strands together without implying they share
  one canonical history
- **Comparison** — diff a strand against its base worldline or against
  another strand
- **Result handles** — a DebuggerSession tracks speculative results
  so they survive navigation and can be revisited

The substrate performs the actual execution. TTD requests it through
capability-gated interfaces, then inspects the results as honest
substrate facts with full provenance.

A practical example: an application using git-warp for persistence and
Echo for rapid simulation might use TTD to fork 1000 counterfactual
strands, tick them independently through Echo's fast runtime, compare
the outcomes, and present the results in a DebuggerSession. TTD
requests, coordinates, and inspects the scenario through
substrate-defined capabilities; the substrates execute it.

## Architecture

### Hexagonal boundaries

```text
Delivery Adapters (CLI, TUI, MCP, Web)
  → TTD Application Core
    → TTD Ports (TtdHostAdapter)
      → Host Adapters (echo fixture, git-warp, scenario fixture)
        → WARP Substrates (git-warp, Echo)
```

### Key domain concepts

- **Worldline** — causal history (chain of patches with deterministic
  materialization). Not a timeline.
- **Tick** — Lamport clock value on a worldline. Not a frame.
- **Strand** — speculative causal lane (durable, write-able, forkable)
- **Aperture** — what an observer preserves/projects. Not a lens.
- **Receipt** — per-operation provenance from a materialized tick
- **Effect emission** — substrate fact that something was produced
- **Delivery observation** — what happened to an effect at each sink
- **Execution context** — live/replay/debug lens
- **PlaybackHead** — substrate-facing coordination primitive
- **DebuggerSession** — human-facing investigation object that tracks
  result handles and scopes speculative investigation state (critical
  next abstraction)

### Host adapter boundary

The `TtdHostAdapter` interface is the port. Adapters implement it.
The debugger consumes it. No substrate internals leak through.

Effects in git-warp are graph entities (nodes with `@warp/effect:`
prefix). The git-warp adapter reads these entities and maps them
into `EffectEmissionSummary` envelopes. warp-ttd does not need
the host-domain `EffectPipeline` — it is its own observer.

### Wesley integration

The protocol is defined as a Wesley schema
(`schemas/warp-ttd-protocol.graphql`). Wesley compiles it to
TypeScript types, Zod validators, manifests, and IR for Rust
codegen. The schema is the source of truth for the protocol
contract.

## Canonical Split

### git-warp owns

- Causal graph substrate (worldlines, patches, materialization)
- Effect emission as graph entities
- Delivery observations and externalization policy
- Aperture-relative reads (observer + aperture projection)
- Strand lifecycle and multi-strand composition
- Deterministic replay

### warp-ttd owns

- Debugger protocol (envelope types, versioning, capabilities)
- Host adapter boundary (TtdHostAdapter interface)
- Debugger control surfaces (pause, step, seek, compare, speculative
  requests)
- Session-scoped speculative investigation state (DebuggerSession)
- Receipt-centric inspection
- Effect/delivery inspection
- Counterfactual exploration
- Delivery adapters (CLI, TUI, MCP)
- Wesley schema compilation

### Applications own

- Domain meaning of effects (which effects are lawful, policy-bounded)
- Governance and workflow semantics
- Human and agent surface interpretation
- Product-specific ontology

## Core Views

The debugger provides three foundational views into the substrate.
These are the intended foundational views; some are partially
implemented, others are planned. The protocol and adapter surface
will evolve to support them.


### Worldline Viewer

The worldline is shown like a `git log` — ticks are commits, strands
are branches. The user can:

- See the full causal history of a worldline as a scrollable list
- See strands forking from specific ticks (like branches from commits)
- Jump to any tick and step forward, backward, or fork
- See which writers contributed at each tick
- See the BTR digest (commit hash equivalent) for each tick

This is the primary navigation view. Everything else is anchored to
"what tick am I looking at?"

### Graph Viewer

At any tick, the user can inspect the full materialized WARP graph:

- **Nodes** — all graph nodes with their IDs and properties
- **Edges** — all edges with from/to/label and edge properties
- **Attachments plane** — content blobs attached to nodes and edges,
  addressed by content hash. The attachments plane is a separate
  layer from the graph topology — it carries the actual data payloads
  (binary blobs, documents, artifacts) while the graph carries the
  causal structure.

The graph viewer shows the state as it exists at the selected tick.
Stepping forward or backward shows how the graph evolves. Diffing
two ticks shows what changed.

### Provenance Viewer

Select any value in the materialized graph and trace its complete
reverse causal cone:

- The BTR chain forms a linked structure of the rewrites that affected
  the selected value
- Walk backwards through time to see WHY a value is what it is
- Unlike a traditional debugger that says `x = 5`, the provenance
  viewer shows: `x = 5 because writer alice applied rewrite R at
  tick 47, which set x = 2 + 3, where 2 came from writer bob at
  tick 31 and 3 came from writer carol at tick 38`
- At each step, see the admitted rewrite AND the rejected alternatives
  (counterfactuals) — what would have happened if a different writer
  had won

The provenance viewer is receipt-powered. Each TickReceipt carries
per-operation outcomes (applied, superseded, redundant) with the
writer, the target entity, and the footprint. Following the receipt
chain backwards reconstructs the full causal history of any value.

## Where We Are

### Implemented

- Protocol v0.1.0 (frozen read-only surface: HostHello, LaneCatalog,
  PlaybackHeadSnapshot, PlaybackFrame, ReceiptSummary)
- Effect emission and delivery observation protocol (v0.2.0 scope)
- git-warp adapter (frame-per-tick indexing, TickReceipt mapping)
- Echo fixture adapter
- Scenario fixture adapter (declarative test fixture builder)
- TUI (Connect, Navigator, Inspector pages)
- CLI with --json (JSONL output with envelope fields)
- Wesley schema (full protocol surface)
- Custom error classes, strict linting, auto-ratchet

### Next

- DebuggerSession — required foundation for speculative investigation
- Strand lifecycle through adapter + TUI
- Counterfactual inspection and strand forking
- Navigator view redesign
- writerId on ReceiptSummary
- Design vocabulary audit
- git-warp effect entity integration (when substrate support lands)

## Vocabulary

Use the substrate's language. Do not invent softer alternatives.

| Prefer | Avoid | Why |
|--------|-------|-----|
| worldline | timeline | Worldlines are causal histories, not linear sequences |
| tick | frame (at substrate level) | Ticks are Lamport clocks |
| strand | working-set, branch | Strands are speculative causal lanes |
| aperture | lens (for observer projection) | Lens is reserved for the optics formalism |
| receipt | log entry | Receipts are structured provenance, not log lines |
| counterfactual | rejected (alone) | Rejected rewrites ARE counterfactuals |
| degeneracy | ambiguity | Degeneracy is the formal term from OG-I |
| externalization policy | delivery lens | Lens is reserved for optics |

This vocabulary is enforced in user-visible strings, design docs, and
code comments. Protocol field names (`frameIndex`, `PlaybackFrame`) may
retain "frame" where it refers to the composite snapshot across
multiple lanes — this is a different concept from a single lane's tick.

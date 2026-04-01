# Project Doctrine

This is the constitution of warp-ttd. It describes what the project
believes and what it refuses to become. Read this before proposing
architectural changes or new protocol surface.

## Core Product Philosophy

- Substrate truth is sacred.
- Observation must be honest.
- One playback story should not erase many-lane causality.
- Observation first. Speculation second.
- Provenance matters.
- Receipts matter.
- Conflicts and counterfactuals should be inspectable, not implicit.
- The substrate may be sophisticated; the debugger interaction must stay
  legible.

The highest-level rule is simple:

If a change makes the debugger less honest, less deterministic, more
magical, or more host-specific, it is probably the wrong change.

## Development Philosophy

This project prefers:

- DX over ceremony
- protocol truth over architecture theater
- explicit boundaries over clever coupling
- deterministic local behavior over ambient dependency
- finite envelopes over universal query ambition
- boring proof slices over prematurely grand systems

In practice, that means:

- keep the trusted core narrow
- keep the protocol explicit and versioned
- keep adapters honest about host differences
- keep Wesley/GraphQL scoped to what it can actually own
- keep every future CLI surface machine-readable through `--json`

## Architectural Principles

### Hexagonal architecture

The product should have clear boundaries between:

- domain behavior
- application/use-case orchestration
- ingress adapters such as CLI, TUI, or browser UI
- infrastructure such as host adapters, storage, and code generation

Do not let UI concerns leak into protocol truth.
Do not let host runtime internals leak into the shared debugger contract.

### SOLID, pragmatically applied

Use SOLID as a boundary discipline, not as a reason to create needless
classes or abstractions.

Good:

- narrow modules
- explicit seams
- dependency inversion around important adapters

Bad:

- abstraction for its own sake
- indirection before there is pressure for it
- "clean architecture" rituals that slow down delivery without protecting
  behavior

## Protocol Guardrails

Do not let TTD quietly become any of the following unless explicitly
re-approved:

- a universal graph query engine
- a simulation engine
- an orchestration engine
- a host runtime controller
- a UI framework

TTD should remain:

- observer
- inspector
- explainer
- comparator

Speculation may exist, but it must remain explicit and capability-gated.

## Wesley / GraphQL Guardrails

The rule is:

- GraphQL syntax
- Wesley semantics

Do not let the trusted core depend on:

- arbitrary resolver behavior
- generic GraphQL ecosystem assumptions
- library-defined serialization semantics
- open-ended feature creep justified as "standard GraphQL"

If Wesley is used here, it must own:

- the allowed profile
- code generation semantics
- versioning semantics
- serialization semantics
- footprint contract semantics

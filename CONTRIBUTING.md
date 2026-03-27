# Contributing to `warp-ttd`

`warp-ttd` is not just a debugger UI. It is a cross-host observational layer
for deterministic graph systems built on WARP-like causal history.

If you contribute here, the job is not just to write code that works. The job
is to protect the debugger doctrine while making the implementation more
capable.

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

If a change makes the debugger less honest, less deterministic, more magical,
or more host-specific, it is probably the wrong change.

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

Use SOLID as a boundary discipline, not as a reason to create needless classes
or abstractions.

Good:

- narrow modules
- explicit seams
- dependency inversion around important adapters

Bad:

- abstraction for its own sake
- indirection before there is pressure for it
- "clean architecture" rituals that slow down delivery without protecting
  behavior

## Product Management Philosophy

This project uses IBM Design Thinking style framing for cycle design:

- sponsor human
- sponsor agent
- hills
- playback questions
- explicit non-goals

Cycles should be grounded in debugger/user value, not in protocol vanity.

For `warp-ttd`, every meaningful design cycle should name both:

- the human sponsor perspective
- the agent sponsor perspective

The human sponsor keeps the debugger honest about actual use.
The agent sponsor keeps the protocol and machine-readable contract honest about
tool use.

Before promoting a new direction, ask:

- which hill does this support?
- what user or operator trust does this improve?
- does this preserve substrate honesty?
- does this keep the protocol narrow enough to survive?

If the answer is unclear, the work probably belongs in the backlog, not the
roadmap.

## Build Order

The expected order of work is:

1. Write or revise design docs first.
2. Encode behavior as executable tests second.
3. Implement third.

Tests are the spec.

Do not insert a second prose-spec layer between design and tests.
Do not treat implementation details as the primary unit of correctness.

## Cycle Development Loop

Each cycle should follow the same explicit loop:

1. design docs first
2. tests as spec second
3. implementation third
4. retrospective after delivery
5. rewrite the root README to reflect reality
6. close the cycle in backlog/status docs

This loop is part of the process, not optional cleanup.

At design kickoff, define explicitly:

- sponsor human
- sponsor agent
- hill
- playback questions
- non-goals

At cycle close, evaluate explicitly from both perspectives:

- human stakeholder playback
- agent stakeholder playback

In practice, that means:

- the user acts as the human stakeholder
- the coding agent acts as the agent stakeholder

Do not close a cycle without that dual playback check.

The point is to keep the repo honest about:

- what is planned
- what is specified
- what is actually implemented
- what was learned

## Release Discipline

Cycle closure and release discipline are coupled.

Rules:

- maintain a root `CHANGELOG.md` once the repo starts shipping cycle
  releases
- the current bootstrap version may stay pre-release, but the first real
  cycle release should start at `0.1.0`
- when a cycle is closed, bump `package.json` on the release commit
- create a Git tag on the commit that lands on `main` for that cycle
  release

Examples:

- `v0.1.0`
- `v0.2.0`

The version/tag should reflect cycle reality, not aspirational scope.

## Testing Rules

Tests must be deterministic.

That means:

- no real network dependency
- no ambient host-runtime assumptions
- no hidden dependency on a sibling repo checkout
- no interactive shell expectations
- no timing-based flakes
- no machine-specific UI assumptions in the core suite

Prefer:

- fixture adapters
- fixed protocol payloads
- fixed IDs and digests where practical
- isolated temp state for any future host-backed tests

Tests should pin:

- user-visible debugger behavior
- protocol envelope shapes
- playback/frame stepping behavior
- receipt/provenance surface contracts
- observation/speculation boundaries
- `--json` output contracts for each CLI command

They should not overfit:

- class layout
- file-private helpers
- incidental implementation structure

When a slice serves both humans and agents, acceptance coverage should
represent both perspectives where practical:

- human-facing behavior or presentation contract
- agent-facing machine-readable contract

Local testing policy:

- `npm test` is the default fast suite and should stay safe for CI use
- integration suites against real hosts should be additive and clearly named
- no host-backed suite should silently replace the default fast suite

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

## UX Language Rules

Debugger language should stay honest without becoming gratuitously opaque.

Prefer:

- `frame`
- `worldline`
- `receipt`
- `conflict`
- `counterfactual`
- `fork`

Avoid:

- fake simplicity that lies about the substrate
- host-internal jargon where the protocol already has a clearer concept
- vague labels that blur observation and mutation

Every CLI command must also support `--json`.

In `--json` mode:

- 100% of command output must be JSONL
- `stdout` should carry ordinary data rows
- `stderr` should carry structured warnings and errors
- human-readable text should be suppressed
- machine-readable rows should include real protocol data, not just trace noise

## Git Workflow

Prefer small, honest commits.

Do not rewrite shared history casually.
Prefer additive commits over history surgery.
Prefer merges over rebases for shared collaboration unless there is a
compelling, explicitly discussed reason otherwise.

The point is not aesthetic Git history. The point is trustworthy collaboration.

## Keep A Backlog

Maintain the root [BACKLOG.md](/Users/james/git/warp-ttd/BACKLOG.md).

Use it to keep the repo honest about:

- what is active now
- what is next
- what is deferred
- what risks are known

Do not let roadmap thinking drift into untracked chat context.

## What To Read First

Before making non-trivial changes, read:

- [README.md](/Users/james/git/warp-ttd/README.md)
- [docs/design/0001-why-warp-ttd.md](/Users/james/git/warp-ttd/docs/design/0001-why-warp-ttd.md)
- [docs/design/0002-wesley-schema-profile.md](/Users/james/git/warp-ttd/docs/design/0002-wesley-schema-profile.md)
- [docs/design/0003-shared-schema-strategy.md](/Users/james/git/warp-ttd/docs/design/0003-shared-schema-strategy.md)
- [docs/design/0004-ttd-protocol-surface.md](/Users/james/git/warp-ttd/docs/design/0004-ttd-protocol-surface.md)
- [docs/retrospectives/0001-first-protocol-slice.md](/Users/james/git/warp-ttd/docs/retrospectives/0001-first-protocol-slice.md)
- [BACKLOG.md](/Users/james/git/warp-ttd/BACKLOG.md)

## Decision Rule

When in doubt:

- choose narrower protocol surface
- choose more explicit envelopes
- choose stronger determinism
- choose less host leakage
- choose behavior over architecture theater
- keep observation and mutation separate
- keep Wesley/GraphQL under compiler discipline

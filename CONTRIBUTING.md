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

1. **Design docs** — write or revise design docs. Define the playback
   questions that will be answered after implementation.
2. **Tests as spec** — encode behavior as executable tests.
3. **Implementation** — build it.
4. **Playback** — answer every playback question from the design doc, from
   both the human stakeholder and agent stakeholder perspectives. Write the
   answers down. Do not proceed to the retrospective until every playback
   question has a clear yes/no answer.
5. **Retrospective** — evaluate what shipped, what worked, what didn't, and
   what was learned. The retro must include:
   - **Drift check:** compare what was built against the design doc from the
     top of the cycle. Call out any divergence explicitly — intentional or
     accidental.
   - **Tech/design debt:** log any debt discovered during the cycle as new
     items in `docs/backlog/`. These may be standalone cycles or notes
     attached to existing cycle proposals.
   - **Cool ideas:** capture interesting ideas, tangents, or future
     possibilities that surfaced during the cycle in `docs/backlog/` as
     exploratory items. These do not need sponsor framing — they are seeds,
     not commitments.
6. **README update** — rewrite the root README to reflect reality.
7. **Close the cycle** — update BACKLOG.md, CHANGELOG.md, and the cycle's
   backlog file status.

This loop is part of the process, not optional cleanup.

### Design kickoff

At design kickoff, define explicitly:

- sponsor human
- sponsor agent
- hill
- playback questions (these will be answered in step 4)
- non-goals

### Playback

After implementation, before the retro, run the dual playback in order:

1. **Agent playback** — the coding agent answers every playback question from
   the agent stakeholder perspective. Written down in the retrospective
   document.
2. **Stop.** The agent prompts the human to do their playback. Do not
   proceed until the human responds.
3. **Human playback** — the user answers every playback question from the
   human stakeholder perspective. They may agree, disagree, or flag gaps.
   Written down alongside the agent playback.
4. **Gate** — both perspectives must agree the hill is met before proceeding
   to the retrospective.

Playback questions should be answerable with **yes/no**, not essays. If you
cannot get a clear yes, that is the signal.

### Playback outcomes

**Hill met** — proceed to retrospective, merge, close the cycle.

**Hill partially met** — merge what is honest. The retrospective explains the
gap explicitly (drift check). Remaining work is logged as debt or follow-up
items in `docs/backlog/`. The cycle closes but the hill is marked partial in
the backlog file. No pretending.

**Hill not met** — do not merge to main. The retrospective explains why
(wrong hill? wrong scope? wrong approach?). Two options:

- **Re-scope:** rewrite the hill and try again within the same cycle.
- **Abandon:** close the cycle as abandoned, capture learnings, move on.

### What the repo should always be honest about

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

## Lint Ratchet

ESLint is configured with strict typescript-eslint rules (zero `any`, zero
`unknown`, explicit return types, custom error classes, complexity limits).
The codebase converges to full compliance over time via a ratchet.

Rules:

- a lint error ceiling is stored in `lint-ceiling.txt`
- `npm run lint:check` exits non-zero if the count exceeds the ceiling
- after each cycle closes, the ceiling drops by 30% (rounded down)
- new code must not introduce new lint violations
- when the ceiling reaches zero, the ratchet is retired and `npm run lint`
  becomes a hard gate

See [`docs/backlog/lint-ratchet.md`](docs/backlog/lint-ratchet.md) for the
full schedule.

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

### Structure

Backlog items live as individual Markdown files in
[`docs/backlog/`](docs/backlog/).

Each file is a self-contained cycle proposal with:

- status (`queued`, `active`, `closed`)
- sponsor human and sponsor agent
- hill
- playback questions
- non-goals
- scope

The root [`BACKLOG.md`](BACKLOG.md) is an index
that links to these files and shows the current sequence.

### Lifecycle

1. **Queued:** the item lives in `docs/backlog/` with `status: queued`.
2. **Active:** when a cycle begins, update the status to `active` and
   promote its design doc(s) into `docs/design/`. The backlog file stays
   in `docs/backlog/` as the cycle's anchor document.
3. **Closed:** after the retrospective, update the status to `closed`.
   The backlog file remains as a historical record.

### Rules

- Do not let roadmap thinking drift into untracked chat context.
- Every cycle must have a backlog file before work begins.
- The root `BACKLOG.md` index must stay current with reality.

## What To Read First

Before making non-trivial changes, read:

- [README.md](README.md)
- [docs/design/0001-why-warp-ttd.md](docs/design/0001-why-warp-ttd.md)
- [docs/design/0002-wesley-schema-profile.md](docs/design/0002-wesley-schema-profile.md)
- [docs/design/0003-shared-schema-strategy.md](docs/design/0003-shared-schema-strategy.md)
- [docs/design/0004-ttd-protocol-surface.md](docs/design/0004-ttd-protocol-surface.md)
- [docs/retrospectives/0001-first-protocol-slice.md](docs/retrospectives/0001-first-protocol-slice.md)
- [BACKLOG.md](BACKLOG.md)
- [`docs/backlog/`](docs/backlog/) — individual
  cycle proposals

## Decision Rule

When in doubt:

- choose narrower protocol surface
- choose more explicit envelopes
- choose stronger determinism
- choose less host leakage
- choose behavior over architecture theater
- keep observation and mutation separate
- keep Wesley/GraphQL under compiler discipline

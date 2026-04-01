# Design Doc 0010 — Design Vocabulary

**Status:** closed
**Cycle:** 0006-design-vocabulary

## Sponsor Human

Application developer reading protocol types, TUI labels, and error
messages. Needs every term to mean one thing, consistently, so they can
build a mental model without translation tables.

## Sponsor Agent

Coding agent consuming `--json` envelopes and protocol types. Needs
field names and envelope keys to follow a glossary so it can map
protocol concepts to substrate concepts without heuristics.

## Hill

A canonical glossary exists, every term in the codebase matches it,
and the open "frame vs tick" tension is resolved with a documented
decision.

## Background

The backlog item `docs/backlog/design-vocabulary.md` identified three
known corrections:

| Wrong | Right | Status |
|-------|-------|--------|
| timeline | worldline | Already correct — no instances of "timeline" |
| frame → tick? | frame is correct at protocol level | Resolved (see Decision below) |
| working-set | strand | Already renamed in v0.1.0 |

A full codebase audit (2026-04-01) found **zero vocabulary violations**.
All user-visible strings, protocol types, error messages, schema
fields, and documentation use consistent terminology. The VISION.md
vocabulary table (lines 380-399) already captures the rules.

## Decision: frame vs tick

The backlog doc asked whether `frameIndex` should become `tickIndex`.

**Answer: No.** The two terms model different concepts:

- **tick** — Lamport clock value on a single lane. Ticks are
  substrate-level coordinates. A worldline has ticks; a strand has
  ticks. They advance independently.

- **frame** — Composite snapshot across all tracked lanes at a point
  in playback time. Frames are debugger-level concepts. Frame 0 is
  the synthetic empty state. Frame N shows what every lane looked
  like after N steps forward.

A frame contains `Coordinate` objects, each of which has a `tick`.
The frame indexes playback; the tick indexes the lane. These are
different axes. Renaming `frameIndex` to `tickIndex` would be
incorrect — a frame is not a tick.

VISION.md lines 396-398 already document this distinction.

## Deliverables

1. **Canonical glossary** at `docs/glossary.md` — the single source
   of truth for domain terms.
2. **CONTRIBUTING.md restructured** — split the megadoc into a
   practical front door (CONTRIBUTING.md) linking to separated
   concerns: `docs/doctrine.md`, `docs/glossary.md`,
   `docs/cycle-process.md`, `docs/release.md`.
3. **Tension resolved** — frame/tick decision documented in the
   glossary.
4. **Backlog item closed** — design-vocabulary.md marked as closed.

## Playback Questions

1. Does the glossary exist as a standalone doc?
2. Does every protocol type name match the glossary?
3. Does every user-visible string (TUI, CLI, error messages) match?
4. Is the frame/tick distinction documented and decided?
5. Can a new contributor find the glossary within 30 seconds?
6. Is CONTRIBUTING.md a practical front door, not a constitution?
7. Are maintainer-process docs separated from contributor guidance?

## Non-Goals

- No renames. The audit found nothing to rename.
- No protocol version bump. No type changes.
- No code changes beyond the glossary test and doc restructuring.

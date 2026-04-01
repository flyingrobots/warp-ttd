# Cycle D — Strand & Speculation Support

**Status:** queued

## Sponsor Human

Application developer exploring "what if" scenarios. Wants to fork a
worldline into a strand, apply speculative rewrites, and compare the
strand against the base observation — all through the debugger.

## Sponsor Agent

Coding agent performing automated conflict analysis. Needs strand creation,
intent queuing, tick draining, and comparison exposed through the protocol
so it can orchestrate speculative workflows programmatically.

## Hill

The git-warp adapter exposes strand lifecycle (create, write, tick, compare,
drop) through `TtdHostAdapter`, and the TUI renders strands as speculative
lanes with honest provenance.

## Playback Questions

- Can a strand be created from the TUI and appear in the lane catalog?
- Does stepping through a strand show its overlay receipts separately from
  the base worldline?
- Can the debugger compare a strand against its base observation?
- Are strand operations capability-gated (only available when the adapter
  declares them)?
- Does `--json` output include strand state?

## Non-Goals

- No braid composition UI (strand-of-strands).
- No strand persistence across sessions.
- No automatic conflict resolution.

## Scope

1. Design doc for strand integration.
2. Extend `TtdHostAdapter` with strand-aware methods (capability-gated).
3. Extend protocol types: strand descriptors, strand receipts.
4. git-warp adapter: wire `createStrand`, `tickStrand`, `compareStrand`.
5. TUI: strand creation, strand lane rendering, comparison view.
6. Test fixtures: `scenarioWithStrand()` in the fixture library.

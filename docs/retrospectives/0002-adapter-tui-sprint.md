# Retrospective 0002 — Adapter & TUI Sprint

**Date:** 2026-03-29
**Scope:** async interface migration, git-warp adapter, TUI port from warp-lens

## What Shipped

1. `TtdHostAdapter` interface made async (all methods return `Promise`).
2. git-warp host adapter (`GitWarpAdapter`) bridging WarpCore v16 into the TTD
   protocol with frame-per-lamport-tick indexing.
3. Test fixture library for creating temporary git-warp repos with contrived
   scenarios.
4. Fullscreen TUI ported from warp-lens, upgraded to bijou v4, rewritten
   against `TtdHostAdapter` (not `WarpClientPort`).
5. 14 spec tests (5 echo fixture + 9 git-warp integration).

## What Worked

- **Tests-first for the adapter.** Writing git-warp adapter tests before the
  implementation forced clarity about the frame indexing model and receipt
  mapping. The tests caught the multi-writer concurrent-tick edge case early.
- **Fixture library design.** `scenarioLinearHistory()` and
  `scenarioMultiWriter()` are reusable and will serve future cycles.
- **Structural typing for WarpCore.** Using `WarpCoreLike` instead of
  importing the class directly keeps the adapter testable against any
  compatible implementation.
- **Bijou v4 migration was smooth.** The main breaking change (Surface returns
  instead of strings) was caught immediately at first launch.

## What Didn't Work

- **Skipped the cycle development loop.** No design docs, no sponsor framing,
  no hill, no playback questions before implementation. This was a sprint, not
  a cycle. The process gap was caught and the loop has been formalized for all
  future work.
- **README and BACKLOG went stale.** Shipped three significant features without
  updating either document. A new contributor cloning the repo would see
  "docs-first bootstrap phase" as the status.
- **Integration tests in the fast suite.** git-warp tests (creating real git
  repos in /tmp, ~350ms each) ran in `npm test` alongside the ~1ms echo
  fixture tests. Now separated.
- **TUI hexagonal boundary leak.** The TUI directly imports and constructs
  `EchoFixtureAdapter` and `GitWarpAdapter` in the render layer. This
  violates the architecture principles in CONTRIBUTING.md. Scheduled for
  Cycle C.

## What We Learned

- **Async interface was the right call.** Every real host backend will be
  async. The echo fixture trivially adapts. bijou TEA handles async via
  commands. No regrets.
- **Frame indexing by Lamport tick is natural.** Grouping concurrent patches
  by tick produces honest frames. The multi-writer scenario proved this
  design handles the hard case correctly.
- **The warp-lens worker thread pattern was unnecessary.** Async adapters
  replace it entirely. The worker was a workaround for sync APIs, not a
  genuine concurrency need.

## Process Debt Cleared

- Cycle backlog structure established (`docs/backlog/`).
- Five cycles queued with full sponsor framing.
- CONTRIBUTING.md updated with backlog lifecycle rules.
- This retrospective and Cycle A (Housekeeping) address the remaining gaps.

## Verdict

The sprint proved the architecture claim: one TUI can talk to multiple host
adapters through the async `TtdHostAdapter` protocol. The process was messy
but the output is sound. The cycle loop is now in place for all future work.

# DX-019 — Resilient Partial Snapshots

Legend: [DX — Developer Experience](../../legends/DX-developer-experience.md)

## Idea

Currently, `DebuggerSession.fetchSnapshot` uses a "fail-fast" strategy. If any of the six adapter port calls fail, the entire session snapshot is lost, often resulting in a blank screen in the TUI.

Refactor `fetchSnapshot` to use `Promise.allSettled()`. This would allow the session to build a partial snapshot (e.g. valid Frame + Receipts) even if an auxiliary port (like `deliveryObservations`) fails due to a substrate error or capability gap. The TUI/CLI can then display "No Data" or "Capability Disabled" for the specific missing part rather than crashing the investigation.

## Why

1. **Investigator Stability**: Prevents minor substrate glitches from interrupting a worldline navigation.
2. **Graceful Lowering**: Naturally handles host adapters that only partially implement the capability-gated protocol.
3. **Diagnostic Visibility**: Surfaces specific port failures without losing the entire debugging context.

## Effort

Medium — requires refactoring `fetchSnapshot` and updating the TUI pages to handle undefined/failed properties in the snapshot.

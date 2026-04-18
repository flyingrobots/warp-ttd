# CI-001 — Visual Provenance Cone

Legend: [VIZ — Visual Language](../../legends/VIZ-visual-language.md)

## Idea

Implement a high-fidelity visualizer in the TUI (or a separate web surface) that shows the **Reverse Causal Cone** of a selected graph value. Using the receipt chain, it should walk backwards through time and render a "genealogy tree" of the rewrites that produced the current state.

Unlike a flat log, this view should use branching and merging lines to show how multiple writers at different ticks converged to produce a single value (e.g. `x = 5 because Alice @ T47 and Bob @ T31 both applied rewrites`).

## Why

1. **Cognitive Re-entry**: Helps an investigator immediately understand the "Why" behind a value without manual receipt-walking.
2. **Determinism Proof**: Visually demonstrates the "Provenance Over State" tenet.
3. **Data-Viz Maturity**: Showcases WARP TTD as a sophisticated systems instrument, not just a log viewer.

## Effort

Large — requires a causal layout engine and deep integration with the `receipts` port.

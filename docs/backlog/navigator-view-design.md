# Navigator View Design

**Status:** closed

## Problem

The Navigator page currently stacks boxes vertically with a decorative
shader that doesn't reflect real data. The layout was ported from
warp-lens without intentional design for warp-ttd's protocol surface.

## Questions to Answer

- What components belong in the Navigator view?
- Should the DAG shader show real causal structure or be removed?
- How should effect emissions and delivery observations be visualized
  relative to receipts?
- What's the right information density for debugging vs. overwhelming?
- Should the layout adapt based on what the adapter actually provides
  (capability-driven layout)?

## Non-Goals

- Not a full redesign of the TUI architecture.
- Not adding new protocol concepts — just presenting existing ones well.

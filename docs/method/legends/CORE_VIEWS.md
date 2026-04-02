# CORE_VIEWS

The foundational visual surfaces of the debugger.

## What it covers

The three views that make warp-ttd a debugger, not a CLI:

- **Worldline Viewer** — git-log-like view of ticks and strands.
  The primary navigation surface.
- **Graph Viewer** — materialized graph at any tick. Nodes, edges,
  properties, attachments.
- **Provenance Viewer** — select a value, trace its reverse causal
  cone through the receipt chain.

And the rendering primitives that support them: braille adjacency,
receipt flame graphs, snapshot diffing, writer heatmaps.

## Sponsor human

Application developer debugging a multi-writer WARP system. Needs
to answer: what happened, what changed, and why.

## Sponsor agent

Agent inspecting substrate state programmatically. Needs structured,
machine-readable access to the same information the human sees —
graph snapshots, receipt chains, diff output.

## Hills

1. A developer can open warp-ttd and understand what changed at any
   tick without reading raw receipt data.
2. An agent can query the same information through `--json` or MCP
   tools and get structured answers.
3. Provenance is traceable — select any value, see every rewrite
   that produced it.

## Playback questions

- Can the human step to a tick and see the graph state?
- Can the human select a value and trace its provenance?
- Can the agent get the same information as structured output?
- Does the worldline view show strand forks and writer attribution?
- Does diffing two ticks show what changed?

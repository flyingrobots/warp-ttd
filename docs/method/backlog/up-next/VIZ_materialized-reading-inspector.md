# Materialized Reading Inspector

**Legend:** VIZ
**Type:** design cycle

## Intent

Design the materialized reading inspector: a debugger surface for
graph-shaped readings materialized over a witnessed causal basis.

The old "graph viewer" framing is retired. WARP TTD does not inspect a
canonical graph substrate. It inspects readings emitted by an observer over
witnessed causal history.

Nodes, edges, properties, and attachments may still be rendered. They are UI
geometry for a reading, not the substrate truth itself. Every rendered
graph-shaped view must name the reading basis and the witness or receipt that
backs it.

## Required Metadata

- `basisRef`
- `observerPlanRef`
- `readingEnvelopeRef`
- `readingPosture`
- `witnessRef` or `receiptRef`
- `runtimeSource`
- `aperture`
- `budgetPosture`

## Open questions

- What is the display model for a graph-shaped reading in a terminal? Table of
  nodes + edges? Tree view? Adjacency rendering?
- How does the user navigate within a large reading? Filter by node type?
  Search by ID? Focus on a sub-reading?
- What does reading diffing look like when two readings have different bases,
  observer plans, or postures?
- How does the attachments plane render without implying direct substrate
  access?
- What is the agent surface? Structured `ReadingEnvelope` plus rendered
  graph-shaped payload?
- Can we prototype against ScenarioFixtureAdapter data?

## Expected outputs

- Design doc with sponsor users, hill, playback questions
- Backlog items for implementation work (rendering primitives,
  diff algorithm, TUI wiring)
- Decision on adjacency rendering applicability

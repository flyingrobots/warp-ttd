# Graph Viewer — Design Cycle

**Legend:** CORE_VIEWS
**Type:** design cycle

## Intent

Design the graph viewer — full materialized WARP graph at any tick.
Nodes, edges, properties, attachments. Step forward/backward to see
how the graph evolves. Diff two ticks to see what changed.

## Open questions

- What is the display model for a graph in a terminal? Table of
  nodes + edges? Tree view? Adjacency rendering (braille)?
- How does the user navigate within a large graph? Filter by node
  type? Search by ID? Focus on a subgraph?
- What does graph diffing look like? Added/removed/modified markers?
  Color coding?
- How does the attachments plane render? Separate panel? Inline?
- What is the agent surface? Structured graph snapshot format?
- Can we prototype against ScenarioFixtureAdapter data?

## Expected outputs

- Design doc with sponsor users, hill, playback questions
- Backlog items for implementation work (rendering primitives,
  diff algorithm, TUI wiring)
- Decision on braille adjacency applicability

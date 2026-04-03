# Lane Graph Renderer

**Legend:** CORE_VIEWS

The worldline viewer currently renders a flat text list. It should
render a git-log-style lane graph with colored vertical rails, dots
at active ticks, and fork connectors.

## The problem

WARP lanes are not git branches. They don't always merge. The
renderer needs to handle:

- **Fork** — strand appears, column allocated, connector from parent
- **Active** — dot on the rail, solid line
- **Quiet** — lane exists but no activity. Dotted/dim line or gap.
- **Reactivate** — was quiet, now active again (braiding). Resumes.
- **End of life** — lane stops appearing. Column freed. No merge.
- **Parallel worldlines** — peers, not parent/child. Both primary.

## Design questions

- Column assignment algorithm: how to allocate/free columns as
  lanes appear and disappear? Stable positions while alive.
- Line-drawing characters: box-drawing (│ ├ └) or braille? Color?
- How to show braided strands (quiet → active → quiet → active)?
- How to distinguish worldlines from strands visually?
- How wide should the graph gutter be? Fixed? Dynamic?
- What goes to the right of the graph? Writer, digest, summary?

## References

- GitKraken / SourceTree commit graph renderers
- `git log --graph --all --oneline`
- Bijou box-drawing character support

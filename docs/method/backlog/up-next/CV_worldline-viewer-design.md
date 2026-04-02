# Worldline Viewer — Design Cycle

**Legend:** CORE_VIEWS
**Type:** design cycle

## Intent

Design the worldline viewer — the primary navigation surface. A
scrollable, git-log-like view of ticks and strands. The user can
see the full causal history, see strand forks, jump to any tick,
and see who contributed where.

## Open questions

- How does the worldline view differ from the existing Navigator?
  Navigator shows position + summary at a single frame. Worldline
  shows the full history at once.
- What is the scroll model? Vertical list? Horizontal timeline?
- How are strand forks rendered? Tree connectors? Indentation?
- How does the worldline view handle many writers at the same tick?
- What does selection look like? Cursor on a tick? Highlight?
- What is the agent surface? `--json` output format for worldline
  queries?

## Expected outputs

- Design doc with sponsor users, hill, playback questions
- Backlog items for implementation work
- Prototype sketches (ASCII or TUI mockups)

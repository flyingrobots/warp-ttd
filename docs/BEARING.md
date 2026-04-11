# BEARING

## Current Hill

Make `warp-ttd` agent-surface-first in practice, not just in rhetoric.

Right now that means:

- treating CLI `--json` as the current canonical agent-facing surface
- promoting MCP from "cool idea" to explicit delivery-adapter work
- making TUI capabilities follow explicit CLI/MCP/session nouns instead
  of inventing debugger behavior ad hoc
- continuing the neighborhood-browser cut only where it sharpens shared
  structured surfaces

## Current Direction

The repo is moving toward one debugger ontology with multiple delivery
adapters:

- CLI now
- MCP next
- TUI and browser following the same application/session core

The TUI is still valuable, but it is no longer the leading edge for
what the debugger can mean. The agent surface defines the inspectable
contract first.

## Recent Truth

Recent work tightened the neighborhood/browser stack:

- `8c7cd0e` fixed site-driven worldline cursor recomputation
- `ffaed03` introduced a runtime-backed `NeighborhoodFocusSummary`
- `a948fb7` shared neighborhood focus across pages
- `48162ce` made CLI and MCP surfaces explicit in repo truth

## Not This Hill

- not a TUI-only debugger
- not a browser-only debugger fork
- not a second protocol next to the authored schema
- not an MCP story built directly on host adapters without the
  application/session core

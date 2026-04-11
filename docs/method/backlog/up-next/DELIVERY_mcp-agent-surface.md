# MCP agent surface

Promote the agent surface from "CLI JSON plus intention" to an
explicit MCP delivery adapter.

## Why

METHOD says to build the agent surface first. `warp-ttd` currently has
a real structured CLI surface, but no first-class MCP/tool surface.
That leaves the TUI too free to invent behavior the agent path cannot
inspect or drive.

## Goal

Build the first narrow MCP adapter over the existing application core:

- no second debugger stack
- no TUI-shaped payloads
- no browser-specific fork

The initial MCP tool family should mirror the current structured CLI:

- `hello`
- `catalog`
- `frame`
- `worldline`
- `effects`
- `deliveries`
- `context`
- `session`
- `step_forward`
- `step_backward`
- `seek_to_frame`

## Constraints

- Tool results must be derived from `DebuggerSession` and the host
  adapter boundary.
- Tool nouns must reuse the authored schema vocabulary.
- The TUI should consume capabilities proven here rather than
  freelancing new ones.

## Done when

- `docs/MCP.md` describes a real shipped surface, not planned intent
- an agent can inspect worldlines and neighborhood state without going
  through the TUI
- the tool vocabulary is obviously isomorphic to the CLI/session core

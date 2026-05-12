# MCP agent surface

Promote the agent surface from "CLI JSON plus intention" to an
explicit MCP delivery adapter.

## Why

METHOD says to build the agent surface first. `warp-ttd` currently has
a real structured CLI surface, but no first-class MCP/tool surface.
That leaves the TUI too free to invent behavior the agent path cannot
inspect or drive.

## Goal

Build the first narrow MCP adapter over the lawful optic/admission chain:

- no second debugger stack
- no TUI-shaped payloads
- no browser-specific fork
- no privileged bypass around artifact registration, grant presentation,
  admission, instrumentation, or witness emission

MCP should not mirror CLI. MCP should expose the lawful admission chain.

The initial tool family should inspect and present chain facts:

- list registered optic handles
- inspect artifact requirements
- inspect grants and grant posture
- present an invocation for admission
- inspect admission ticket or obstruction posture
- inspect law witness output
- inspect receipt output
- inspect reading envelope output
- inspect worldline and neighborhood readings through their basis,
  witness, receipt, and reading posture

## Constraints

- Tool results must be derived from `DebuggerSession` and the host
  adapter boundary.
- Tool nouns must reuse the authored schema vocabulary.
- CLI parity is useful only where it preserves the same chain semantics.
- The TUI should consume adapter capabilities proven here rather than
  freelancing new ones.

## Done when

- `docs/MCP.md` describes a real shipped surface, not planned intent
- an agent can inspect worldlines and neighborhood state without going
  through the TUI
- the tool vocabulary explains registered optic handles, artifact
  requirements, grant posture, admission tickets, witnesses, receipts,
  and reading envelopes without collapsing them into adapter-specific blobs

# MCP admission-chain surface

Promote the agent surface from "CLI JSON plus intention" to an explicit,
read-only MCP delivery adapter over debugger readings and admission-chain
posture.

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
- no authority issuance
- no grant construction
- no runtime admission
- no mutation
- no strand creation

MCP should not mirror CLI. MCP should expose the lawful admission chain.

MCP is transport and inspection. It is not authority, admission, grants, or
mutation.

The initial tool family should expose read-only facts:

- hello, session, worldline, and reading state through `DebuggerSession`
- adapter capabilities
- registered artifact facts when present
- admission-chain posture as absent, present, or obstructed
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
- The first implementation is read-only: no grants, no admission, no mutation,
  and no strand lifecycle commands.

## Done when

- `docs/MCP.md` describes a real shipped surface, not planned intent
- an agent can inspect worldlines and neighborhood state without going
  through the TUI
- the tool vocabulary explains registered optic handles, artifact
  requirements, grant posture, admission tickets, witnesses, receipts,
  and reading envelopes without collapsing them into adapter-specific blobs
- missing chain facts are represented explicitly as absent, not hidden or
  inferred

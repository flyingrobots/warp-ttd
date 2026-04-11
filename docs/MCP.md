# MCP

`warp-ttd` does not ship an MCP server yet.

This file exists to make the agent surface explicit and inspectable:
the repo intends to expose one, and it must be defined against the
same application/session core as the CLI and TUI.

## Current status

- Not implemented
- Planned as a delivery adapter
- Should be built on top of `DebuggerSession`, not as a second debugger
  stack

## Scope

The MCP surface should expose structured debugger operations as tools.
It should not introduce a second protocol, a browser-only ontology, or
TUI-shaped payloads.

The intended shape is:

```text
MCP tools
  → DebuggerSession / application core
    → TtdHostAdapter
      → host adapters
```

## Initial tool family

The first useful tool set is narrow:

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

These should be thin wrappers over existing session/CLI concepts, not
new semantics.

## Design rules

- MCP must reuse the authored schema vocabulary.
- Tool results must be machine-readable first.
- MCP should expose the same neighborhood/worldline/provenance nouns as
  the CLI.
- If a capability is not explicit enough for an MCP tool, the CLI/API
  surface is still too vague.
- TUI work should follow explicit CLI/MCP capability, not define it by
  accident.

## Relationship to CLI

The CLI is the current canonical agent surface.
The MCP server should be a tool-native projection of the same
capabilities.

The goal is:

- one session/app core
- one debugger ontology
- one host adapter boundary
- multiple delivery adapters

## Backlog link

The next concrete work is tracked in:

- `docs/method/backlog/up-next/DELIVERY_mcp-agent-surface.md`

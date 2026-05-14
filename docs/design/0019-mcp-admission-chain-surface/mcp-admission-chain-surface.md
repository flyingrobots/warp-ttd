---
title: MCP Admission-Chain Surface
status: landed
---

# MCP Admission-Chain Surface

**Cycle:** 0019-mcp-admission-chain-surface
**Legend:** DELIVERY
**Type:** feature cycle

## Sponsor Human

Operator inspecting a live or fixture-backed WARP host through an agentic
workstation. Needs a tool-native way to ask what the debugger currently knows
without opening the TUI and without accidentally causing playback, admission,
or mutation.

## Sponsor Agent

Coding agent investigating a failing causal or admission scenario. Needs stable
MCP tools that expose session, reading, adapter capability, and admission-chain
posture as structured facts. The agent must be able to distinguish "not
present yet" from "hidden inside an adapter blob."

## Hill

WARP TTD ships a first read-only MCP stdio surface over `DebuggerSession`:

- `warp_ttd.inspect_session`
- `warp_ttd.inspect_adapter_capabilities`
- `warp_ttd.inspect_readings`
- `warp_ttd.inspect_admission_chain`

Each tool is read-only, idempotent, closed-world, and non-destructive. Missing
lawful optic facts are represented explicitly as `ABSENT` posture instead of
being inferred or hidden.

## Non-Goals

- No grant issuance.
- No grant construction.
- No runtime admission.
- No mutation.
- No strand creation.
- No control tools for step, seek, fork, drop, promote, or braid lifecycle.
- No new TUI panels.

## Design Decision

The first cut uses the official MCP TypeScript SDK with stdio transport, but
keeps the tool payload builder small and testable. The implementation exposes
facts already available through `DebuggerSession` and marks future Echo/Wesley
facts as absent until host adapters can provide them.

This gives agents a real MCP entrypoint without pretending WARP TTD can already
compile artifacts, verify grants, admit invocations, or witness runtime access.

## Playback Questions

### Human

1. Can I start a WARP TTD MCP server?
2. Can I see that the advertised tools are read-only?
3. Can I inspect session/readings without advancing playback?
4. Can I see missing admission-chain facts as absent posture?

### Agent

1. Can I list tools and see only inspection verbs?
2. Can I call the tools through MCP and receive structured content?
3. Can I inspect cached adapter capabilities without causing another
   `hello()` handshake?
4. Can I prove the tools do not call step, seek, fork, grant, admission, or
   mutation paths?

## First Implementation

The shipped first implementation adds:

- `src/mcp/admissionChainSurface.ts`
  - pure inspection builders
  - read-only tool registration
  - `createMcpAdmissionChainServer`
- `src/mcp/main.ts`
  - stdio server entrypoint backed by `EchoFixtureAdapter`
- `npm run mcp`
  - local MCP stdio server command
- `test/mcpAdmissionChainSurface.spec.ts`
  - SDK in-memory transport tests for tool listing and tool calls
  - regression that cached `hello()` is reused
  - regression that concurrent first MCP calls share one initialization
  - regression that control adapter methods are not invoked

## Follow-On Work

- Add host adapter methods for real registered artifact facts when Echo exposes
  them.
- Replace absent placeholder posture with host-provided registration,
  requirement, grant, ticket, witness, receipt, and reading envelope facts.
- Add MCP resource URIs if agents need stable bookmarkable readings.
- Add browser and TUI consumers only after MCP facts are stable.

## Closure

The initial read-only MCP stdio surface has landed. The next work is not more
delivery plumbing or strand control; it is the admission-chain read model that
lets MCP, CLI, and later TUI surfaces inspect registration, grant, ticket,
witness, receipt, and reading-envelope facts without inventing authority,
admission, or mutation paths.

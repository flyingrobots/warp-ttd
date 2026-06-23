# Debugger Session Core architecture

## Purpose

The session core owns the mutable runtime contract between protocol/session input and downstream readers.

## In-memory ownership model

- **`src/app/debuggerSession.ts`** builds the canonical snapshot for active sessions.
- **`src/app/sessionSync.ts`** applies protocol events into synchronized session state.
- The snapshot object is the shared boundary for CLI, MCP, and TUI consumers.

## State transitions

1. Session bootstrap validates protocol preconditions and adapter output shape.
2. Capabilities and pinning maps are computed deterministically from protocol state.
3. Navigation and worldline updates publish through snapshot transitions.
4. Snapshot serialization is kept stable to make regression expectations reproducible.

## Control boundaries

- **Upstream ownership:** `protocol-contract` and `adapter-port-and-registry`.
- **Session boundary:** canonical ownership of snapshot lifecycle, navigation, and capability gating.
- **Downstream contracts:** `cli-interface`, `mcp-interface`, `tui-shell`, and `worldline-visualization` read only from session contracts.

## Failure risk

Most downstream breakages arise from incorrect boundary changes:
- capability mismatches,
- pin lifecycle drift,
- or unstable serialization fields.

Those changes must be treated as contract-impacting and re-verified in all impacted interfaces.


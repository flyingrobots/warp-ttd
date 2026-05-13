# BEARING

Current direction and active tensions. Historical ship data is in `CHANGELOG.md`.

```mermaid
timeline
    Phase 1 : Protocol v0.1.0 : git-warp Adapter : Scenario Fixtures
    Phase 2 : TUI Cockpit : Navigator View : JSONL CLI
    Phase 3 : Agent-First Surface : MCP Admission Chain : Browser-TTD Migration
    Phase 4 : DebuggerSession : Speculative Investigation : Worldline Viewer
```

## Active Gravity

### 1. MCP Admission-Chain Surface

- Promoting MCP from speculative experiment to the next explicit delivery
  adapter.
- Treating MCP as transport and inspection over `DebuggerSession`, host adapter
  facts, readings, and admission-chain posture.
- Keeping MCP out of authority issuance, grant construction, runtime admission,
  mutation, and local strand creation.

### 2. Neighborhood & Site Catalog

- Refinement of the `NeighborhoodFocusSummary` to share focus across disparate debugger pages.
- Hardening site-driven worldline cursor recomputation for consistent navigation.

### 3. DebuggerSession Maturity

- Implementation of the `DebuggerSession` investigation object to track speculative result handles and investigator context.
- Scaling the window-based read model to handle high-density causal worldlines.
- Exposing read-only session, worldline, reading, adapter capability, and
  admission-chain facts before adding speculative lifecycle controls.

## Tensions

- **TUI-Lead Inertia**: Breaking the habit of implementing new inspection
  features in the TUI before the structured CLI/MCP surface.
- **Protocol Drift**: Keeping the Wesley-compiled schema perfectly synchronized
  with local host-adapter implementation details.
- **Speculative Complexity**: Managing the investigator's cognitive load when
  branching and braiding multiple counterfactual strands. Strand work is
  blocked until the debugger can represent the admission-chain facts that make
  fork-like actions lawful instead of local UI mutation.

## Next Target

The immediate focus is the **MCP Admission-Chain Surface**: a read-only
agent-facing transport and inspection layer for session, worldline, reading,
adapter capability, artifact, grant posture, admission ticket, obstruction,
witness, and receipt facts. MCP is not authority, admission, grant issuance, or
mutation. See
[`docs/method/backlog/asap/DELIVERY_mcp-admission-chain-surface.md`](./method/backlog/asap/DELIVERY_mcp-admission-chain-surface.md).

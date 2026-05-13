# MCP

> **Status: initial read-only stdio surface implemented.** See
> [cycle 0019](./design/0019-mcp-admission-chain-surface/mcp-admission-chain-surface.md)
> and [backlog item](./method/backlog/asap/DELIVERY_mcp-admission-chain-surface.md).

WARP TTD is a tool-native participant in the agentic workstation via the Model
Context Protocol (MCP).

```mermaid
sequenceDiagram
    participant A as Agent
    participant S as MCP Server
    participant DS as DebuggerSession
    participant H as Host Adapter
    A->>S: call tool(inspect_session)
    S->>DS: inspect read model
    DS->>H: read host facts
    H-->>DS: readings and posture
    DS-->>S: session/worldline/admission facts
    S-->>A: structured result
```

## Scope

The MCP surface exposes structured debugger facts as tools. It is a thin,
read-only projection over the `DebuggerSession`, the host adapter boundary, and
the host-neutral protocol bedrock.

MCP is transport and inspection. It does not issue authority, construct grants,
perform admission, mutate host state, or create local strands.

## Tool Groups

- **Inspection**: `warp_ttd.inspect_session`,
  `warp_ttd.inspect_adapter_capabilities`, `warp_ttd.inspect_readings`.
- **Capabilities**: adapter support reported as `AdapterCapability` facts.
- **Admission Chain**: `warp_ttd.inspect_admission_chain` reports registered
  artifact facts, requirement posture, grant posture, admission ticket or
  obstruction posture, witness facts, receipt facts, and reading envelope facts
  when present.

## Running

```bash
npm run mcp
```

The initial server uses stdio transport and the fixture-backed host adapter. It
is intentionally read-only.

## Design Rules

- **Shared Core**: MCP must reuse the `DebuggerSession` logic. No second
  debugger stack.
- **Ontology Parity**: Use the same worldline, provenance, receipt, reading,
  and admission-chain nouns as the CLI and authored schema.
- **Machine-Readable**: Every result must be parseable by an agent without
  ad-hoc TUI formatting.
- **Read-Only First**: Initial MCP work exposes absent, present, and obstructed
  facts. It does not add strand creation, grant issuance, admission, or
  mutation paths.
- **Honest Absence**: Missing Echo/Wesley admission-chain facts are returned as
  explicit `ABSENT` posture until host adapters provide them.

---
**The goal is tool-native inspection. TUI work follows explicit MCP capability,
not the other way around.**

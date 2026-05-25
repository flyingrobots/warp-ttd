# MCP

> **Status: initial read-only stdio surface implemented.** See
> [cycle 0019](./design/0019-mcp-admission-chain-surface/mcp-admission-chain-surface.md)
> and [completed backlog item](./method/graveyard/DELIVERY_mcp-admission-chain-surface.md).
> Agent parity is designed in
> [cycle 0022](./design/0022-mcp-agent-parity/mcp-agent-parity.md).

WARP TTD is a tool-native participant in the agentic workstation via the Model
Context Protocol (MCP).

## Agent-Native Contract

MCP is the preferred LLM-facing interface for WARP TTD inspection of Continuum
apps, and it is the first place new structured debugger facts should become
available. CLI `--json` remains the deterministic shell and audit surface; TUI
and browser views are downstream renderers over the same facts.

TUI and browser views must not be the first or only implementation of a debugger
feature. If an LLM agent cannot inspect the feature without screen-scraping
human UI output, the feature is incomplete.

Interaction through MCP must still be lawful: read-only inspection remains the
default, and any future control path must be explicit about authority,
admission, mutation, ticketing, witnesses, receipts, and reading posture.

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
  `warp_ttd.inspect_adapter_capabilities`, `warp_ttd.inspect_readings`, and
  `warp_ttd.inspect_live_targets`.
- **Capabilities**: adapter support reported as `AdapterCapability` facts.
- **Admission Chain**: `warp_ttd.inspect_admission_chain` reports registered
  artifact facts, requirement posture, grant posture, admission ticket or
  obstruction posture, witness facts, receipt facts, and reading envelope facts
  when present.
- **Live Targets**: `warp_ttd.inspect_live_targets` reports the same read-only
  target posture as `targets --json`, including runtime-boundary evidence
  posture. For `jedit`, it also reports `echoAdapterProbe`, which distinguishes
  missing root, absent bridge, supported bridge, unsupported ABI, and obstructed
  descriptor. Adapter readiness is not upgraded into Continuum evidence
  availability or an open Echo session.

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
- **Evidence Honesty**: Translated substrate evidence is not native Continuum
  witnesshood. A tool must not report `CONTINUUM_NATIVE` unless
  `nativeContinuumWitness` is true.

---
**The goal is tool-native inspection. TUI work follows the explicit MCP
structured surface, not the other way around.**

---
title: WARP TTD Topic Registry
topic: docs-topics
topics:
  - onboarding
  - registry
  - graph
  - shelves
date_created: 2026-06-22
date_last_updated: 2026-06-22
schema_version: 2
registry_version: 2.1
owner: WARP TTD Team
code_owners:
  - James <james@flyingrobots.dev>
status: active
shelf_count: 12
shelf_graph:
  - family: Protocol Layer
    shelves:
      - protocol-contract
  - family: Adapter Layer
    shelves:
      - adapter-port-and-registry
      - adapter-implementations
  - family: Session Layer
    shelves:
      - debugger-session-core
      - neighborhood-state-models
      - shared-family-facts
      - effect-and-delivery-observability
  - family: Interface Layer
    shelves:
      - cli-interface
      - mcp-interface
      - tui-shell
      - worldline-visualization
  - family: Discovery Layer
    shelves:
      - continuum-target-discovery
      - admission-chain-read-model
shelves:
  - id: protocol-contract
    title: Protocol Contract
    path: protocol-contract/README.md
    family: Protocol Layer
    risk_level: high
    status: stable
    depends_on: []
    used_by:
      - adapter-port-and-registry
      - adapter-implementations
      - debugger-session-core
      - shared-family-facts
      - effect-and-delivery-observability
      - cli-interface
      - mcp-interface
      - tui-shell
      - worldline-visualization
      - continuum-target-discovery
      - admission-chain-read-model
    agent_entry_queries:
      - id: onboarding
        intent: Read orientation and contract scope.
        anchor: "#overview"
      - id: edit
        intent: Edit a protocol field and run chain checks.
        anchor: "#workflow-example-new-field-introduction"
      - id: triage
        intent: Triage protocol failures and parity mismatch.
        anchor: "#failure-mode-catalog"
      - id: impact
        intent: Validate cross-shelf implications before release.
        anchor: "#governance-and-boundary-dependencies"

  - id: adapter-port-and-registry
    title: Adapter Port and Registry
    path: adapter-port-and-registry/README.md
    family: Adapter Layer
    risk_level: medium
    status: stable
    depends_on:
      - protocol-contract
    used_by:
      - tui-shell
      - cli-interface
      - mcp-interface
      - continuum-target-discovery
    agent_entry_queries:
      - id: onboarding
        intent: Learn adapter resolution and capability boundaries.
        anchor: "#overview"
      - id: edit
        intent: Modify adapter registration and inspect scope constraints.
        anchor: "#reader-pathways"
      - id: triage
        intent: Triage adapter capability mismatch versus protocol consumers.
        anchor: "#failure-modes-and-evidence"

  - id: adapter-implementations
    title: Adapter Implementations
    path: adapter-implementations/README.md
    family: Adapter Layer
    risk_level: medium
    status: stable
    depends_on:
      - adapter-port-and-registry
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Compare implementation shapes for fixture, git-warp, and scenario.
        anchor: "#overview"
      - id: edit
        intent: Update concrete adapter behavior.
        anchor: "#reader-pathways"
      - id: triage
        intent: Resolve adapter runtime divergence against registry contracts.
        anchor: "#failure-modes-and-evidence"

  - id: debugger-session-core
    title: Debugger Session Core
    path: debugger-session-core/README.md
    family: Session Layer
    risk_level: high
    status: stable
    depends_on:
      - protocol-contract
      - adapter-port-and-registry
    used_by:
      - worldline-visualization
      - tui-shell
    agent_entry_queries:
      - id: onboarding
        intent: Understand session snapshotting and navigation state.
        anchor: "#overview"
      - id: edit
        intent: Change session lifecycle with minimal cross-shelf impact.
        anchor: "#reader-pathways"
      - id: triage
        intent: Debug snapshot and cursor/state mismatch failures.
        anchor: "#failure-modes-and-evidence"

  - id: neighborhood-state-models
    title: Neighborhood State Models
    path: neighborhood-state-models/README.md
    family: Session Layer
    risk_level: medium
    status: stable
    depends_on:
      - debugger-session-core
    used_by:
      - shared-family-facts
    agent_entry_queries:
      - id: onboarding
        intent: Learn neighborhood summaries and reintegration assumptions.
        anchor: "#overview"
      - id: triage
        intent: Triage focus/reintegration and neighborhood projection failures.
        anchor: "#failure-mode-catalog"

  - id: shared-family-facts
    title: Shared Family Facts
    path: shared-family-facts/README.md
    family: Session Layer
    risk_level: high
    status: stable
    depends_on:
      - neighborhood-state-models
    used_by:
      - effect-and-delivery-observability
    agent_entry_queries:
      - id: onboarding
        intent: Learn family fact ownership, preference, and ingestion flow.
        anchor: "#overview"
      - id: edit
        intent: Update family fact precedence and reconciliation rules.
        anchor: "#reader-pathways"
      - id: triage
        intent: Resolve host-vs-local fact conflict failures.
        anchor: "#failure-mode-catalog"

  - id: effect-and-delivery-observability
    title: Effect and Delivery Observability
    path: effect-and-delivery-observability/README.md
    family: Session Layer
    risk_level: medium
    status: stable
    depends_on:
      - shared-family-facts
      - debugger-session-core
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Understand effect extraction and delivery summary observability.
        anchor: "#overview"
      - id: triage
        intent: Resolve summary extraction and effect traceability failures.
        anchor: "#failure-modes-and-evidence"

  - id: cli-interface
    title: CLI Interface
    path: cli-interface/README.md
    family: Interface Layer
    risk_level: medium
    status: stable
    depends_on:
      - protocol-contract
      - debugger-session-core
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Learn JSON/JSONL command output contracts.
        anchor: "#overview"
      - id: edit
        intent: Update command surfaces with protocol-safe output changes.
        anchor: "#reader-pathways"
      - id: triage
        intent: Handle CLI output shape regressions against protocol contract.
        anchor: "#failure-modes-and-evidence"

  - id: mcp-interface
    title: MCP Interface
    path: mcp-interface/README.md
    family: Interface Layer
    risk_level: medium
    status: stable
    depends_on:
      - protocol-contract
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Learn read-only MCP tool contracts and session reuse behavior.
        anchor: "#overview"
      - id: triage
        intent: Triage MCP tool shape or session command failures.
        anchor: "#failure-modes-and-evidence"

  - id: tui-shell
    title: TUI Shell
    path: tui-shell/README.md
    family: Interface Layer
    risk_level: medium
    status: stable
    depends_on:
      - protocol-contract
      - debugger-session-core
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Learn page flow and inspector synchronization assumptions.
        anchor: "#overview"
      - id: triage
        intent: Resolve UI/session sync regression across connect and inspector paths.
        anchor: "#failure-modes-and-evidence"

  - id: worldline-visualization
    title: Worldline Visualization
    path: worldline-visualization/README.md
    family: Interface Layer
    risk_level: medium
    status: stable
    depends_on:
      - shared-family-facts
      - debugger-session-core
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Understand lane/worldline projection and split rendering.
        anchor: "#overview"
      - id: triage
        intent: Triage projection, layout, and lane ordering mismatches.
        anchor: "#failure-modes-and-evidence"

  - id: continuum-target-discovery
    title: Continuum Target Discovery
    path: continuum-target-discovery/README.md
    family: Discovery Layer
    risk_level: high
    status: stable
    depends_on:
      - protocol-contract
    used_by:
      - admission-chain-read-model
    agent_entry_queries:
      - id: onboarding
        intent: Learn target discovery posture and runtime hello contracts.
        anchor: "#overview"
      - id: triage
        intent: Resolve discovery drift and hello contract mismatches.
        anchor: "#failure-mode-catalog"

  - id: admission-chain-read-model
    title: Admission Chain Read Model
    path: admission-chain-read-model/README.md
    family: Discovery Layer
    risk_level: high
    status: stable
    depends_on:
      - continuum-target-discovery
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Learn obstruction/fallback posture and admission semantics.
        anchor: "#overview"
      - id: triage
        intent: Resolve admission-chain and fallback failure modes.
        anchor: "#failure-modes-and-evidence"
---

# Topic Shelves (Landed Feature Contracts)

This directory tracks durable, test-backed contracts for existing WARP TTD behavior.

## Machine Registry (agent-first)

This registry is the definitive parse-safe entry point for dynamic agents. A context governor should read this frontmatter first and use `agent_entry_queries` as the first-action routing table.

### Recommended agent bootstrap

1. Load `shelf_graph` to understand coverage and grouping.
2. Read the target shelf entry from `shelves`.
3. Execute one `agent_entry_query` anchor before deep reading.
4. Follow `depends_on` / `used_by` for downstream checks when a change is proposed.

### Bootstrap query schema (machine-readable)

- `shelves[].agent_entry_queries[].id`: action key (`onboarding`, `edit`, `triage`, `impact`).
- `shelves[].agent_entry_queries[].intent`: concise first-step intent.
- `shelves[].agent_entry_queries[].anchor`: section anchor in the shelf README.

## High-Level Mind Map

```mermaid
mindmap
  root((WARP TTD Topics))
    Protocol Layer
      protocol-contract
    Adapter Layer
      adapter-port-and-registry
      adapter-implementations
    Session Layer
      debugger-session-core
      neighborhood-state-models
      shared-family-facts
      effect-and-delivery-observability
    Interface Layer
      cli-interface
      mcp-interface
      tui-shell
      worldline-visualization
    Discovery Layer
      continuum-target-discovery
      admission-chain-read-model
```

## Active Topic Shelves

### Protocol Layer

```mermaid
mindmap
  root((protocol-contract))
    data schema contract
    versioned protocol shape
    artifact parity
```

#### [protocol-contract](protocol-contract/README.md)
Protocol schema, protocol mirror, and shape/version invariants.

### Adapter Layer

```mermaid
mindmap
  root((adapter-port-and-registry))
    adapter resolution
    adapter kinds/config
    capability boundaries
```

#### [adapter-port-and-registry](adapter-port-and-registry/README.md)
Host adapter port, capabilities, and adapter resolution.

```mermaid
mindmap
  root((adapter-implementations))
    echo fixture adapter
    git-warp adapter
    scenario adapter
```

#### [adapter-implementations](adapter-implementations/README.md)
Fixture, git-warp, and scenario adapter behavior.

### Session Layer

```mermaid
mindmap
  root((debugger-session-core))
    session snapshotting
    navigation state
    pin lifecycle
```

#### [debugger-session-core](debugger-session-core/README.md)
Session lifecycle, snapshot assembly, and navigation state.

```mermaid
mindmap
  root((neighborhood-state-models))
    neighborhood summary
    reintegration focus
```

#### [neighborhood-state-models](neighborhood-state-models/README.md)
Neighborhood summaries and focus/cross-view state contracts.

```mermaid
mindmap
  root((shared-family-facts))
    family fact ingestion
    local-vs-host evidence
    fallback posture
```

#### [shared-family-facts](shared-family-facts/README.md)
Shared-family ingress and host/manifest continuity contracts.

```mermaid
mindmap
  root((effect-and-delivery-observability))
    effect extraction
    delivery summaries
    capability-safe fallbacks
```

#### [effect-and-delivery-observability](effect-and-delivery-observability/README.md)
Effects, observations, and execution context.

### Interface Layer

```mermaid
mindmap
  root((cli-interface))
    JSON/JSONL output
    session and worldline commands
```

#### [cli-interface](cli-interface/README.md)
Machine-readable and human CLI workflows.

```mermaid
mindmap
  root((mcp-interface))
    read-only tool surface
    session-admission contracts
```

#### [mcp-interface](mcp-interface/README.md)
MCP server, read-only inspection tools, and session reuse.

```mermaid
mindmap
  root((tui-shell))
    page lifecycle
    inspector and connect flow
```

#### [tui-shell](tui-shell/README.md)
Connect and synchronization model for shell workflows.

```mermaid
mindmap
  root((worldline-visualization))
    lane and worldline layouts
    split rendering
```

#### [worldline-visualization](worldline-visualization/README.md)
Lane layout, worldline columns, and navigation.

### Discovery Layer

```mermaid
mindmap
  root((continuum-target-discovery))
    target posture
    runtime hello contracts
```

#### [continuum-target-discovery](continuum-target-discovery/README.md)
Live target descriptors, discovery posture, and runtime hello facts.

```mermaid
mindmap
  root((admission-chain-read-model))
    admission posture
    fallback and obstruction
```

#### [admission-chain-read-model](admission-chain-read-model/README.md)
Admission-chain posture model and read inspection.

Each shelf has:
- `README.md`: current truth at HEAD.
- `test-plan.md`: executable evidence, cases, fixtures, oracles, and known gaps.

## Onboarding path for uninitiated readers

1. Start with `protocol-contract` to understand the data vocabulary.
2. Read `adapter-port-and-registry` to learn runtime boundaries.
3. Read `debugger-session-core` to understand session assembly.
4. Read `neighborhood-state-models` and `shared-family-facts` to learn derived summaries.
5. Read interface shelves (`cli-interface`, `mcp-interface`, `tui-shell`, `worldline-visualization`) to learn consumption paths.
6. Read operational shelves (`effect-and-delivery-observability`, `continuum-target-discovery`, `admission-chain-read-model`) for why posture and absence behavior matters.
7. Validate changes against linked `test-plan.md` files before editing behavior.

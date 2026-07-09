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
shelf_count: 14
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
      - runtime-discovery-registry
      - admission-chain-read-model
  - family: Governance Layer
    shelves:
      - roadmap-governance
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
      - runtime-discovery-registry
      - admission-chain-read-model
    agent_entry_queries:
      - id: onboarding
        intent: Read orientation and contract scope.
        anchor: "#entry-onboarding"
      - id: edit
        intent: Edit a protocol field and run chain checks.
        anchor: "#entry-edit"
      - id: triage
        intent: Triage protocol failures and parity mismatch.
        anchor: "#entry-triage"
      - id: impact
        intent: Validate cross-shelf implications before release.
        anchor: "#entry-impact"

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
      - runtime-discovery-registry
    agent_entry_queries:
      - id: onboarding
        intent: Learn adapter resolution and capability boundaries.
        anchor: "#entry-onboarding"
      - id: edit
        intent: Modify adapter registration and inspect scope constraints.
        anchor: "#entry-edit"
      - id: triage
        intent: Triage adapter capability mismatch versus protocol consumers.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: edit
        intent: Update concrete adapter behavior.
        anchor: "#entry-edit"
      - id: triage
        intent: Resolve adapter runtime divergence against registry contracts.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: edit
        intent: Change session lifecycle with minimal cross-shelf impact.
        anchor: "#entry-edit"
      - id: triage
        intent: Debug snapshot and cursor/state mismatch failures.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Triage focus/reintegration and neighborhood projection failures.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: edit
        intent: Update family fact precedence and reconciliation rules.
        anchor: "#entry-edit"
      - id: triage
        intent: Resolve host-vs-local fact conflict failures.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Resolve summary extraction and effect traceability failures.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: edit
        intent: Update command surfaces with protocol-safe output changes.
        anchor: "#entry-edit"
      - id: triage
        intent: Handle CLI output shape regressions against protocol contract.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Triage MCP tool shape or session command failures.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Resolve UI/session sync regression across connect and inspector paths.
        anchor: "#entry-triage"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Triage projection, layout, and lane ordering mismatches.
        anchor: "#entry-triage"

  - id: continuum-target-discovery
    title: Continuum Target Discovery
    path: continuum-target-discovery/README.md
    family: Discovery Layer
    risk_level: high
    status: stable
    depends_on:
      - protocol-contract
    used_by:
      - runtime-discovery-registry
      - admission-chain-read-model
    agent_entry_queries:
      - id: onboarding
        intent: Learn target discovery posture and runtime hello contracts.
        anchor: "#entry-onboarding"
      - id: triage
        intent: Resolve discovery drift and hello contract mismatches.
        anchor: "#entry-triage"

  - id: runtime-discovery-registry
    title: Runtime Discovery Registry
    path: runtime-discovery-registry/README.md
    family: Discovery Layer
    risk_level: medium
    status: current
    depends_on:
      - continuum-target-discovery
      - adapter-port-and-registry
      - protocol-contract
    used_by:
      - continuum-target-discovery
      - cli-interface
      - mcp-interface
    agent_entry_queries:
      - id: onboarding
        intent: Learn local runtime registry schema and source priority.
        anchor: "#entry-onboarding"
      - id: edit
        intent: Change registry parsing, fixtures, or normalization.
        anchor: "#entry-edit"
      - id: triage
        intent: Diagnose malformed runtime registry inputs.
        anchor: "#entry-triage"
      - id: impact
        intent: Validate downstream CLI/MCP discovery implications.
        anchor: "#entry-impact"

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
        anchor: "#entry-onboarding"
      - id: triage
        intent: Resolve admission-chain and fallback failure modes.
        anchor: "#entry-triage"

  - id: roadmap-governance
    title: Roadmap Governance
    path: roadmap-governance/README.md
    family: Governance Layer
    risk_level: medium
    status: current
    depends_on: []
    used_by: []
    agent_entry_queries:
      - id: onboarding
        intent: Understand roadmap issue authority and generated DAG artifacts.
        anchor: "#entry-onboarding"
      - id: edit
        intent: Change roadmap generation, sync, or PR readiness rules.
        anchor: "#entry-edit"
      - id: triage
        intent: Diagnose stale ROADMAP, DAG, or docs-impact state.
        anchor: "#entry-triage"
      - id: impact
        intent: Review planning and publication impact for governance edits.
        anchor: "#entry-impact"
---
# Topic Shelf Registry

This index maps durable, contract-bearing behavior to discoverable topic shelves and stable agent routes.
The source of truth for each shelf remains in each shelf directory and its `topic.yaml` (or validated README frontmatter during migration).

<a id="entry-onboarding"></a>
## At a glance

| Question | Answer |
|---|---|
| What this doc owns | Shelf discovery, topic ownership routing, and boundary navigation. |
| What it does not own | Runtime contracts, tests, evidence rows, source behavior, and milestone management. |
| How it works | Humans and agents start here, select a shelf, then follow one of four entry points (`onboarding`, `edit`, `triage`, `impact`) in that shelf README. |
| Why this matters | It reduces "where do I edit/read next" ambiguity during behavior changes. |
| First prerequisite | `docs/topics/DOCUMENTATION_STANDARDS.md` plus the target topic `README.md` and `test-plan.md`. |
| What changes propagate | Missing, drifted, or mislinked shelf edges here can misroute edit-impact checks and triage steps. |

## Registry quick map

| Family | Shelf | Risk | Path |
|---|---|---|---|
| Protocol Layer | protocol-contract | high | `protocol-contract/README.md` |
| Adapter Layer | adapter-port-and-registry | medium | `adapter-port-and-registry/README.md` |
| Adapter Layer | adapter-implementations | medium | `adapter-implementations/README.md` |
| Session Layer | debugger-session-core | high | `debugger-session-core/README.md` |
| Session Layer | neighborhood-state-models | medium | `neighborhood-state-models/README.md` |
| Session Layer | shared-family-facts | high | `shared-family-facts/README.md` |
| Session Layer | effect-and-delivery-observability | medium | `effect-and-delivery-observability/README.md` |
| Interface Layer | cli-interface | medium | `cli-interface/README.md` |
| Interface Layer | mcp-interface | medium | `mcp-interface/README.md` |
| Interface Layer | tui-shell | medium | `tui-shell/README.md` |
| Interface Layer | worldline-visualization | medium | `worldline-visualization/README.md` |
| Discovery Layer | continuum-target-discovery | high | `continuum-target-discovery/README.md` |
| Discovery Layer | runtime-discovery-registry | medium | `runtime-discovery-registry/README.md` |
| Discovery Layer | admission-chain-read-model | high | `admission-chain-read-model/README.md` |
| Governance Layer | roadmap-governance | medium | `roadmap-governance/README.md` |

<a id="entry-edit"></a>
## Safe change path

Use this sequence before merging contract or behavior changes:

1. Identify the owning shelf for the changed behavior.
2. Update that shelf's `topic.yaml` and `test-plan.md` evidence rows before behavior merge.
3. Keep the registry entry in this file synchronized during migration (until manifest-only generation is complete).
4. Run:
   - `npm run docs:check`
   - `npm run docs:evidence`
   - `npm run docs:impact`
5. For contract-bearing shelf changes, update `README.md` Evidence rows and executable test-name anchors.
6. Run repository verification set when behavior changes touch runtime:
   - `npm run test`
   - `npm run test:integration`
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run lint:check`

Allowed exceptions:
- If behavior is unchanged and only this registry shape is being repaired, run docs gates and explain why runtime checks are out of scope.
- If evidence is missing, documentation repair is allowed first, but contract-bearing behavior changes remain blocked until proof is restored.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Unknown dependency ID in registry | docs gate `DOCL-REG-UNKNOWN-DEP` | Impact graph misses owners and downstream checks are skipped | Inspect and correct `depends_on` shelf IDs | `npm run docs:check` |
| Shelf readme missing in registry path | docs gate `DOCL-REG-MISSING-READMEs` | Agent routing fails for a shelf | Fix `path` and add the missing README target | `npm run docs:check` |
| Registry missing shelf | docs gate `DOCL-REG-MISSING` | New behavior has no entry point for impact/readability checks | Add shelf record and `depends_on`/`used_by` links | `npm run docs:check` |
| Anchor route missing in shelf | Onboarding/edit/triage start point unavailable | Agents cannot enter the right playbook quickly | Add explicit anchors in topic README: `entry-onboarding`, `entry-edit`, `entry-triage` | `npm run docs:eval` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | Shelf manifests and topic ownership metadata in `docs/topics/*` |
| Used by | Agents, docs commands, and pre-merge impact checks |
| Cross-shelf impact | Incorrect edges can hide compatibility scope and misroute triage/impact reads |

## Evidence

- `docs/topics/DOCUMENTATION_STANDARDS.md`: process and section intent
- `scripts/docs-verify.mjs`: machine checks, registry parsing, evidence and impact validation
- `docs/topics/*/topic.yaml` or validated shelf frontmatter: canonical shelf metadata
- Required checks that keep this file trustworthy: `npm run docs:check`, `npm run docs:evidence`, and `npm run docs:impact`

---
title: "Adapter Implementations"
topic: "adapter-implementations"
topics:
  - adapters
  - protocol-contract
  - protocol
  - fixtures
  - test-ledger
date_created: "2026-06-22"
date_last_updated: "2026-06-22"
status_last_reviewed: "2026-06-22"
author: "James <james@flyingrobots.dev>"
code_owners:
  - "James <james@flyingrobots.dev>"
status: "current"
schema_version: "1.1.0"
risk_level: "medium"
change_impact: "adapter runtime semantics are contract-sensitive; changes must preserve required methods and evidence bindings in this topic."
depends_on:
  - "protocol-contract"
  - "adapter-port-and-registry"
used_by:
  - "debugger-session-core"
  - "cli-interface"
  - "mcp-interface"
  - "tui-shell"
  - "worldline-visualization"
verification:
  commands:
    - "npm run test"
    - "npm run test:integration"
    - "npx tsc --noEmit"
    - "npm run lint"
    - "npm run lint:check"
  notes: "No behavior edits were made in this topic refresh."
review_interval_days: 30
test_plan: "test-plan.md"
agent_entry_queries:
  - id: onboarding
    intent: "Learn concrete adapter implementations before changing behavior."
    anchor: "#entry-onboarding"
  - id: edit
    intent: "Perform contract edits; verify test-plan requirements and evidence first."
    anchor: "#entry-edit"
  - id: triage
    intent: "Diagnose adapter execution failures and map to remediation."
    anchor: "#entry-triage"
  - id: impact
    intent: "Review cross-shelf consequences after an adapter change."
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns concrete adapter behavior for all built-in kinds.
It is where `EchoFixtureAdapter`, `GitWarpAdapter`, and scenario-based adapters implement shared host-facing methods.

| Question | Answer |
|---|---|
| What this topic owns | required protocol method coverage and optional capability behavior per adapter implementation. |
| What it does not own | adapter kind dispatch policy and protocol schema itself. |
| How it works | each adapter converts protocol contract capabilities into host-facing behavior used by inspection and session flows. |
| Why this matters | this shelf governs how adapters behave when the same contract is exercised from different surfaces. |
| First prerequisite | `adapter-port-and-registry` for selection semantics. |
| What changes propagate | changed adapter behavior alters parity expectations in runtime, CLI, MCP, and TUI consumers. |

<a id="entry-edit"></a>
## Safe change path

1. Edit implementation and shared fixtures before broadening or narrowing required method behavior.
2. Keep `R-AD-*` requirements in `test-plan.md` aligned with changed behavior.
3. Update tests for specific implementation and cross-adapter parity.
4. Run fast implementation checks, then integration checks.

Focused command:

```bash
npm run test -- test/echoFixtureAdapter.spec.ts test/gitWarpAdapter.spec.ts test/scenarioFixture.spec.ts
```

Full verification command:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Optional-channel changes (effects, deliveries, posture flags) must be compatible with downstream consumer assumptions.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Deterministic head mismatch | wrong default head in logs or `session` output | session navigation starts at incorrect history point | verify adapter `hello` and head mapping for each adapter kind | `test/echoFixtureAdapter.spec.ts`, `test/gitWarpAdapter.spec.ts` |
| Out-of-range navigation | thrown adapter navigation error | frame stepping appears to fail or stutter | confirm frame boundary checks in adapter implementations | `test/echoFixtureAdapter.spec.ts` or scenario fixture tests |
| Scenario constructor fails | descriptor validation throws or returns malformed adapter | scenario targets cannot start | validate scenario keys and factories in tests | `test/scenarioFixture.spec.ts` |
| Optional method divergence | downstream tool reads missing capabilities unexpectedly | CLI/TUI show partial or empty capability surface | align optional outputs with protocol capability matrix | `test/effectEmission.spec.ts`, integration parity tests |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `adapter-port-and-registry`. |
| Used by | `debugger-session-core`, `cli-interface`, `mcp-interface`, `tui-shell`, `worldline-visualization`. |
| Cross-shelf impact | Method semantics changes can affect snapshots, pins, rendering, and delivery summaries. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-AD-1` through `R-AD-4`.
- Primary sources: `src/app/adapterRegistry.ts`, `src/adapters/*.ts`, `src/protocol.ts`.

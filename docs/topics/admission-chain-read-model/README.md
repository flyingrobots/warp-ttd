---
title: Admission Chain Read Model
topic: admission-chain-read-model
topics:
  - admission-chain
  - read-model
  - posture
  - mcp
  - session-inspection
date_created: 2026-06-20
status_last_reviewed: 2026-06-22
author: James <james@flyingrobots.dev>
code_owners:
  - James <james@flyingrobots.dev>
status: current
schema_version: "2.3"
risk_level: medium
change_impact: Deterministic admission-chain posture for inspection surfaces; low-risk runtime with high operational impact.
depends_on:
  - src/app/admissionChainReadModel.ts
  - src/app/liveTargetSessionInspection.ts
  - src/app/liveTargetInspection.ts
  - src/app/runtimeHelloInspection.ts
  - src/mcp/admissionChainSurface.ts
used_by:
  - mcp-interface
  - cli-interface
  - tui-shell
  - debugger-session-core
verification:
  - npm run docs:verify
  - npm run test
  - npm run test:integration
review_interval_days: 30
status_last_reviewed_by: James <james@flyingrobots.dev>
test_plan: test-plan.md
review_due: 2026-09-20
agent_entry_queries:
  - id: onboarding
    intent: Learn the deterministic admission-chain posture model and output contract.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Update read-model shaping or MCP/target-posture behavior.
    anchor: "#entry-edit"
  - id: triage
    intent: Resolve admission-chain and target posture failures from logs or tool output.
    anchor: "#entry-triage"
  - id: impact
    intent: Validate ripple effects across MCP, runtime hello, and target inspection.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf defines the admission-chain read model used by inspection surfaces. It translates raw target inspection and runtime hello state into posture-aware session summaries.

| Question | Answer |
|---|---|
| What this topic owns | deterministic transformation from raw chain/target signals into present/absent/obstructed posture summaries. |
| What it does not own | underlying target discovery protocols and transport-level scanner internals. |
| How it works | raw inspection and runtime hello signals are composed into posture-aware summaries for session-level readers. |
| Why this matters | posture controls whether workflows should proceed, defer, or show obstruction in readers and automation. |
| First prerequisite | understand `continuum-target-discovery` and `protocol-contract` outputs. |
| What changes propagate | posture transitions reshape what MCP, CLI, and UI readers report as admissible or blocked session operations. |

<a id="entry-edit"></a>
## Safe change path

1. Change shaping logic and fixtures together.
2. Update related MCP/CLI assertions from `R-ACR-1` through `R-ACR-4` in `test-plan.md`.
3. Keep posture fields explicit; avoid implicit success defaults.

Focused command:

```bash
npm run test -- test/mcpAdmissionChainSurface.spec.ts test/liveEchoFamilyIntake.spec.ts
```

Focused verification command: `npm run test -- test/mcpAdmissionChainSurface.spec.ts test/inspectorPage.spec.ts`

Full verification command:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Any posture reclassification changes behavior for users and automation consuming target admission and runtime hello outputs.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Target descriptor invalid | malformed descriptor or missing root path in logs | read-model returns obstruction rather than present chain | validate descriptor fields and path expectations | `test/liveEchoFamilyIntake.spec.ts` |
| Admission chain absent unexpectedly | chain summary not found or downgraded to absent | downstream sessions show reduced context or empty facts | verify upstream inspection and chain loader inputs | `test/mcpAdmissionChainSurface.spec.ts` |
| Runtime hello mismatch | protocol posture differs from chain summary | confusion in session tool output shape | cross-check `runtime-hello` generation and parity tests | `test/cliJson.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | admission-chain read-model modules and runtime hello inspection modules listed in frontmatter. |
| Used by | `mcp-interface`, `cli-interface`, `tui-shell`, `debugger-session-core`. |
| Cross-shelf impact | Posture shape changes change shell, MCP, and CLI behavior for target and chain inspection; runtime registry source-selection and runtime-discovery MCP additions can alter sibling target-inspection surfaces without changing admission-chain posture semantics. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-ACR-1` through `R-ACR-4`.
- Primary sources: `src/app/admissionChainReadModel.ts`, `src/app/liveTargetSessionInspection.ts`, `src/mcp/admissionChainSurface.ts`.
- The `warp_ttd.inspect_runtime_discovery` tool is registered beside admission-chain inspection in `src/mcp/admissionChainSurface.ts`; its parity tests exercise MCP transport registration while leaving `R-ACR-1` through `R-ACR-4` unchanged.

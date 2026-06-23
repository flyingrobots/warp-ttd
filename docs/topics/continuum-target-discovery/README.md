---
title: Continuum Target Discovery
topic: continuum-target-discovery
topics:
  - continuum
  - target-discovery
  - discovery-interfaces
  - runtime-hello
  - target-posture
  - mcp
  - cli
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
author: "James <james@flyingrobots.dev>"
code_owners:
  - "James <james@flyingrobots.dev>"
status: current
schema_version: "2.1"
risk_level: medium
change_impact: "Contract-sensitive; changes can alter CLI/MCP posture fields that downstream automation depends on."
depends_on:
  - adapter-port-and-registry
  - adapter-implementations
  - protocol-contract
  - docs/topics/continuum-target-discovery/test-plan.md
used_by:
  - cli-interface
  - mcp-interface
  - debugger-session-core
verification:
  - npm run docs:check
  - npm run docs:evidence
  - npm run docs:impact
  - npm run test
  - npm run test:integration
  - npx tsc --noEmit
review_interval_days: 60
review_due: 2026-08-21
test_plan: test-plan.md
agent_entry_queries:
  - id: onboarding
    intent: Build a fresh understanding of how target discovery surfaces, posture, and failures are wired.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Add a new target posture mode and keep CLI/MCP/inspection output shapes consistent.
    anchor: "#entry-edit"
  - id: triage
    intent: Diagnose target posture regressions by matching mode transitions to outputs.
    anchor: "#entry-triage"
  - id: impact
    intent: Trace how changes in adapter posture map into target-session and runtime hello readers.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns live target discovery and posture signaling used by CLI and MCP readers.

| Question | Answer |
|---|---|
| What this topic owns | deterministic target enumeration, runtime hello posture, and normalized session/posture outputs. |
| What it does not own | discovery transport internals that do not alter contract-exposed outputs. |
| How it works | discovery inputs and protocol envelopes are normalized into posture-aware targets before surface consumers consume them. |
| Why this matters | posture and target enumeration drive what users and automation can operate on next. |
| First prerequisite | understand protocol envelope and adapter resolution behavior. |
| What changes propagate | discovery and posture updates are routed into session, CLI, and MCP outputs before tools and inspectors act. |

<a id="entry-edit"></a>
## Safe change path

1. Update request/descriptor handling and test required rows (`R-CTD-*`) together.
2. Preserve deterministic ordering and machine-parseable posture fields.
3. Run targeted discovery tests, then integration checks.

Focused command:

```bash
npm run test -- test/adapterRegistry.integration.spec.ts test/ontologyDoctrine.spec.ts
```

Focused verification command: `npm run test -- test/cliJson.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Runtime hello and target-session posture changes alter automation and UI decision logic.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Target descriptor malformed | parser reports missing required discovery fields | posture returns obstructed or absent | validate descriptor ingestion and source filters | `test/adapterRegistry.integration.spec.ts` |
| Runtime hello mismatch | changed status between equivalent targets | inconsistent runtime posture in CLI and MCP | compare outputs across discovery and runtime hello paths | `test/cliJson.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` |
| Enumeration nondeterministic | unstable order in target listings | flaky automation or diff noise | verify sorting and stable input normalization | `test/ontologyDoctrine.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `adapter-port-and-registry`, `adapter-implementations`, `protocol-contract`. |
| Used by | `cli-interface`, `mcp-interface`, `debugger-session-core`. |
| Cross-shelf impact | Posture updates can change user-visible target workflows and session bootstrap assumptions. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-CTD-1` through `R-CTD-4`.
- Primary sources: `src/app/runtimeHelloInspection.ts`, `src/app/liveTargetInspection.ts`, `src/app/liveTargetSessionInspection.ts`.

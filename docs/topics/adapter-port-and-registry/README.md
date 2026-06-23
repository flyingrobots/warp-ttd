---
title: Adapter Port and Registry
topic: adapter-port-and-registry
topics:
  - adapter
  - registry
  - host-binding
  - connect-workflow
  - capability-boundary
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
author: "James <james@flyingrobots.dev>"
code_owners:
  - "James <james@flyingrobots.dev>"
status: current
schema_version: "2.1"
risk_level: medium
change_impact: "Compatibility-sensitive boundary where adapter kinds and config inputs choose runtime implementations."
depends_on:
  - protocol-contract
  - src/protocol.ts
used_by:
  - tui-shell
  - cli-interface
  - mcp-interface
  - continuum-target-discovery
verification:
  - npm run test
  - npm run test:integration
  - npx tsc --noEmit
  - npm run lint
  - npm run lint:check
review_interval_days: 60
test_plan: test-plan.md
review_due: 2026-10-20
author_contact: "James <james@flyingrobots.dev>"
agent_entry_queries:
  - id: onboarding
    intent: Learn contract intent and core data model for adapter selection.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Add or change adapter kinds/config and validate tests.
    anchor: "#entry-edit"
  - id: triage
    intent: Triage adapter resolution failures from UI/session callers.
    anchor: "#entry-triage"
  - id: impact
    intent: Validate cross-shelf implications of adapter boundary edits.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns adapter selection. It maps an `AdapterConfig` to a concrete adapter plus default head before session bootstrap can proceed.

| Question | Answer |
|---|---|
| What this topic owns | config-driven adapter resolution, failure signaling for unsupported kinds, and bootstrap tuple creation. |
| What it does not own | internal adapter-specific implementations, protocol schema definition, and UI rendering details. |
| How it works | adapter config is resolved to one adapter branch and default head that downstream session and dispatch code consumes deterministically. |
| Why this matters | wrong adapter resolution changes all downstream contract behavior, including transport and discovery posture. |
| First prerequisite | understand `protocol-contract` shapes before changing adapter branching logic. |
| What changes propagate | adapter-kind changes flow into session bootstrap and downstream dispatch behavior through `resolveAdapter`. |

<a id="entry-edit"></a>
## Safe change path

1. Pick impacted requirements from `test-plan.md` (`R-AR-1` through `R-AR-4`).
2. Edit adapter-kind branching first, then tests, then docs.
3. Keep constructor and fallback behavior in one resolver switch so every supported kind has one return path.
4. Verify with focused tests before broader suites.

Focused command:

```bash
npm run test -- test/adapterRegistry.spec.ts
```

Focused verification command (fast): `npm run test -- test/adapterRegistry.spec.ts`

Full verification command before merge:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Introducing a new adapter kind or changing `defaultHeadId` can change downstream command output, shell behavior, and discovery posture.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Unknown adapter kind | `UnknownAdapterKindError` or typed rejection in startup path | Caller fails to connect and receives error posture | confirm config payload and branch list in `resolveAdapter` and tests | `test/adapterRegistry.spec.ts` and regression with malformed kind input |
| Scenario key missing | Resolver cannot find scenario factory | Inspection path switches from throw to explicit obstruction or error branch | validate scenario key source and descriptor ingestion contract | `test/adapterRegistry.spec.ts` with invalid scenario input |
| Git-warp descriptor incomplete | Inspection path returns `OBSTRUCTED` posture for target-open flows | Live target command sees non-ready sessions | confirm descriptor validation and defensive checks are preserved | `test/adapterRegistry.integration.spec.ts` and live target posture fixtures |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `src/protocol.ts`. |
| Used by | `tui-shell`, `cli-interface`, `mcp-interface`, `continuum-target-discovery`. |
| Cross-shelf impact | Changing branch defaults or error shape can alter session bootstrap in shell, CLI, and discovery readers. |

## Evidence

- Normative claims are mapped in `test-plan.md` rows `R-AR-1` through `R-AR-4`.
- Primary sources: `src/app/adapterRegistry.ts`, `src/adapter.ts`, `src/errors.ts`.
- Coverage anchor: `docs/topics/adapter-port-and-registry/test-plan.md`.

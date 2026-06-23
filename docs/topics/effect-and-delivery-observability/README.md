---
title: Effect and Delivery Observability
topic: effect-and-delivery-observability
date_created: 2026-06-22
status: current
risk_level: medium
depends_on:
  - shared-family-facts
  - debugger-session-core
used_by: []
verification:
  - npm run test
  - npm run test:integration
  - npx tsc --noEmit
  - npm run lint
  - npm run lint:check
test_plan: test-plan.md
---

<a id="entry-onboarding"></a>
## At a glance

This shelf captures effect and delivery observability contracts in session summaries.

| Question | Answer |
|---|---|
| What this topic owns | deterministic extraction and publication of effect emission and delivery summary records. |
| What it does not own | adapter-specific extraction internals not covered by session contracts. |
| How it works | observed session/family inputs are transformed into ordered delivery metadata for downstream consumers. |
| Why this matters | observability output is the primary signal for diagnosing runtime effect and delivery behavior. |
| First prerequisite | understand session snapshot shape and family fact precedence. |
| What changes propagate | emission changes here alter what operators and downstream scripts infer about delivery state and ordering. |

<a id="entry-edit"></a>
## Safe change path

1. Map observable field behavior to requirement IDs in `test-plan.md`.
2. Update extractor + session-facing tests together.
3. Validate deterministic behavior for supported frames and capabilities.

Focused command:

```bash
npm run test -- test/effectEmission.spec.ts
```

Focused verification command: `npm run test -- test/gitWarpAdapter.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Changing emission ordering or summary fields affects CLI and adapter parity outputs.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Missing effect emission | expected effects are empty with present inputs | incomplete observability summaries | verify frame-to-effect mapping for adapter and fixture types | `test/effectEmission.spec.ts` |
| Capability path absent | effect channel unavailable but consumed as present | consumer receives parse mismatch or degraded output | confirm capability checks before reading optional channels | `test/effectEmission.spec.ts` |
| Frame mapping drift | same input yields different emission ordering | flaky output snapshots | assert stable ordering with fixture clocks/IDs | `test/gitWarpAdapter.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `shared-family-facts`, `debugger-session-core`. |
| Used by | No direct direct dependents currently; consumed by UI and CLI sessions through snapshot contracts. |
| Cross-shelf impact | Changes alter observability signal quality in diagnostics and output logs. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-EDO-1` through `R-EDO-4`.
- Primary sources: `src/adapters/gitWarpEffectEmissionExtractor.ts`, `src/adapters/scenarioFixtureAdapter.ts`, `src/app/debuggerSession.ts`.

---
title: Shared-Family Facts
topic: shared-family-facts
date_created: 2026-06-22
status: current
risk_level: high
depends_on:
  - neighborhood-state-models
used_by:
  - effect-and-delivery-observability
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

This shelf defines family fact ingestion and preference rules when host and generated facts are combined into session snapshots.

| Question | Answer |
|---|---|
| What this topic owns | provenance metadata, family-fact posture handling, and fallback behavior. |
| What it does not own | source adapter fact generation and worldline rendering. |
| How it works | host and generated facts are ingested, scored, and combined into session snapshot posture. |
| Why this matters | precedence decisions determine trust in host vs generated evidence for diagnostics and UI reads. |
| First prerequisite | `neighborhood-state-models` and session snapshot ownership. |
| What changes propagate | precedence and fallback behavior here directly affects session contracts read by diagnostics and observers. |

<a id="entry-edit"></a>
## Safe change path

1. Update provenance and ingestion logic with matching tests in `test-plan.md`.
2. Keep fallback and malformed-input behavior explicit and tested.
3. Run family fact and session parity tests together.

Focused command:

```bash
npm run test -- test/generatedFamilyIngress.spec.ts test/liveEchoFamilyIntake.spec.ts
```

Focused verification command: `npm run test -- test/liveEchoAdapterProbe.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Changing precedence or posture handling affects inspection output and user trust in host data.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Malformed family fact | malformed wrapper or missing source metadata | family facts dropped or coerced incorrectly | validate parser and posture normalization branches | `test/generatedFamilyIngress.spec.ts` |
| Host-vs-local conflict | local fallback used when host data should win | missing authoritative signal in session output | verify precedence rules and generated fact path | `test/liveEchoFamilyIntake.spec.ts` |
| Obstruction not surfaced | absent posture becomes silent omission | degraded diagnostics without explicit explanation | ensure posture markers remain machine-readable | `test/liveEchoAdapterProbe.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `neighborhood-state-models`. |
| Used by | `effect-and-delivery-observability`. |
| Cross-shelf impact | Family fact changes influence session evidence and observability outputs. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-SF-1` through `R-SF-4`.
- Primary sources: `src/app/generatedFamilyIngress.ts`, `src/app/sessionFamilyFacts.ts`, `src/app/sharedFamilyHydration.ts`.

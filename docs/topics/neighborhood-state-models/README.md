---
title: Neighborhood State Models
topic: neighborhood-state-models
date_created: 2026-06-22
status_last_reviewed: 2026-06-22
risk_level: medium
depends_on:
  - debugger-session-core
used_by:
  - shared-family-facts
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

This shelf defines neighborhood summary derivations used by inspector and worldline-facing workflows.

| Question | Answer |
|---|---|
| What this topic owns | core summary models for sites, focus, receipts, reintegration details, and stable identifiers. |
| What it does not own | adapter-specific receipt production and UI rendering. |
| How it works | inspection and frame inputs are projected into stable neighborhood summaries consumed by downstream views. |
| Why this matters | summary shape determines what operators can trust in inspector/worldline workflows. |
| First prerequisite | understand `debugger-session-core` state flow. |
| What changes propagate | summary updates here flow into worldline and inspector projection behavior before rendering. |

<a id="entry-edit"></a>
## Safe change path

1. Update summary model contracts and fixtures in the same change set.
2. Keep requirement IDs in `test-plan.md` synchronized with any new fields or invariants.
3. Run focused neighborhood summary tests, then integration suites.

Focused command:

```bash
npm run test -- test/neighborhoodCoreSummary.spec.ts test/neighborhoodFocusSummary.spec.ts
```

Focused verification command: `npm run test -- test/neighborhoodSiteCatalog.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Renaming fields or identity behavior breaks inspector and dependent snapshots.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Stale IDs in summaries | mismatched focus or catalog IDs after navigation | incorrect inspector context | validate identity regeneration on frame transitions | `test/neighborhoodCoreSummary.spec.ts`, `test/inspectorPage.spec.ts` |
| Reintegration projection drift | missing or reordered reintegration details | wrong evidence precedence in UI | compare summary and input fact ordering | `test/debuggerSession.spec.ts` |
| Site catalog inconsistency | lane/site pairing mismatch after moves | unstable worldline focus and render mismatch | re-run focus rebuild logic and add regression fixture | `test/neighborhoodSiteCatalog.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `debugger-session-core`. |
| Used by | `shared-family-facts`. |
| Cross-shelf impact | Summary behavior influences family facts, worldline focus, and inspector readability. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-NSM-1` through `R-NSM-4`.
- Primary sources: `src/app/NeighborhoodCoreSummary.ts`, `src/app/NeighborhoodSiteCatalog.ts`, `src/app/neighborhoodAssembler.ts`.

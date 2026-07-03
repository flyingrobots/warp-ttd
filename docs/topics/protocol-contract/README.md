---
title: Protocol Contract
topic: protocol-contract
topics:
  - protocol
  - contract
  - schema
  - migration
  - generated-artifacts
  - parity
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
review_interval_days: 90
review_due: 2026-09-20
author: WARP TTD Team
status: stable
schema_version: 0.7.0
risk_level: high
change_impact: compatibility-sensitive
code_owners:
  - James <james@flyingrobots.dev>
audience: uninitiated-readers
depends_on:
  - schemas/warp-ttd-protocol.graphql
  - src/protocol.ts
used_by:
  - adapter-port-and-registry
  - debugger-session-core
  - shared-family-facts
  - cli-interface
  - mcp-interface
  - tui-shell
  - worldline-visualization
  - continuum-target-discovery
owns:
  - AGENTS.md
  - scripts/docs-verify.mjs
  - scripts/hooks/pre-push
related_shelves:
  - adapter-port-and-registry
  - debugger-session-core
  - shared-family-facts
  - cli-interface
  - mcp-interface
  - worldline-visualization
  - continuum-target-discovery
  - tui-shell
test_plan: test-plan.md
verification:
  commands:
    - cargo xtask verify
    - npm run test
    - npm run test:integration
    - npx tsc --noEmit
    - npm run lint
    - npm run lint:check
  last_run: 2026-06-22
  notes: Protocol docs metadata example; update with successful run timestamp after verification.
---

<a id="entry-onboarding"></a>
## At a glance

This shelf is the canonical protocol contract foundation for all emitted session shapes and generated type artifacts.

| Question | Answer |
|---|---|
| What this topic owns | GraphQL schema truth, generated protocol mirror consistency, and migration-safe shape evolution. |
| What it does not own | all consumer implementations that interpret these shapes. |
| How it works | schema edits drive generated artifacts, which in turn drive all session/contract emitters and readers. |
| Why this matters | schema and type contracts are the compatibility boundary for all agent and human surfaces. |
| First prerequisite | `schemas/warp-ttd-protocol.graphql` and `src/protocol.ts` before protocol edits. |
| What changes propagate | schema and generated type changes route into every emitter, reader, and artifact consumer through generated contracts. |

<a id="entry-edit"></a>
## Safe change path

1. Edit schema and generated mirror together or include a coordinated generation step.
2. Update requirement rows and tests in `test-plan.md`.
3. Confirm migration posture and compatibility rules before merge.

Focused command:

```bash
npm run test -- test/protocolContract.spec.ts test/protocolPublicationBoundary.spec.ts
```

Focused verification command: `npm run test -- test/wesleyGeneratedProtocol.spec.ts`

Full verification:

```bash
cargo xtask verify || (npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check)
```

High-risk compatibility boundary:
- New protocol fields require careful compatibility flags, migration docs, and parity checks.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Schema and mirror drift | artifact generation test fails | incompatible runtime or compile-time mismatch | regenerate artifacts and rerun parity checks | `test/wesleyGeneratedProtocol.spec.ts` |
| Contract field changed without migration | compatibility test failures or missing fallback | runtime consumers break on unknown fields | classify as backward/forward compatible and adjust tests | `test/protocolPublicationBoundary.spec.ts`, `test/protocolContract.spec.ts` |
| Documentation mismatch | tests pass but glossary and docs disagree | operator confusion and stale review burden | sync docs and requirement claims before merge | `test/ontologyDoctrine.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `schemas/warp-ttd-protocol.graphql`, `src/protocol.ts`. |
| Used by | Most major shelves including adapters, sessions, interfaces, and discovery. |
| Cross-shelf impact | All contract consumers must be updated whenever protocol shape changes. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-PC-1` through `R-PC-4`.
- Primary sources: `schemas/warp-ttd-protocol.graphql`, `src/protocol.ts`, `src/generated/warp-ttd-protocol.wesley.generated.ts`.

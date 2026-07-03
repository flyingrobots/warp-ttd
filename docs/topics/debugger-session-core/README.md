---
title: WARP TTD Debugger Session Core
topic: debugger-session-core
topics:
  - session
  - snapshot
  - navigation
  - pinning
  - serialization
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
author: WARP TTD Team
code_owners:
  - James <james@flyingrobots.dev>
status: stable
schema_version: 0.1.0
risk_level: high
change_impact: session-cached state and navigation behavior affects CLI/MCP/TUI correctness
depends_on:
  - protocol-contract
  - adapter-port-and-registry
  - shared-family-facts
used_by:
  - cli-interface
  - mcp-interface
  - tui-shell
  - worldline-visualization
verification:
  commands:
    - npm run test
    - npm run test:integration
    - npx tsc --noEmit
    - npm run lint
    - npm run lint:check
  last_run: 2026-06-22
  notes: Use the session-focused suites when behavior in this shelf changes, then update this timestamp.
review_interval_days: 90
review_due: 2026-09-20
test_plan: test-plan.md
---

<a id="entry-onboarding"></a>
## At a glance

This shelf defines session assembly and snapshot state transitions used by all runtime consumers.

| Question | Answer |
|---|---|
| What this topic owns | session creation, navigation, capability gating, pin behavior, and deterministic serialization. |
| What it does not own | adapter implementation details and protocol field definitions. |
| How it works | session input and command transitions assemble deterministic snapshot state that all readers consume. |
| Why this matters | every runtime consumer depends on coherent session state to keep behavior and diagnostics aligned. |
| First prerequisite | `protocol-contract` and `adapter-port-and-registry`. |
| What changes propagate | session transitions here directly drive snapshot semantics seen by CLI, MCP, and TUI flows. |

<a id="entry-edit"></a>
## Safe change path

1. Map the change to `R-DS-*` requirements in `test-plan.md`.
2. Update session assembly logic and related tests in the same sequence.
3. Run focused session suites, then integration and shared consumer checks.

Focused command:

```bash
npm run test -- test/debuggerSession.spec.ts
```

Focused verification command: `npm run test -- test/sessionSync.spec.ts test/debuggerSession.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Changes to snapshot semantics influence CLI, TUI, MCP, and worldline consumers simultaneously.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Session bootstrap fails | session creation throws or emits empty snapshot | cannot open target/session in readers | validate adapter tuple and protocol hello preconditions | `test/debuggerSession.spec.ts` |
| Capability gating drift | command surface appears when capability should be absent | unsafe behavior exposure or missing features | compare required capability tables against protocol tests | `test/debuggerSession.spec.ts` |
| Pin lifecycle drift | pin add/remove mismatch across navigation | incorrect pin state, lost observability evidence | trace pin ops in focused session tests | `test/debuggerSession.spec.ts` |
| Serialization instability | JSON differs across identical runs | flaky snapshots and downstream parser failures | verify deterministic snapshot export fields | `test/debuggerSession.spec.ts`, `test/cliJson.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `adapter-port-and-registry`, `shared-family-facts`. |
| Used by | `cli-interface`, `mcp-interface`, `tui-shell`, `worldline-visualization`. |
| Cross-shelf impact | Session contract changes ripple into all interface and rendering layers. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-DS-1` through `R-DS-5`.
- Primary sources: `src/app/debuggerSession.ts`, `src/app/sessionSync.ts`, `src/protocol.ts`.

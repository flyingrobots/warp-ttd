---
title: Worldline Visualization
topic: worldline-visualization
topics:
  - worldline
  - lane-visualization
  - split-view
  - neighborhood-focus
  - command-shell
  - tui-page
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
author: James <james@flyingrobots.dev>
code_owners:
  - James <james@flyingrobots.dev>
status: current
schema_version: 1.1.0
risk_level: medium
change_impact: Visualization-only shelf with high diagnostic value for operator triage and onboarding.
depends_on:
  - protocol-contract
  - debugger-session-core
  - neighborhood-state-models
  - tui-shell
used_by:
  - cli-interface
  - tui-shell
  - tui-pages
verification:
  - npm run test -- test/worldlineLayout.spec.ts test/worldlineSplitView.spec.ts
  - npm run test
  - npm run test:integration
  - npx tsc --noEmit
  - npm run lint
  - npm run lint:check
review_interval_days: 60
test_plan: test-plan.md
review_due: 2026-10-20
agent_entry_queries:
  - id: onboarding
    intent: Learn how worldline data is derived and rendered in TUI and CLI.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Update lifecycle, focus, or rendering behavior in worldline projection.
    anchor: "#entry-edit"
  - id: triage
    intent: Diagnose worldline rendering or navigation failures.
    anchor: "#entry-triage"
  - id: impact
    intent: Estimate downstream impact on TUI and CLI users.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns worldline projection and lane rendering behavior in the TUI.

| Question | Answer |
|---|---|
| What this topic owns | stable row/lane layout, split and narrow view transitions, and projection from snapshots. |
| What it does not own | discovery and protocol transport semantics. |
| How it works | snapshot and focus state are mapped into lane/row projections for the TUI. |
| Why this matters | navigation and inspection are grounded in this projection, so layout regressions obscure runtime truth. |
| First prerequisite | `debugger-session-core` and neighborhood summary behavior. |
| What changes propagate | layout and route changes here alter what operators can infer during runtime navigation and inspection. |

<a id="entry-edit"></a>
## Safe change path

1. Update projection/layout logic and corresponding fixtures together.
2. Validate requirement rows in `test-plan.md` and maintain deterministic outputs.
3. Execute focused worldline tests, then integration checks.

Focused command:

```bash
npm run test -- test/worldlineLayout.spec.ts test/worldlineSplitView.spec.ts
```

Focused verification command: `npm run test -- test/worldlineRender.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Changes to lane ordering or frame mapping can break inspection navigation and human triage.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Missing lanes/frames | render output has empties for known inputs | users cannot trace worldline flow | verify frame/lane projection from session snapshots | `test/worldlineRender.spec.ts` |
| Split view transition bug | inconsistent rendering after width change | layout degrades after terminal resize | validate branch conditions for split mode | `test/worldlineSplitView.spec.ts` |
| Identity mismatch | lane/writer IDs reorder unexpectedly | confusing or wrong row-to-lane mapping | compare deterministic sorting and identity mapping | `test/worldlineLayout.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `debugger-session-core`, `neighborhood-state-models`, `tui-shell`. |
| Used by | `cli-interface`, `tui-shell`, internal TUI page consumers. |
| Cross-shelf impact | Rendering changes may alter support workflows in CLI/worldline-facing outputs. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-WV-1` through `R-WV-4`.
- Primary sources: `src/tui/pages/worldlinePage.ts`, `src/app/worldlineRenderer.ts`, `src/app/neighborhoodAssembler.ts`.

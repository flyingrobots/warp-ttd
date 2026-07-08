---
title: Roadmap Governance
topic: roadmap-governance
topics:
  - roadmap
  - github issues
  - dependency graph
  - pull request readiness
targets:
  - ROADMAP.md
  - roadmap DAG generation
  - GitHub issue dependency sync
  - pre-pull-request governance
status_last_reviewed: 2026-07-08
date_created: 2026-07-08
date_last_updated: 2026-07-08
author: James <james@flyingrobots.dev>
code_owners:
  - James <james@flyingrobots.dev>
status: current
schema_version: 1.0.1
risk_level: medium
change_impact: "Roadmap ownership, generated DAG artifacts, and PR readiness checks shape how work is planned and published."
depends_on: []
used_by:
  - agents
  - pull request reviewers
verification:
  commands:
    - npm run roadmap:check
    - npm run docs:check
    - npm run docs:evidence
    - npm run docs:impact
  last_run: 2026-07-08
  notes: "Use Node 22 through mise when local Node versions cannot install native dependencies."
test_plan: test-plan.md
agent_entry_queries:
  - id: onboarding
    intent: Understand the roadmap source of truth, generated DAG, and issue hierarchy.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Change roadmap issues, generated artifacts, or PR readiness rules safely.
    anchor: "#entry-edit"
  - id: triage
    intent: Diagnose stale ROADMAP artifacts, issue graph drift, or pre-push gate failures.
    anchor: "#entry-triage"
  - id: impact
    intent: Review downstream planning and publication impact for roadmap governance changes.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns the project roadmap governance loop: this repository's GitHub Issues are authoritative, `ROADMAP.md` is the human-readable projection, and the Graphviz DAG is the generated dependency view embedded in the roadmap.

| Question | Answer |
|---|---|
| What this topic owns | Roadmap artifact generation, roadmap issue/DAG sync commands, PR readiness instructions in `AGENTS.md`, and the policy that software tests assert executable behavior rather than Markdown prose. |
| What it does not own | Runtime protocol schema semantics, adapter behavior, UI behavior, release packaging, or private external-repository blocker state. |
| How it works | `scripts/roadmap-dag.mjs` reads GitHub issue metadata, renders grouped Graphviz output, includes native blocker edges for emitted goalposts and child slices, and checks that committed roadmap artifacts match issue state. |
| Why this matters | Planning drift changes which work appears blocked, ready, or complete; stale artifacts can send agents and reviewers toward the wrong next slice. |
| First prerequisite | Repository-local GitHub issue state and native issue relationships must be synchronized before regenerating roadmap artifacts. |
| What changes propagate | Roadmap script, workflow, and AGENTS edits alter PR readiness and planning governance for every future slice. |

<a id="entry-edit"></a>
## Safe change path

1. Update GitHub Issues first when changing milestone, goalpost, slice, or blocker state.
2. Run the roadmap generator or sync command so `ROADMAP.md`, `docs/roadmap-dag.dot`, and `docs/roadmap-dag.svg` reflect issue state.
3. Update `AGENTS.md` when the pre-PR operating rule changes.
4. Keep tests focused on executable behavior and generated artifact consistency; do not add tests that only inspect Markdown prose.
5. Run the focused checks:

```bash
npm run roadmap:check
npm run docs:check
npm run docs:evidence
npm run docs:impact
```

6. For runtime or package-script changes, also run the repository verification gate from `AGENTS.md`.

High-risk compatibility boundary:
- The repository-local GitHub issue graph is authoritative. Do not hand-edit generated DAG artifacts as the source of truth, and mirror any external blocker as a repository issue before treating it as a roadmap gate.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| ROADMAP artifacts drift from issues | `npm run roadmap:check` fails | PR presents stale milestone, goalpost, slice, or blocker state | Regenerate from GitHub Issues and review the diff | `npm run roadmap:check` |
| Issue dependency graph is stale | Generated DAG has missing or wrong blocked-by edges | Next work may be sequenced incorrectly | Re-run sync and inspect GitHub native blocker/sub-issue relationships | `npm run roadmap:sync -- --check` |
| Child slice blocker edges are invisible | A child issue is blocked in GitHub but the DOT/SVG omits the edge | Goalpost execution order is only visible in GitHub, not the roadmap DAG | Regenerate artifacts and inspect child issue blocked-by relationships | `npm run roadmap:check` |
| Changed roadmap files are unmapped | `npm run docs:impact` reports `DOCL-IMPACT-OWNERSHIP-GAP` | Pre-push hook blocks publication | Add or correct `owns` entries in this shelf | `npm run docs:impact` |
| Markdown-only tests return | `npm run test` contains assertions over documentation prose | Test suite can fail on wording instead of software behavior | Remove the prose assertion and keep behavior or artifact checks | `npm run test` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | Repository-local GitHub Issues, GitHub native blocked-by/sub-issue relationships, Graphviz, and Node-based roadmap tooling. |
| Used by | Agents, PR authors, reviewers, CI, and roadmap readers. |
| Cross-shelf impact | Governance changes may alter PR readiness, issue sequencing, and which slices are considered blocked or open, but they do not change runtime protocol behavior by themselves. |

## Evidence

- Requirement rows `R-RMAP-1` through `R-RMAP-5` in `test-plan.md` define the governance contract.
- Primary sources: `scripts/roadmap-dag.mjs`, `.github/workflows/roadmap.yml`, `AGENTS.md`, `ROADMAP.md`, and `package.json`.
- Status-only ROADMAP/DAG projection changes, such as checking off completed child slices from GitHub issue state including #147, are covered by `R-RMAP-1` and `R-RMAP-5`; they do not introduce new roadmap governance behavior.
- The retained protocol-boundary tests in `test/protocolPublicationBoundary.spec.ts` are behavior checks for generated protocol mirrors; Markdown/prose-examination tests are outside this shelf's accepted test model.

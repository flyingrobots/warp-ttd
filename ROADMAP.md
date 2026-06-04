# ROADMAP

WARP TTD keeps live work in GitHub Issues and milestones. This file is a
stable orientation index: it names the long-term product ladder, points to the
canonical sources, and records rough slice estimates. If this file disagrees
with a live issue, milestone, merged changelog entry, or passing witness, the
live tracker and shipped evidence win.

## Canonical Sources

| Question | Source | Rule |
| --- | --- | --- |
| What are we building? | [VISION.md](./VISION.md) | Long-term product north star. |
| What is the current bearing? | [docs/BEARING.md](./docs/BEARING.md) | Active direction, tensions, and next slice queue. |
| What has shipped? | [CHANGELOG.md](./CHANGELOG.md) | Historical truth of merged behavior. |
| What must operators and agents know? | [MANUAL.md](./MANUAL.md) | Durable operator, maintainer, and agent-facing doctrine. |
| What is live work? | [GitHub Issues](https://github.com/flyingrobots/warp-ttd/issues) | Live tracker, labels, ownership, and status. |
| What gates v0.1.0? | [Issue #74](https://github.com/flyingrobots/warp-ttd/issues/74) | Release gate checklist and closeout tracker. |
| How do cycles move? | [METHOD.md](./METHOD.md) | Cycle workflow, design/proof rules, and tracker doctrine. |

## North Star

WARP TTD is becoming an agent-native Continuum causal debugger. It should
connect to any Continuum-compatible runtime, inspect causal and replay facts
through structured CLI, MCP, protocol, and read-model surfaces, and let agents
and humans ask why, why-not, breakpoint, replay, and counterfactual questions
without screen scraping or host-specific debugger concepts.

The core difference from a conventional debugger is that WARP TTD treats replay
basis, causal evidence, counterfactuals, witnesses, readings, authority posture,
and host mutation boundaries as first-class facts. A human workspace can render
those facts, but it must not be the only place debugger truth exists.

## Current Product Goalposts

These are planning estimates for review-sized Method cycles. Each issue's
design doc owns the final slice plan before implementation starts.

| Order | Goalpost | Tracker | Status | Estimated slices | Primary proof |
| --- | --- | --- | --- | --- | --- |
| 1 | Continuum target discovery contract | [#76](https://github.com/flyingrobots/warp-ttd/issues/76) | Landed | Shipped | `npm run targets -- --json`, `npm run target-session -- --json` |
| 2 | Vendor-neutral runtime hello | [#80](https://github.com/flyingrobots/warp-ttd/issues/80) | Landed | Shipped | `npm run runtime-hello -- --json`, MCP `warp_ttd.inspect_runtime_hello` |
| 3 | Continuum runtime discovery and local registry | [#78](https://github.com/flyingrobots/warp-ttd/issues/78) | Next | 4-5 | Deterministic registry fixtures, CLI JSON, MCP read model |
| 4 | Runtime endpoint consent and auth posture | [#79](https://github.com/flyingrobots/warp-ttd/issues/79) | Queued | 4-6 | Redacted endpoint policy tests, CLI/MCP posture output |
| 5 | Debugger capability discovery read model | [#82](https://github.com/flyingrobots/warp-ttd/issues/82) | Queued | 3-5 | Capability matrix API, CLI JSON, MCP read model |
| 6 | Causal query and breakpoint contract | [#83](https://github.com/flyingrobots/warp-ttd/issues/83) | Queued | 5-8 | Query schema tests, breakpoint hit fixtures, lower-mode output |
| 7 | Counterfactual branch workbench and worldline comparison | [#84](https://github.com/flyingrobots/warp-ttd/issues/84) | Queued | 6-10 | Branch model tests, comparison witnesses, exportable diff facts |
| 8 | Evidence ledger and investigation report export | [#85](https://github.com/flyingrobots/warp-ttd/issues/85) | Queued | 4-7 | Markdown plus JSON evidence bundle snapshots and redaction tests |
| 9 | Human causal debugger workspace over agent-readable facts | [#86](https://github.com/flyingrobots/warp-ttd/issues/86) | Queued | 6-10 | TUI/rendered workspace over the same structured facts, accessibility tests |

## v0.1.0 Closeout Goalposts

The release goalposts live in [#74](https://github.com/flyingrobots/warp-ttd/issues/74).
The counts below estimate cleanup effort remaining after the recent Method,
target discovery, causal-debugger design, and runtime-hello work landed.

| Goalpost | Tracker | Estimated slices | Notes |
| --- | --- | --- | --- |
| Tracker and reality sync | [#74](https://github.com/flyingrobots/warp-ttd/issues/74) | 1-2 | Keep milestone labels, issue state, PR state, and `docs/BEARING.md` aligned. |
| Legacy backlog retirement | [#72](https://github.com/flyingrobots/warp-ttd/issues/72) | 3-5 | Replace filesystem backlog as live tracker while preserving historical context. |
| Method checker hardening | [#88](https://github.com/flyingrobots/warp-ttd/issues/88) | 2-4 | Make shallow design sections fail automated checks. |
| Work-in-progress label audit | [#90](https://github.com/flyingrobots/warp-ttd/issues/90) | 1-2 | Detect stale active-work labels on closed or inactive issues. |
| GitHub comment workflow hardening | [#89](https://github.com/flyingrobots/warp-ttd/issues/89) | 1-3 | Replace fragile shell-quoted PR comments with file-backed or API-safe posting. |
| Agent interface cookbook | [#91](https://github.com/flyingrobots/warp-ttd/issues/91) | 2-3 | Document agent workflows once the next structured surfaces are stable enough to teach. |
| Capability simulator fixtures | [#92](https://github.com/flyingrobots/warp-ttd/issues/92) | 2-4 | Provide deterministic fixtures for capability discovery and unsupported/obstructed cases. |
| Release validation and notes | [#74](https://github.com/flyingrobots/warp-ttd/issues/74) | 2-3 | Run release validation, update notes, decide tag/version posture from clean `main`. |

## Reading Order

1. Read [VISION.md](./VISION.md) for the mission.
1. Read this roadmap for the product ladder and rough estimates.
1. Read [docs/BEARING.md](./docs/BEARING.md) for the current queue.
1. Inspect the linked GitHub issues and milestone for live status.
1. Use [MANUAL.md](./MANUAL.md) and [CHANGELOG.md](./CHANGELOG.md) to verify
   durable doctrine and shipped behavior.

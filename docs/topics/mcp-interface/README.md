---
title: MCP Interface
topic: mcp-interface
topics:
  - mcp
  - read-only-tools
  - tool-registry
  - inspection-contract
  - transport
date_created: 2026-06-22
date_last_updated: 2026-06-22
status_last_reviewed: 2026-06-22
review_interval_days: 30
review_due: 2026-09-20
author: James <james@flyingrobots.dev>
code_owners:
  - James <james@flyingrobots.dev>
status: current
schema_version: 1.0.0
risk_level: medium
change_impact: "Behavioral contract for read-only inspection tools; output changes affect adapters, discovery, and automation consumers."
depends_on:
  - protocol-contract
  - debugger-session-core
  - shared-family-facts
  - continuum-target-discovery
used_by:
  - cli-interface
  - tui-shell
  - worldline-visualization
  - admission-chain-read-model
verification:
  commands:
    - npm run test -- test/mcpAdmissionChainSurface.spec.ts
    - npm run docs:verify
    - npm run lint
    - npm run lint:check
  last_run: 2026-06-22
  notes: "Run at edit time before updating shelf. Keep test references aligned to new modes."
test_plan: test-plan.md
agent_entry_queries:
  - id: onboarding
    intent: Learn how MCP exports read-only inspection across sessions, targets, and admission-chain read models.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Add/update MCP tool contracts and verify read-only behavior and cache posture.
    anchor: "#entry-edit"
  - id: triage
    intent: Trace MCP tool failure shape, posture branch, and session initialization issues.
    anchor: "#entry-triage"
  - id: impact
    intent: Evaluate parity impact against CLI and target discovery outputs.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf defines read-only MCP tool behavior for inspection and admission-chain operations.

| Question | Answer |
|---|---|
| What this topic owns | tool registration, output payload shaping, read-only execution contracts, cache-sensitive session reuse, and runtime discovery MCP parity. |
| What it does not own | mutation-capable tool surfaces and interactive transport negotiation. |
| How it works | MCP tooling reads session-derived or discovery material and projects it into read-only tool outputs with deterministic payload shaping. |
| Why this matters | inspection and automation clients rely on MCP outputs for triage and operational truth. |
| First prerequisite | `protocol-contract` and `continuum-target-discovery`. |
| What changes propagate | tool-contract changes shift what MCP callers can read, cache, and triage across sessions. |

<a id="entry-edit"></a>
## Safe change path

1. Update behavior in `src/mcp` and related inspection modules.
2. Keep all `R-MCP-*` rows in `test-plan.md` covered.
3. Run focused MCP tests before broader suite.

Focused command:

```bash
npm run test -- test/mcpAdmissionChainSurface.spec.ts
```

Focused verification command: `npm run test -- test/cliJson.spec.ts test/adapterRegistry.integration.spec.ts`

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Tool result shape changes are a compatibility-sensitive contract for automation clients.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Tool list regression | expected tool missing from initialization | MCP clients fail to discover session functions | compare static tool registry and boot sequence | `test/mcpAdmissionChainSurface.spec.ts` |
| Read-only violation | mutation-like request accepted for inspection endpoint | contract breach and safety risk | enforce read-only wrappers and guard handlers | `test/mcpAdmissionChainSurface.spec.ts` |
| Session cache mismatch | session outputs vary across repeated tool calls | stale or incorrect posture in clients | validate cache invalidation and descriptor keys | `test/mcpAdmissionChainSurface.spec.ts` |
| Runtime discovery parity drift | MCP `warp_ttd.inspect_runtime_discovery` differs from the runtime discovery read model | agents receive conflicting CLI/MCP posture facts | compare MCP structured content with `inspectRuntimeDiscovery` output | `test/mcpAdmissionChainSurface.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `debugger-session-core`, `shared-family-facts`, `continuum-target-discovery`. |
| Used by | `cli-interface`, `tui-shell`, `worldline-visualization`, `admission-chain-read-model`. |
| Cross-shelf impact | Tool output changes should be mirrored in CLI and runtime discovery assertions. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-MCP-1` through `R-MCP-5`.
- Primary sources: `src/mcp/*.ts`, `src/app/*.ts`, `src/app/runtimeHelloInspection.ts`.
- The `warp_ttd.inspect_runtime_discovery` surface returns the same runtime discovery read model that backs `discover --json`.
- Runtime registry parser and fixture behavior remain upstream inputs; MCP parity evidence covers only the read-only tool projection over that read model.

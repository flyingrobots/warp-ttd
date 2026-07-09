---
title: Runtime Discovery Registry
topic: runtime-discovery-registry
topics:
  - runtime-discovery
  - registry
  - continuum
  - fixtures
date_created: 2026-07-08
date_last_updated: 2026-07-08
status_last_reviewed: 2026-07-08
author: "James <james@flyingrobots.dev>"
code_owners:
  - "James <james@flyingrobots.dev>"
status: current
schema_version: "2.1"
risk_level: medium
change_impact: "Contract-sensitive local input that determines which Continuum runtimes discovery can inspect."
depends_on:
  - continuum-target-discovery
  - adapter-port-and-registry
  - protocol-contract
used_by:
  - continuum-target-discovery
  - cli-interface
  - mcp-interface
verification:
  - npm run test -- test/runtimeRegistry.spec.ts
  - npm run docs:verify
review_interval_days: 60
test_plan: test-plan.md
review_due: 2026-09-06
author_contact: "James <james@flyingrobots.dev>"
agent_entry_queries:
  - id: onboarding
    intent: Learn registry schema, source selection, and fixture posture.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Change registry parsing, normalization, source priority, or fixtures.
    anchor: "#entry-edit"
  - id: triage
    intent: Diagnose malformed registry inputs or unexpected runtime entries.
    anchor: "#entry-triage"
  - id: impact
    intent: Validate cross-shelf effects before CLI or MCP discovery surfaces change.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>

## At a glance

This shelf owns the local runtime registry and runtime discovery read model used by `discover --json` before the MCP parity surface exists.

| Question | Answer |
|---|---|
| What this topic owns | `warp-ttd.runtime-registry.v1`, `warp-ttd.continuum-runtime-discovery-inspection.v1`, deterministic source priority, normalized runtime entries, discovery posture records, obstruction records, and fixture coverage. |
| What it does not own | MCP tool wiring, runtime endpoint consent/auth, runtime admission, authority issuance, or mutable runtime control. |
| How it works | registry JSON is normalized into runtime entries and target descriptors, then composed with target inspection and runtime hello posture without ambient machine scans. |
| Why this matters | discovery must be reproducible for agents before it can drive workbench or runtime-debugger flows. |
| First prerequisite | understand `continuum-target-discovery` target descriptors and runtime hello posture. |
| What changes propagate | source priority, redaction, discovery posture, or obstruction changes affect CLI discovery output and future MCP parity. |

<a id="entry-edit"></a>

## Safe change path

1. Update `test-plan.md` rows `R-RDR-*` before changing parser behavior.
2. Add or update JSON fixtures under `test/fixtures/runtime-registry/`.
3. Change `src/app/runtimeRegistry.ts` or `src/app/runtimeDiscovery.ts` and keep outputs deterministic.
4. Run the focused behavior test:

```bash
npm run test -- test/runtimeRegistry.spec.ts test/cliRuntimeDiscovery.spec.ts
```

Full behavior verification before merge:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- `loadRuntimeRegistryFromEnv` source priority and `discover --json` discovery postures are agent-facing contracts and should not change without explicit migration notes.

<a id="entry-triage"></a>

## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Registry schema version unsupported | `REGISTRY_SCHEMA_VERSION_UNSUPPORTED` reason | discovery receives one obstructed registry entry | confirm producer emits `warp-ttd.runtime-registry.v1` | `test/runtimeRegistry.spec.ts` |
| Duplicate runtime IDs | `REGISTRY_DUPLICATE_ID` reason for each duplicate | duplicated runtimes are visible but obstructed | fix operator registry IDs before running discovery | `test/runtimeRegistry.spec.ts` |
| Endpoint entry appears before #79 | descriptor-only `UNSUPPORTED` connection | endpoint is visible but not contacted | keep endpoint data out of discovery until consent/auth lands | `test/cliRuntimeDiscovery.spec.ts` |
| Secret-like metadata or connection fields appear | `redaction.redacted` and field path | secret value is omitted from normalized output | move secrets to a future consent/auth mechanism | `test/runtimeRegistry.spec.ts`, `test/cliRuntimeDiscovery.spec.ts` |
| Runtime hello cannot be composed | `RUNTIME_HELLO_*` reason in discovery record | automation cannot proceed to runtime-specific inspection | inspect target descriptor and runtime hello posture together | `test/cliRuntimeDiscovery.spec.ts` |

<a id="entry-impact"></a>

## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `continuum-target-discovery`, `adapter-port-and-registry`, `protocol-contract`. |
| Used by | `discover --json`, future `warp_ttd.inspect_runtime_discovery`, and runtime discovery goalpost closeout. |
| Cross-shelf impact | Runtime registry changes can alter target enumeration, runtime hello inputs, CLI parity, and MCP parity. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-RDR-1` through `R-RDR-8`.
- Primary sources: `src/app/runtimeRegistry.ts` and `src/app/runtimeDiscovery.ts`.
- Behavior evidence: `test/runtimeRegistry.spec.ts` and `test/cliRuntimeDiscovery.spec.ts`.
- Fixture matrix: `test/fixtures/runtime-registry/*.json`.
- Design source: `docs/design/0078-continuum-runtime-discovery-command-and-local-registry/continuum-runtime-discovery-command-and-local-registry.md`.

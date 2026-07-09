---
title: CLI Interface
topic: cli-interface
topics:
  - cli
targets:
  - cli dispatch
  - jsonl contracts
  - command transport
  - target inspection
  - failure modes
status_last_reviewed: 2026-06-22
date_created: 2026-06-22
date_last_updated: 2026-06-22
author: James <james@flyingrobots.dev>
code_owners:
  - James <james@flyingrobots.dev>
status: current
schema_version: 1.0.1
risk_level: medium
change_impact: "CLI shape and command semantics are primary compatibility points for scripts, automations, and TUI/agent consumers."
depends_on:
  - protocol-contract
  - debugger-session-core
  - continuum-target-discovery
  - adapter-port-and-registry
used_by:
  - tui-shell
  - mcp-interface
  - worldline-visualization
verification:
  commands:
    - npm run test -- test/cliJson.spec.ts test/cliWorldline.spec.ts
    - npm run test:integration
    - npm run lint
    - npm run lint:check
    - npm run docs:verify
  last_run: 2026-06-22
  notes: "Treat focused CLI fixtures as the one-minute command for command-shape edits."
test_plan: test-plan.md
agent_entry_queries:
  - id: onboarding
    intent: Understand command graph, parser rules, and contract-shape guarantees.
    anchor: "#entry-onboarding"
  - id: edit
    intent: Add/modify a CLI command and recover the proof chain from test requirements.
    anchor: "#entry-edit"
  - id: triage
    intent: Triage parser, transport, or target inspection failures quickly and safely.
    anchor: "#entry-triage"
  - id: impact
    intent: Review cross-shelf impact when changing command envelopes.
    anchor: "#entry-impact"
---

<a id="entry-onboarding"></a>
## At a glance

This shelf captures machine contracts for CLI outputs and command dispatch. It is the entry surface for JSON/JSONL callers and automation.

| Question | Answer |
|---|---|
| What this topic owns | command parsing, output envelopes, and deterministic serialization for session/worldline surfaces. |
| What it does not own | transport discovery internals and protocol schema evolution. |
| How it works | reader-facing commands map to parsed operations and emit normalized machine-readable envelopes. |
| Why this matters | CLI contracts are often scripts’ primary integration surface and therefore high-impact on automation stability. |
| First prerequisite | `protocol-contract` and `debugger-session-core` snapshot semantics. |
| What changes propagate | command-shape edits alter every downstream automation path that consumes CLI envelopes or shell-facing session transitions. |

<a id="entry-edit"></a>
## Safe change path

1. Update requirement mappings in `test-plan.md` (`R-CLI-*`).
2. Patch CLI command parser and output generation with matching fixtures.
3. Run targeted command tests, then integration checks.

Focused command:

```bash
npm run test -- test/cliJson.spec.ts test/cliWorldline.spec.ts
```

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- Changing command output keys or order can break scripts and downstream parser logic.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Unsupported command or invalid flags | parse failure and non-zero exit | no command output | validate dispatch table and argument validation | `test/cliJson.spec.ts` |
| Wrong JSON/JSONL envelope | schema drift in snapshots | consumer breakage and parser failures | compare output keys against protocol contract tables | `test/cliJson.spec.ts`, `test/cliWorldline.spec.ts` |
| Target inspection mismatch | posture or root mismatch in `target-session` output | operators see stale/incorrect posture | inspect discovery descriptors and runtime hello flow | `test/adapterRegistry.integration.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `debugger-session-core`, `continuum-target-discovery`, `adapter-port-and-registry`. |
| Used by | `tui-shell`, `mcp-interface`, `worldline-visualization`. |
| Cross-shelf impact | Output contract changes require synchronized tests in MCP and UI surfaces. |

## Evidence

- Normative claims are in `test-plan.md` rows `R-CLI-1` through `R-CLI-4`.
- Primary sources: `src/cli/*.ts`, `src/app/*.ts`, and protocol fixtures used in CLI tests.
- The 0078 runtime discovery design names a future `discover --json` surface; no CLI behavior changes until #148 lands, so the current CLI evidence rows remain unchanged.
- The #147 runtime registry parser and fixture matrix are preparatory inputs for #148; they add no command dispatch, JSONL envelope, or CLI output keys in this slice.

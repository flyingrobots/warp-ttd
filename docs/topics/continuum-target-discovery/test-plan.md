# Test Plan — Continuum Target Discovery

## Requirements

- **R-CTD-1:** Target enumeration remains deterministic and adapter-rooted.
- **R-CTD-2:** Runtime hello posture returns machine-parseable values and reasons.
- **R-CTD-3:** `target-session` posture is stable when adapters report present/absent/unsupported/unavailable.
- **R-CTD-4:** Target-facing command and MCP outputs never regress schema shape when posture shifts.

## Evidence

- C1 — `test/cliJson.spec.ts`
  - Verifies JSON session shape stability for runtime-facing outputs.
- C2 — `test/adapterRegistry.integration.spec.ts`
  - Verifies adapter-backed target resolution and deterministic descriptor behavior.
- C3 — `test/mcpAdmissionChainSurface.spec.ts`
  - Verifies MCP session and tool outputs are built from adapter posture and registry context.
- C4 — `test/ontologyDoctrine.spec.ts`
  - Validates doctrine terms used for target/runtime posture compatibility.

## Fixtures

- CLI and MCP fixture targets exercised through existing helper builders.
- Runtime hello and target posture fixtures in live docs design examples.

## Oracles

- Posture values are exact and documented.
- Obstruction/reason fields exist for non-present states.
- Probe output remains stable across CLI/MCP surfaces for equivalent target conditions.

## Planned Cases

- Expand CLI and MCP fixture coverage for explicit Continuum target edge cases once command surfaces are expanded.


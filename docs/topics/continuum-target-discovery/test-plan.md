# Test Plan — Continuum Target Discovery

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-CTD-1 | Target enumeration remains deterministic and adapter-rooted. | `test/cliJson.spec.ts`, `test/adapterRegistry.integration.spec.ts` | `test/helpers/worldlineFixture.ts`, `test/helpers/gitWarpFixture.ts`, `test/helpers/scenarioFixture.ts` | Enumeration output ordering and posture are stable for fixed input sets. | covered |
| R-CTD-2 | Runtime hello posture returns machine-parseable values and reasons. | `test/cliJson.spec.ts`, `test/runtimeHelloInspection.spec.ts` | `test/runtimeHelloInspection.spec.ts` | Posture payload uses expected enums and reason fields. | covered |
| R-CTD-3 | `target-session` posture is stable across descriptor-present, absent, and unsupported modes. | `test/adapterRegistry.integration.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` | Descriptor modes across sessions and targets. | Returned posture transitions are deterministic and non-flaky. | covered |
| R-CTD-4 | Discovery outputs remain schema-consistent when posture shifts. | `test/ontologyDoctrine.spec.ts` | Cross-surface parity fixtures between CLI and MCP. | Output keys and value classes remain consistent after posture changes. | covered |

## Fixtures

- Discovery descriptors for target and runtime hello fixtures.
- Shared adapter fixtures used by CLI/MCP tests.

## Oracles

- Deterministic posture enums.
- Stable reason fields for non-present states.
- Schema compatibility across CLI and MCP equivalent inputs.

## Planned Cases

- Expand fixture coverage for additional continuum edge posture values.

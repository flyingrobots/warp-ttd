# Test Plan — Continuum Target Discovery

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-CTD-1 | Target enumeration remains deterministic and adapter-rooted. | `test/cliJson.spec.ts`, `test/adapterRegistry.integration.spec.ts` | `test/helpers/worldlineFixture.ts`, `test/helpers/gitWarpFixture.ts`, `test/helpers/scenarioFixture.ts` | Enumeration output ordering and posture are stable for fixed input sets. | covered |
| R-CTD-2 | Runtime hello posture returns machine-parseable values and reasons. | `test/cliJson.spec.ts`, `test/runtimeHelloInspection.spec.ts` | `test/runtimeHelloInspection.spec.ts` | Posture payload uses expected enums and reason fields. | covered |
| R-CTD-3 | `target-session` posture is stable across descriptor-present, absent, and unsupported modes. | `test/adapterRegistry.integration.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` | Descriptor modes across sessions and targets. | Returned posture transitions are deterministic and non-flaky. | covered |
| R-CTD-4 | Discovery outputs remain schema-consistent when posture shifts. | `test/liveTargetInspection.spec.ts`, `test/runtimeHelloInspection.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` | Cross-surface parity fixtures between CLI and MCP. | Output keys, posture enums, and reason fields remain consistent after posture changes. | covered |
| R-CTD-5 | The runtime discovery design defines the next registry-backed discovery contract before implementation starts. | `docs/design/0078-continuum-runtime-discovery-command-and-local-registry/continuum-runtime-discovery-command-and-local-registry.md`, `npm run check:method` | 0078 Method design packet and current GitHub issue graph. | Method validation passes and the design names registry schema, discovery postures, CLI/MCP surfaces, redaction boundary, and behavior-first test oracles. | covered |

## Fixtures

- Discovery descriptors for target and runtime hello fixtures.
- Shared adapter fixtures used by CLI/MCP tests.
- 0078 Method design packet for runtime discovery registry behavior.

## Oracles

- Deterministic posture enums.
- Stable reason fields for non-present states.
- Schema compatibility across CLI and MCP equivalent inputs.
- Method design validation for pre-implementation registry and discovery contracts.

## Planned Cases

- Expand fixture coverage for additional continuum edge posture values.

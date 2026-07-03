# Test Plan — MCP Interface

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-MCP-1 | MCP session and admission-chain tools emit stable protocol-shaped data. | `test/mcpAdmissionChainSurface.spec.ts` | Tool invocation fixtures and known descriptors. | Tool results include required contract fields and stable posture values. | covered |
| R-MCP-2 | Tool results are deterministic under fixed snapshot and descriptor inputs. | `test/mcpAdmissionChainSurface.spec.ts`, `test/cliJson.spec.ts` | Matching descriptor fixtures and snapshot baselines. | Identical inputs produce identical output payloads. | covered |
| R-MCP-3 | MCP surfaces reject unsupported/invalid descriptors predictably. | `test/mcpAdmissionChainSurface.spec.ts`, `test/adapterRegistry.integration.spec.ts` | Invalid descriptor fixtures. | Invalid descriptors return explicit failure classes or posture codes. | covered |
| R-MCP-4 | MCP behavior remains consistent with CLI and TUI JSON contracts. | `test/mcpAdmissionChainSurface.spec.ts`, `test/cliJson.spec.ts` | Contract parity fixtures across interfaces. | Cross-surface fields and ordering remain aligned. | covered |

## Fixtures

- MCP session and tool fixtures in MCP tests.
- Shared adapter descriptors used by CLI and inspection flows.

## Oracles

- Stable tool names and result keys.
- Read-only execution for all tool handlers.
- Predictable validation failures without side effects.

## Planned Cases

- Add MCP regression cases for generated protocol families and new runtime hello flags.

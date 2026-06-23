# Test Plan — Admission Chain Read Model

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-ACR-1 | Admission-chain read model assembly is deterministic for fixed inputs. | `test/mcpAdmissionChainSurface.spec.ts` | Stable admission-chain fixtures and target descriptors. | Same inputs produce identical admission-chain summaries and posture. | covered |
| R-ACR-2 | Missing or obstructed data returns explicit absence/posture. | `test/liveEchoFamilyIntake.spec.ts`, `test/inspectorPage.spec.ts` | Present/absent/obstructed inputs from live target fixtures. | Posture values remain explicit and machine-parseable for all branches. | covered |
| R-ACR-3 | MCP and TUI consumers observe consistent admission-chain shapes. | `test/mcpAdmissionChainSurface.spec.ts`, `test/inspectorPage.spec.ts` | MCP and inspector integration flows. | tool/page outputs preserve required fields and stable ordering. | covered |
| R-ACR-4 | Read model errors are stable and non-throwing for malformed data. | `test/liveEchoFamilyIntake.spec.ts`, `test/debuggerSession.spec.ts` | Malformed descriptors and partial artifacts. | Invalid inputs result in posture changes without hard crashes. | covered |

## Fixtures

- Live target and admission fixtures from `test/helpers`.
- Protocol-shaped descriptors used by inspection entrypoints.

## Oracles

- Admission-chain summaries are deterministic.
- Posture values are explicit and stable by branch.
- Consumers receive non-throwing, parseable structures.

## Planned Cases

- Expand malformed admission-chain payload coverage for partial reconstruction branches.

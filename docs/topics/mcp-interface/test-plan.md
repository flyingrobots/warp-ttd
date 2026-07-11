# Test Plan — MCP Interface

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-MCP-1 | MCP session and admission-chain tools emit stable protocol-shaped data. | `test/mcpAdmissionChainSurface.spec.ts` | Tool invocation fixtures and known descriptors. | Tool results include required contract fields and stable posture values. | covered |
| R-MCP-2 | Tool results are deterministic under fixed snapshot and descriptor inputs. | `test/mcpAdmissionChainSurface.spec.ts`, `test/cliJson.spec.ts` | Matching descriptor fixtures and snapshot baselines. | Identical inputs produce identical output payloads. | covered |
| R-MCP-3 | MCP surfaces reject unsupported/invalid descriptors predictably. | `test/mcpAdmissionChainSurface.spec.ts`, `test/adapterRegistry.integration.spec.ts` | Invalid descriptor fixtures. | Invalid descriptors return explicit failure classes or posture codes. | covered |
| R-MCP-4 | MCP behavior remains consistent with CLI and TUI JSON contracts. | `test/mcpAdmissionChainSurface.spec.ts`, `test/cliJson.spec.ts` | Contract parity fixtures across interfaces. | Cross-surface fields and ordering remain aligned. | covered |
| R-MCP-5 | MCP runtime discovery returns the same read model as the CLI-backed runtime discovery surface without exposing secrets or control authority. | `test/mcpAdmissionChainSurface.spec.ts::MCP runtime discovery inspection exposes the CLI-equivalent read model`, `test/mcpAdmissionChainSurface.spec.ts::MCP runtime discovery preserves registry obstruction and redaction posture` | default registry roots, env JSON registry with endpoint secret and obstructed entry | MCP structured content deep-equals `inspectRuntimeDiscovery`; endpoint is `UNSUPPORTED`; obstructed entry emits `REGISTRY_ENTRY_CONNECTION_OBSTRUCTED`; secret token and endpoint URL are absent. | covered |

## Fixtures

- MCP session and tool fixtures in MCP tests.
- Shared adapter descriptors used by CLI and inspection flows.

## Oracles

- Stable tool names and result keys.
- Read-only execution for all tool handlers.
- Predictable validation failures without side effects.
- Runtime discovery parity with the shared read model and redaction posture.

## Planned Cases

- Add MCP regression cases for generated protocol families and new runtime hello flags.

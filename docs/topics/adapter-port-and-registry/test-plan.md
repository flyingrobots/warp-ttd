# Test Plan — Adapter Port and Registry

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-AR-1 | Adapter port contract methods cover landed protocol operations. | `test/adapterRegistry.spec.ts` | Resolver unit inputs for each adapter kind. | Exported `ResolvedAdapter` tuple includes adapter+default head for known kinds. | covered |
| R-AR-2 | Registry resolves configured adapters deterministically. | `test/adapterRegistry.spec.ts`, `test/adapterRegistry.integration.spec.ts` | `test/helpers/worldlineFixture.ts`, `test/helpers/gitWarpFixture.ts`, `test/helpers/scenarioFixture.ts` | same config always maps to same constructor and posture result. | covered |
| R-AR-3 | Unsupported adapter kinds fail predictably with structured errors. | `test/adapterRegistry.spec.ts` | Invalid adapter kind payloads and malformed descriptors. | `UnknownAdapterKindError` is thrown consistently for unsupported kinds. | covered |
| R-AR-4 | Registry integration path drives adapter selection for live and snapshot workflows. | `test/adapterRegistry.integration.spec.ts`, `test/tuiPageStructure.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` | Target/session descriptors for integration entrypoints. | session/open results use the resolved adapter path and never bypass resolver for supported kinds. | covered |

## Fixtures

- `test/fixtures/targetDescriptorFixture.ts`
- `test/helpers/scenarioDescriptorFixture.ts`
- `test/fixtures/gitWarpFixture.ts`

## Oracles

- `ResolvedAdapter` tuple shape is stable for supported kinds.
- Structured errors remain typed and specific.
- Live snapshot/target paths do not return undefined adapter branches.

## Planned Cases

- none

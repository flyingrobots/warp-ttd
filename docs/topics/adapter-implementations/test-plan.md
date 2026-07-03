# Test Plan — Adapter Implementations

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-AD-1 | Echo fixture emits complete protocol shape for frame/receipt/effect/facts. | `test/echoFixtureAdapter.spec.ts` | Echo fixture payload and static adapter tuples. | Protocol methods and summaries match fixture expectations and are deterministic. | covered |
| R-AD-2 | Git-warp adapter translates materialized substrate data into lanes, frames, and receipts. | `test/gitWarpAdapter.spec.ts` | Git-warp fixture graph and receipt fixtures. | Frame indexing and lane catalogs match expected order and counts. | covered |
| R-AD-3 | Scenario adapter builds deterministic fixtures for protocol controls. | `test/scenarioFixture.spec.ts` | Scenario descriptors and factory inputs. | Scenario keys resolve deterministically and invalid descriptors reject clearly. | covered |
| R-AD-4 | Out-of-range and missing data surfaces explicit adapter errors. | `test/echoFixtureAdapter.spec.ts`, `test/gitWarpAdapter.spec.ts`, `test/scenarioFixture.spec.ts` | Invalid frame indexes and missing scenario keys. | Error paths are explicit and non-throwing for unsupported optional channels. | covered |

## Fixtures

- `test/helpers/gitWarpFixture.ts`
- `test/helpers/scenarioFixture.ts`
- Scenario fixture constants in scenario adapter tests

## Oracles

- Frame and receipt sequences are deterministic for fixed fixtures.
- Error classes for boundary and missing keys are stable and inspectable.
- Capability flags change only with explicit feature inputs.

## Planned Cases

- none

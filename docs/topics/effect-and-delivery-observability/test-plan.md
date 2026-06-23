# Test Plan — Effect and Delivery Observability

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-EDO-1 | Effect and delivery records stay stable across adapters and frames. | `test/effectEmission.spec.ts` | `test/helpers/gitWarpEffectFixture.ts`, `test/helpers/worldlineFixture.ts`, `test/helpers/scenarioFixture.ts` | same adapter input frame pair emits same ordered effect records. | covered |
| R-EDO-2 | Emission extraction is deterministic for materialized fixture or live data. | `test/gitWarpAdapter.spec.ts`, `test/effectEmission.spec.ts` | Frame and receipt fixtures with materialized events. | Event extraction order and counts match deterministic mapping rules. | covered |
| R-EDO-3 | Capabilities are gated safely when emission/delivery paths are unavailable. | `test/effectEmission.spec.ts`, `test/debuggerSession.spec.ts` | Inputs where optional channels are absent. | Consumer receives explicit empty lists or absent fields, never hard crashes. | covered |
| R-EDO-4 | Summary shapes are stable in machine-readable surfaces. | `test/debuggerSession.spec.ts`, `test/effectEmission.spec.ts` | Session/worldline summary assertions. | Emission summary payloads preserve schema shape and stable keys. | covered |

## Fixtures

- `test/helpers/gitWarpFixture.ts`
- Scenario fixture and suppression descriptors used by effect tests

## Oracles

- Stable emission and delivery arrays for equivalent inputs.
- Deterministic frame-index mapping.
- Non-destructive behavior for missing capability paths.

## Planned Cases

- Add explicit suppression/malformed payload integration cases.

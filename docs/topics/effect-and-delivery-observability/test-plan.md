# Test Plan — Effect and Delivery Observability

## Requirements

- **R-EDO-1:** Effect and delivery records stay stable across adapters and frames.
- **R-EDO-2:** Emission extraction is deterministic for materialized fixture or live data.
- **R-EDO-3:** Capabilities are gated safely when emission/deivery paths are unavailable.
- **R-EDO-4:** Summary shapes are stable in machine-readable surfaces.

## Evidence

- C1 — `test/effectEmission.spec.ts`
  - Verifies parity between adapters for delivery/effect semantics and sequencing.
- C2 — `test/gitWarpAdapter.spec.ts`
  - Verifies adapter frame progression and emission counts from git-warp fixtures.
- C3 — `test/debuggerSession.spec.ts`
  - Verifies surfaced emission and observation summaries in sessions.

## Fixtures

- Git-warp and scenario fixtures that exercise admissible and suppressed effects.
- Delivery-focused fixture cases in scenario builders.

## Oracles

- Emission arrays are stable for equivalent inputs.
- Frame-index mapping for emissions is deterministic.
- Missing capability paths remain non-throwing and empty when absent.

## Planned Cases

- Add explicit regression cases for mixed emission/delivery suppression and malformed payload tolerance in a dedicated integration test path.


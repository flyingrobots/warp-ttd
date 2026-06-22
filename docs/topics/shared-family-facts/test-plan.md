# Test Plan — Shared-Family Facts

## Requirements

- **R-SF-1:** Generated-family helpers preserve source/origin/scope metadata.
- **R-SF-2:** Session family facts are emitted as typed, posture-aware artifacts.
- **R-SF-3:** Malformed host-provided family facts do not break session assembly.
- **R-SF-4:** Live Echo intake surfaces descriptor and generated-manifest posture consistently.

## Evidence

- C1 — `test/generatedFamilyIngress.spec.ts`
  - Validates present/absent/obstructed behavior and coverage of initial ingress refs.
- C2 — `test/liveEchoFamilyIntake.spec.ts`
  - Verifies target-family intake posture for missing roots, present manifests, malformed descriptors, unavailable artifacts.
- C3 — `test/liveEchoAdapterProbe.spec.ts`
  - Verifies probe posture values carried into intake paths and surfaced through adapters.
- C4 — `test/debuggerSession.spec.ts`
  - Verifies session preference for host-published family facts when present.

## Fixtures

- `test/helpers/jsonTestUtils.ts`
- Manifest-like fixture constants in `src/app/liveEchoFamilyIntake.ts` tests.

## Oracles

- Family fact wrappers contain stable field names and provenance metadata.
- Obstruction reasons exist where posture is not present.
- Local fallback used only when host fact inputs are missing or malformed.

## Planned Cases

- none


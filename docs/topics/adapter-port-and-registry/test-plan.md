# Test Plan — Adapter Port and Registry

## Requirements

- **R-AR-1:** Adapter port contract methods cover all landed protocol operations.
- **R-AR-2:** Registry resolves configured adapters deterministically.
- **R-AR-3:** Unsupported adapter kinds fail predictably with structured errors.
- **R-AR-4:** Registry integration path drives adapter selection for live/snapshot workflows.

## Evidence

- C1 — `test/adapterRegistry.spec.ts`
  - `resolveAdapter` supports `echo-fixture`.
  - Unknown kinds throw typed unknown-kind error.
- C2 — `test/adapterRegistry.integration.spec.ts`
  - `inspectLiveTargetSessions` can open git-warp session and enforces descriptor constraints.
  - Duplicate/invalid descriptor behavior is deterministic.
- C3 — `test/tuiPageStructure.spec.ts`
  - Confirms pages remain page-driven and do not bypass registry path in UI shell.
- C4 — `test/mcpAdmissionChainSurface.spec.ts`
  - Confirms MCP session and tools are built from an adapter instance with cached initialization.

## Fixtures

- `src/app/adapterRegistry.ts`
- `src/errors.ts` (`UnknownAdapterKindError`)
- Test fixtures from helper builders (`createFixture`, target descriptors in inspect paths)

## Oracles

- Registry returns expected adapter class and default head.
- Error classes appear in negative cases.
- Descriptor and descriptor-like edge cases remain deterministic and traceable.

## Planned Cases

- none


# Test Plan — Adapter Implementations

## Requirements

- **R-AD-1:** Echo fixture emits complete protocol shape for frame/receipt/effect/development facts.
- **R-AD-2:** Git-warp adapter translates materialized substrate data into lanes, frames, and receipts.
- **R-AD-3:** Scenario adapter builds deterministic fixtures that exercise protocol controls.
- **R-AD-4:** Out-of-range or missing data surfaces explicit adapter errors.

## Evidence

- C1 — `test/echoFixtureAdapter.spec.ts`
  - Verifies hello, catalog, head initialization, stepping, frame lookup, session-family publication.
- C2 — `test/gitWarpAdapter.spec.ts`
  - Verifies catalog composition, frame indexing rules, navigation, receipt counts, effect emission extraction,
    malformed payload handling, and frame clamping behavior.
- C3 — `test/scenarioFixture.spec.ts`
  - Verifies scenario construction, lane resolution, receipts/emissions/deliveries, execution mode, and invalid
    scenario definitions.
- C4 — `test/effectEmission.spec.ts`
  - Verifies shared effect and delivery semantics across adapters.

## Fixtures

- `test/helpers/gitWarpFixture.ts` (integration support)
- `test/helpers/scenarioFixture.ts`
- Built-in scenario descriptors (`liveWithEffects`, `replayWithSuppression`, `multiWriterWithConflicts`, `complex`)

## Oracles

- Snapshot comparisons for deterministic head/frame sequences.
- Receipt and emission arrays contain expected counts and IDs by frame.
- Out-of-range cases throw named adapter-level errors.

## Planned Cases

- none


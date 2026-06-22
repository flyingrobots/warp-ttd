# Test Plan — Worldline Visualization

## Requirements

- **R-WV-1:** Worldline layout remains deterministic for identical lane and frame inputs.
- **R-WV-2:** Rendering identifiers (lane, worldline, writer) remain stable.
- **R-WV-3:** Worldline views tolerate partial data without breaking shell or CLI outputs.
- **R-WV-4:** Layout and split-view outputs track session and frame progression.

## Evidence

- C1 — `test/worldlineRender.spec.ts`
  - Verifies low-level layout rendering invariants.
- C2 — `test/worldlineLayout.spec.ts`
  - Verifies worldline frame/lane composition contracts.
- C3 — `test/worldlineSplitView.spec.ts`
  - Verifies split-view output stability and fallback behavior.
- C4 — `test/worldlinePage.spec.ts`
  - Verifies full-page worldline display state transitions.

## Fixtures

- Worldline fixtures used in `test/helpers/worldlineFixture.ts` and adapter-generated lane inputs.

## Oracles

- Stable rendering coordinate output for identical inputs.
- No runtime exceptions when lanes or frames are partially absent.
- Consistent ordering of visual summaries across runs.

## Planned Cases

- Add coverage for mixed WORLDLINE and STRAND lane transitions over long session spans.


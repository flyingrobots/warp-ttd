# Test Plan — Neighborhood State Models

## Scope

Neighborhood-derived summaries are now tracked with executable expectations matching their source contracts.

## Requirements

- **R-NSM-1:** Neighborhood summary derivation is deterministic from protocol and session facts.
- **R-NSM-2:** Site catalog and focus summaries stay consistent when lanes move between frames.
- **R-NSM-3:** Receipt shell summaries project execution counters and evidence flags correctly.
- **R-NSM-4:** Reintegration detail summaries remain stable in obstructed and present fact states.

## Evidence

- C1 — `test/neighborhoodCoreSummary.spec.ts`, `test/neighborhoodFocusSummary.spec.ts`, `test/neighborhoodSiteCatalog.spec.ts`
  - Enforces deterministic summary construction and identity behavior.
- C2 — `test/inspectorPage.spec.ts`
  - Validates neighborhood-focused views consume expected summaries.
- C3 — `test/sessionSync.spec.ts`
  - Validates frame navigation updates neighborhood composition.

## Fixtures

- Neighborhood/summary builders and protocol fixtures used across the existing summary tests.

## Oracles

- Deterministic summary outputs for stable inputs.
- Stale IDs are rejected and replaced with stable alternatives.
- Fact-derived evidence is prioritized over local fallback when present.

## Planned Cases

- Add explicit fixture cases for malformed neighborhood source facts and fallback behavior.

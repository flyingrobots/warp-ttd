# Test Plan — Neighborhood State Models

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-NSM-1 | Neighborhood summary derivation is deterministic from protocol and session facts. | `test/neighborhoodCoreSummary.spec.ts` | Stable protocol/session fixture sets. | Summary outputs repeat identically for the same input fixtures. | covered |
| R-NSM-2 | Site catalog and focus summaries remain consistent when lanes move between frames. | `test/neighborhoodSiteCatalog.spec.ts`, `test/neighborhoodFocusSummary.spec.ts` | Lane reassignments and frame progression fixtures. | Focus and catalog outputs remain identity-stable after transitions. | covered |
| R-NSM-3 | Receipt shell summaries project execution counters and evidence flags correctly. | `test/neighborhoodCoreSummary.spec.ts`, `test/neighborhoodSiteCatalog.spec.ts` | Receipt fixture families used in summary tests. | Counter totals and flags match expected frame state. | covered |
| R-NSM-4 | Reintegration detail summaries remain stable in obstructed and present fact states. | `test/debuggerSession.spec.ts`, `test/neighborhoodCoreSummary.spec.ts` | Presence and obstructed family fact fixtures. | Reintegration details preserve precedence and deterministic order. | covered |

## Fixtures

- Neighborhood summary builders and protocol fixtures used in `test/neighborhoodCoreSummary.spec.ts`, `test/neighborhoodSiteCatalog.spec.ts`, `test/neighborhoodFocusSummary.spec.ts`.
- Inspector and session-sync inputs.

## Oracles

- Summary outputs are deterministic for stable input.
- Identity changes are explicit and stable.
- Obstructed facts produce explicit posture markers and fallback behavior.

## Planned Cases

- Add malformed fact cases for focus and reintegration boundary behavior.

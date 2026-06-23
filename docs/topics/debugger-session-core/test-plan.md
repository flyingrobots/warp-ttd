# Test Plan — Debugger Session Core

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-DS-1 | Session creation performs handshake and builds a valid snapshot. | `test/debuggerSession.spec.ts` | Session constructors with standard adapter tuples. | Snapshot contains expected frame, cursor, and capability data after bootstrap. | covered |
| R-DS-2 | Capability gating hides unavailable protocol surfaces safely. | `test/debuggerSession.spec.ts` | Host capability maps with missing optional methods. | Unavailable methods do not leak into consumer-facing snapshot fields. | covered |
| R-DS-3 | Navigation updates snapshot, head cursor, and neighborhood summaries. | `test/sessionSync.spec.ts`, `test/debuggerSession.spec.ts` | Frame navigation fixtures and cursor updates. | Frame and cursor transitions are deterministic and reflected in summaries. | covered |
| R-DS-4 | Pin lifecycle supports add/remove with stable emission pairing. | `test/debuggerSession.spec.ts` | Pin operations in session flows. | Pin state changes are reversible and mirrored in snapshots. | covered |
| R-DS-5 | Session JSON shape is serializable and deterministic. | `test/cliJson.spec.ts`, `test/debuggerSession.spec.ts` | Session serialize operations and snapshot fixtures. | Serialized output remains schema-complete and stable for identical inputs. | covered |

## Fixtures

- `test/fixtures/sessionFixture.ts`
- Adapter fixtures through `test/echoFixtureAdapter.spec.ts`

## Oracles

- Snapshot fields for frame index, execution context, and family facts are stable.
- Navigation preserves host/published facts and pin behavior.
- JSON serialization roundtrips without lossy field drops.

## Planned Cases

- none

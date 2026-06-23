# Test Plan — Worldline Visualization

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-WV-1 | Worldline layout remains deterministic for identical lane and frame inputs. | `test/worldlineRender.spec.ts` | Stable lane/frame fixtures. | Render output remains identical for fixed inputs. | covered |
| R-WV-2 | Rendering identifiers remain stable across frames and lanes. | `test/worldlineLayout.spec.ts` | Lane and worldline fixture sets. | Lane/writer IDs and ordering remain deterministic. | covered |
| R-WV-3 | Worldline views tolerate partial data without breaking shell or CLI outputs. | `test/worldlineSplitView.spec.ts` | Partial lane and frame fixtures. | Rendering degrades gracefully with absent optional inputs. | covered |
| R-WV-4 | Layout and split-view outputs track session and frame progression. | `test/worldlinePage.spec.ts`, `test/worldlineSplitView.spec.ts` | Session progression and terminal-width variants. | Output transitions follow session/viewport rules. | covered |

## Fixtures

- `test/helpers/worldlineFixture.ts`
- Adapter-generated lane inputs from session fixtures.

## Oracles

- Stable coordinate output for fixed inputs.
- No runtime exceptions with partial data.
- Consistent ordering in rendered summaries.

## Planned Cases

- Add mixed WORLDLINE/STRAND lane transition coverage across long sessions.

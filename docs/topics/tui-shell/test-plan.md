# Test Plan — TUI Shell

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-TUI-1 | Page and shell boundaries are deterministic and adapter-independent. | `test/tuiPageStructure.spec.ts` | Page graph fixtures and shell lifecycle sequences. | Page list and route transitions remain constant for baseline scenarios. | covered |
| R-TUI-2 | Session and target posture transitions are propagated through shell lifecycle. | `test/sessionSync.spec.ts` | Session transition fixtures and target updates. | Shell state follows session lifecycle events without drift. | covered |
| R-TUI-3 | Connect flow uses registry-backed adapter selection. | `test/tuiPageStructure.spec.ts`, `test/inspectorPage.spec.ts` | Connect page integration inputs. | Connect actions route through registry-backed paths before UI initialization. | covered |
| R-TUI-4 | UI errors remain structured and non-fatal for unsupported targets. | `test/inspectorPage.spec.ts`, `test/sessionSync.spec.ts` | Unsupported target fixtures. | Shell emits structured non-fatal states and remains interactive. | covered |

## Fixtures

- `test/helpers/tuiFixture.ts`
- Shared frame fixtures from existing TUI specs.

## Oracles

- Page order and lifecycle events are reproducible.
- Inspector and navigator states align with session cursor updates.
- Unsupported states render with structured shell error channels.

## Planned Cases

- Add UI regression cases for expanded target-discovery posture surfaces.

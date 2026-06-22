# Test Plan — TUI Shell

## Requirements

- **R-TUI-1:** Page and shell boundaries are deterministic and adapter-independent.
- **R-TUI-2:** Session and target posture transitions are propagated through shell lifecycle.
- **R-TUI-3:** Connect flow uses registry-backed adapter selection.
- **R-TUI-4:** UI errors remain structured and non-fatal for unsupported targets.

## Evidence

- C1 — `test/tuiPageStructure.spec.ts`
  - Verifies shell page boundaries and navigation shape.
- C2 — `test/sessionSync.spec.ts`
  - Verifies UI state synchronization with session frame transitions.
- C3 — `test/inspectorPage.spec.ts`
  - Verifies inspector data and shell context synchronization.

## Fixtures

- Adapter fixtures and shared frame helpers used by TUI tests.

## Oracles

- Page order and lifecycle events are reproducible.
- Inspector and navigator states align with session cursor updates.
- Unsupported target/session states are displayed as structured shell states.

## Planned Cases

- Add UI regression cases for expanded target-discovery posture surfaces.


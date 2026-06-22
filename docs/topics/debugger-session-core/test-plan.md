# Test Plan — Debugger Session Core

## Requirements

- **R-DS-1:** Session creation performs handshake and builds a valid snapshot.
- **R-DS-2:** Capability gating hides unavailable protocol surfaces safely.
- **R-DS-3:** Navigation updates snapshot, head cursor, and derived neighborhood facts.
- **R-DS-4:** Pin lifecycle supports add/remove with stable emission-observation pairing.
- **R-DS-5:** Session JSON shape is serializable and deterministic.

## Evidence

- C1 — `test/debuggerSession.spec.ts`
  - Valid initial snapshot, initial empty pin list, capability skipping, navigation (forward/backward/seek),
    host-published fact preference, obstruction handling, pin add/remove behavior, serialization.
- C2 — `test/cliJson.spec.ts`
  - Verifies `session --json` emits serialized session envelope.
- C3 — `test/sessionSync.spec.ts`
  - Verifies frame changes trigger worldline focus sync contracts used by downstream pages.

## Fixtures

- `EchoFixtureAdapter` (default test adapter).
- Scenario and git-warp fixtures via direct test setups.

## Oracles

- Pin persistence across step transitions in snapshot stream.
- Snapshot fields for frame index, execution context, neighborhood summaries, and family facts.

## Planned Cases

- none


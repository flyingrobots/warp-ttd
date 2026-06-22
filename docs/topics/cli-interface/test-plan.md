# Test Plan — CLI Interface

## Requirements

- **R-CLI-1:** CLI JSON/JSONL outputs are stable and schema-complete for session and worldline paths.
- **R-CLI-2:** CLI command outputs expose only contract-backed fields for current protocol versions.
- **R-CLI-3:** CLI session and worldline paths remain deterministic with adapter changes.
- **R-CLI-4:** CLI handles unsupported targets gracefully without leaking untyped stack artifacts.

## Evidence

- C1 — `test/cliJson.spec.ts`
  - Verifies `session --json` shape and snapshot integrity.
- C2 — `test/cliWorldline.spec.ts`
  - Verifies worldline-oriented command outputs are stable and renderable.
- C3 — `test/adapterRegistry.integration.spec.ts`
  - Verifies CLI-backed adapter and descriptor behavior remains deterministic.

## Fixtures

- Fixture adapters and session builders used in CLI command tests.

## Oracles

- JSON schema field presence matches expected contract keys.
- Deterministic output ordering for same command/inputs.
- Deterministic error envelopes for unsupported modes.

## Planned Cases

- Add dedicated CLI command fixture cases for new runtime hello and admission-chain command arguments.


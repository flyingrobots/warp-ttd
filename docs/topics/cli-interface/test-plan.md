# Test Plan — CLI Interface

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-CLI-1 | CLI JSON/JSONL outputs are stable and schema-complete for session and worldline paths. | `test/cliJson.spec.ts`, `test/cliWorldline.spec.ts` | CLI command fixtures and fixed session descriptors. | Output objects include required contract keys for each command path. | covered |
| R-CLI-2 | CLI command outputs expose only contract-backed fields for current protocol versions. | `test/cliJson.spec.ts`, `test/protocolContract.spec.ts` | Contract-backed command response fixtures. | Extra/missing fields fail snapshot or contract assertions. | covered |
| R-CLI-3 | CLI session and worldline paths remain deterministic with adapter changes. | `test/adapterRegistry.integration.spec.ts`, `test/cliWorldline.spec.ts` | Adapter permutations and fixture targets. | Same descriptor input yields identical outputs across runs. | covered |
| R-CLI-4 | CLI handles unsupported targets gracefully without untyped stack artifacts. | `test/cliJson.spec.ts` | Unsupported or incomplete target descriptors. | Failures are stable and emit posture or explicit error envelopes. | covered |

## Fixtures

- `test/helpers/cliTargetFixture.ts`
- Adapter descriptors used by CLI sessions

## Oracles

- Stable field presence by command.
- Deterministic ordering for equal input sets.
- Safe error envelopes for unsupported runtime states.

## Planned Cases

- Add dedicated CLI fixture cases for new runtime hello and admission-chain arguments.

# Test Plan — Runtime Discovery Registry

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-RDR-1 | Empty environment selection emits the built-in witness registry deterministically. | `test/runtimeRegistry.spec.ts` | `loadRuntimeRegistryFromEnv({})` | source is `DEFAULT`; entries and descriptors are `jedit`, then `graft`. | covered |
| R-RDR-2 | Registry fixture parsing preserves supported connection entries and unsupported endpoint entries without ambient scans. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/mixed-registry.json` | entry count is stable and endpoint mode becomes descriptor-only `UNSUPPORTED`. | covered |
| R-RDR-3 | Env JSON has priority over env path. | `test/runtimeRegistry.spec.ts` | `WARP_TTD_RUNTIME_REGISTRY_JSON` plus `WARP_TTD_RUNTIME_REGISTRY_PATH` | source is `ENV_JSON` and path fixture is ignored. | covered |
| R-RDR-4 | Wrong schema versions produce structured obstruction records. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/wrong-schema.json` | reason code is `REGISTRY_SCHEMA_VERSION_UNSUPPORTED`; descriptor is obstructed. | covered |
| R-RDR-5 | Duplicate runtime IDs obstruct every duplicated entry deterministically. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/duplicate-registry.json` | all duplicated entries keep their ID and return `OBSTRUCTED`. | covered |
| R-RDR-6 | Malformed JSON and secret-like metadata remain machine-readable and non-leaking. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/malformed-registry.json`, mixed fixture metadata | parse failures return `REGISTRY_JSON_PARSE_ERROR`; redacted values are absent from emitted output. | covered |

## Fixtures

- `test/fixtures/runtime-registry/mixed-registry.json`
- `test/fixtures/runtime-registry/duplicate-registry.json`
- `test/fixtures/runtime-registry/wrong-schema.json`
- `test/fixtures/runtime-registry/malformed-registry.json`

## Oracles

- Source priority is deterministic.
- Registry entries normalize to target descriptors.
- Unsupported endpoint entries are visible but not contacted.
- Schema, duplicate, and parse failures produce structured obstruction facts.
- Secret-like metadata fields are omitted and named in redaction posture.

## Planned Cases

- Expand fixture coverage when #79 defines endpoint consent/auth posture.

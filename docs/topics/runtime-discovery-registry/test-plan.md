# Test Plan — Runtime Discovery Registry

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-RDR-1 | Empty environment selection emits the built-in witness registry deterministically. | `test/runtimeRegistry.spec.ts` | `loadRuntimeRegistryFromEnv({})` | source is `DEFAULT`; entries and descriptors are `jedit`, then `graft`. | covered |
| R-RDR-2 | Registry fixture parsing preserves supported connection entries and unsupported endpoint entries without ambient scans. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/mixed-registry.json` | entry count is stable and endpoint mode becomes descriptor-only `UNSUPPORTED`. | covered |
| R-RDR-3 | Env JSON has priority over env path. | `test/runtimeRegistry.spec.ts` | `WARP_TTD_RUNTIME_REGISTRY_JSON` plus `WARP_TTD_RUNTIME_REGISTRY_PATH` | source is `ENV_JSON` and path fixture is ignored. | covered |
| R-RDR-4 | Wrong schema versions produce structured obstruction records. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/wrong-schema.json` | reason code is `REGISTRY_SCHEMA_VERSION_UNSUPPORTED`; descriptor is obstructed. | covered |
| R-RDR-5 | Duplicate runtime IDs obstruct every duplicated entry deterministically. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/duplicate-registry.json` | all duplicated entries keep their ID and return `OBSTRUCTED`. | covered |
| R-RDR-6 | Malformed JSON and secret-like metadata or connection fields remain machine-readable and non-leaking. | `test/runtimeRegistry.spec.ts` | `test/fixtures/runtime-registry/malformed-registry.json`, mixed fixture metadata and connection | parse failures return `REGISTRY_JSON_PARSE_FAILED`; redacted values are absent from emitted output. | covered |
| R-RDR-7 | Runtime discovery composes registry entries with target inspection and runtime hello posture without authority, admission, mutation, or network scan. | `test/cliRuntimeDiscovery.spec.ts` | default registry with a temporary git-warp root and missing jedit root | output has one `ContinuumRuntimeDiscoveryInspection`; graft is `REACHABLE` with `RUNTIME_HELLO_PRESENT`; jedit is `ABSENT` with `LOCAL_ROOT_MISSING`; records carry `readOnly: true`. | covered |
| R-RDR-8 | Runtime discovery CLI covers the registry fixture matrix and preserves redaction. | `test/cliRuntimeDiscovery.spec.ts` | `test/fixtures/runtime-registry/mixed-registry.json`, `test/fixtures/runtime-registry/duplicate-registry.json`, `test/fixtures/runtime-registry/wrong-schema.json`, `test/fixtures/runtime-registry/malformed-registry.json` | endpoint entry is `UNSUPPORTED` with `ENDPOINT_CONSENT_NOT_DESIGNED`; obstruction fixtures emit `REGISTRY_DUPLICATE_ID`, `REGISTRY_SCHEMA_VERSION_UNSUPPORTED`, or `REGISTRY_JSON_PARSE_FAILED`; secret values and endpoint URLs are absent. | covered |
| R-RDR-9 | Runtime discovery MCP parity exposes the same read model as CLI discovery without relying on terminal or Markdown output. | `test/mcpAdmissionChainSurface.spec.ts::MCP runtime discovery inspection exposes the CLI-equivalent read model`, `test/mcpAdmissionChainSurface.spec.ts::MCP runtime discovery preserves registry obstruction and redaction posture` | default registry roots and env JSON registry with endpoint secret and obstructed entry | MCP structured content deep-equals `inspectRuntimeDiscovery`; reachable, absent, unsupported, and obstructed records keep machine-readable reasons; secret token and endpoint URL are absent. | covered |

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
- Secret-like metadata and connection fields are omitted and named in redaction posture.
- Runtime discovery postures are derived from registry, target, and runtime hello facts without changing host state.
- MCP runtime discovery projects the same read model as the CLI-backed runtime discovery surface.

## Planned Cases

- Expand fixture coverage when #79 defines endpoint consent/auth posture.

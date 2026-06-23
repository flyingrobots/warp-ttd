# Test Plan — Shared-Family Facts

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-SF-1 | Generated-family helpers preserve source/origin/scope metadata. | `test/generatedFamilyIngress.spec.ts` | Generated family fixtures and wrapper inputs. | Wrapped facts include source/origin/scope fields as expected. | covered |
| R-SF-2 | Session family facts are emitted as typed, posture-aware artifacts. | `test/liveEchoFamilyIntake.spec.ts` | Session ingress cases for present/absent/obstructed family facts. | Emitted facts always include posture and metadata channels. | covered |
| R-SF-3 | Malformed host-provided family facts do not break session assembly. | `test/liveEchoFamilyIntake.spec.ts`, `test/debuggerSession.spec.ts` | Malformed fact payloads and missing manifest values. | Host parsing failures surface posture, not hard crashes. | covered |
| R-SF-4 | Live echo intake surfaces descriptor and generated-manifest posture consistently. | `test/liveEchoAdapterProbe.spec.ts`, `test/liveEchoFamilyIntake.spec.ts` | Probe fixtures and manifest scenarios. | Probe and session outputs agree on posture and target roots. | covered |

## Fixtures

- `test/helpers/jsonTestUtils.ts`
- Manifest-like fixture constants in family fact tests.

## Oracles

- Fact wrappers contain stable metadata fields and provenance.
- Obstruction reasons exist where required.
- Local fallback is used only when host values are missing or invalid.

## Planned Cases

- none

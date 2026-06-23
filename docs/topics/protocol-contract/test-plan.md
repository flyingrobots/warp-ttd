# Test Plan — Protocol Contract

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-PC-1 | Authored GraphQL protocol file is present and complete. | `test/protocolContract.spec.ts`, `test/protocolPublicationBoundary.spec.ts` | Current schema and protocol test fixtures. | Schema parser finds required contract roots and enums. | covered |
| R-PC-2 | TypeScript protocol mirror remains compatible with authored schema. | `test/wesleyGeneratedProtocol.spec.ts` | Generated type mirror fixtures. | Generated types stay synchronized with schema definitions. | covered |
| R-PC-3 | Envelope shapes used by CLI/MCP/test fixtures stay stable for versioned types. | `test/cliJson.spec.ts`, `test/mcpAdmissionChainSurface.spec.ts` | Contracted envelopes and command fixtures. | Cross-surface payloads match schema-required fields and allowed values. | covered |
| R-PC-4 | Ontology and protocol terms match contract terms. | `test/ontologyDoctrine.spec.ts` | Glossary and doctrine fixtures. | Vocabulary references and mapped terms are consistent across docs/tests. | covered |

## Fixtures

- `schemas/warp-ttd-protocol.graphql`
- `src/protocol.ts`
- `src/generated/warp-ttd-protocol.wesley.generated.ts`
- Docs references (`README.md`, `schemas`, `docs/design/glossary.md`).

## Oracles

- Contract tests assert exact keys and union literals.
- Publication tests assert canonical file/README alignment.

## Planned Cases

- No planned cases; all contract requirements have executable evidence in current suite.

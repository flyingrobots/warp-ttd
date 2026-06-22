# Test Plan — Protocol Contract

## Scope

Requirements and executable evidence for protocol schema and shape contracts.

## Requirements

- **R-PC-1:** Authored GraphQL protocol file is present and complete.
- **R-PC-2:** TypeScript protocol mirror remains compatible with the authored schema.
- **R-PC-3:** Envelope shapes used by CLI/MCP/test fixtures stay stable for versioned types.
- **R-PC-4:** Ontology and protocol documentation terms match contract terms.

## Evidence

- C1 — `test/protocolContract.spec.ts`
  - Verifies `HostHello`, `LaneCatalog`, `PlaybackHeadSnapshot`, `PlaybackFrame`,
    `ReceiptSummary`, `EffectEmissionSummary` against expected shapes.
- C2 — `test/protocolPublicationBoundary.spec.ts`
  - Verifies authored schema existence, README/docs linkage, and parity checks between
    protocol schema and mirrored types.
- C3 — `test/wesleyGeneratedProtocol.spec.ts`
  - Verifies generated protocol artifacts stay in sync with schema intent.
- C4 — `test/ontologyDoctrine.spec.ts`
  - Guards domain vocabulary, doctrine alignment, and protocol terminology posture.

## Fixtures

- `schemas/warp-ttd-protocol.graphql`
- `src/protocol.ts`
- `src/generated/warp-ttd-protocol.wesley.generated.ts`
- Docs references (`README.md`, `schemas`, `docs/design/glossary.md`).

## Oracles

- Contract tests assert exact keys and union literals.
- Publication tests assert canonical file/README contract between schema and source.

## Planned Cases

- No planned cases; all contract requirements have executable evidence in current suite.


# Design Doc — Protocol Publication Boundary

**Cycle:** 0011-protocol-publication-boundary
**Legend:** PROTO
**Type:** design cycle

## Sponsor Human

Maintainer changing the host-neutral TTD protocol. Needs one boring answer to:
"where do I edit the contract, what does Wesley compile from it, what can Echo
or other consumers safely depend on, and what is still debugger-local policy?"

## Sponsor Agent

Agent inspecting protocol ownership. Needs to tell whether
`schemas/warp-ttd-protocol.graphql`, Wesley-generated artifacts,
`src/protocol.ts`, adapter code, or fixture values are authoritative without
guessing from repo habit.

## Hill

`warp-ttd` names a boring publication boundary for the host-neutral TTD
protocol: one authored schema, one Wesley compile path, one stable generated
artifact family for consumers, and an explicit list of local files that are not
peer authorities.

## Playback Questions

### Agent

1. Can the agent identify exactly one authored protocol source?
2. Can the agent name the Wesley-generated artifact family consumers should
   depend on?
3. Can the agent distinguish generated contract from local debugger or adapter
   policy?
4. Can the agent tell that `src/protocol.ts` follows the schema rather than
   owning it?

### User

1. If I need to change the cross-host protocol, do I start in
   `schemas/warp-ttd-protocol.graphql`?
2. If Echo or another consumer needs the protocol, is it clear what artifact
   family they should take from Wesley?
3. Is it clear which repo-local surfaces are convenience mirrors or policy
   layers rather than shared contract?

## Boundary Decision

### Authored source

The authored source of truth for the host-neutral TTD protocol is:

- `schemas/warp-ttd-protocol.graphql`

Changes to shared envelope shape, capability names, versioned protocol nouns,
and codec metadata start there.

### Wesley compile path

Wesley is the contract compiler for this schema. The current compile shape is
the `compile-ttd` path used against this SDL.

The contract family Wesley generates from this schema is:

- `manifest/schema.json`
- `manifest/contracts.json`
- `manifest/manifest.json`
- `manifest/ttd-ir.json`
- `typescript/types.ts`
- `typescript/zod.ts`
- `typescript/registry.ts`
- `typescript/index.ts`

These are the stable consumer-facing artifacts for Echo and other downstream
users of the host-neutral protocol.

### Current publication reality

`warp-ttd` does not currently vendor those generated files in-repo. So the
publication boundary is:

- authored source is committed here in `schemas/warp-ttd-protocol.graphql`
- consumer contract is the deterministic Wesley-generated manifest and
  TypeScript family derived from that schema
- repo-local handwritten mirrors must follow the schema until the generated
  surfaces are wired in directly

This keeps one authority even before vendoring is automated.

## Not Peer Authorities

These files are important, but they are not peer authorities for the shared
protocol contract:

- `src/protocol.ts`
  Local application-facing TypeScript mirror used by the debugger today
- `src/adapters/*`
  Host adapter behavior, fixture values, capability gating, and local
  translation
- `src/tui/*`
  Debugger UI behavior
- `test/*`
  Witness and regression coverage, not authored schema

If one of those surfaces disagrees with the schema, the schema wins and the
local consumer must be updated.

## Adapter And Debugger Policy Stay Local

The following stay outside Wesley's contract-compiler role:

- adapter wiring
- fixture-specific `schemaId` values
- TUI layout and navigation behavior
- debugger session state
- host-specific runtime richness that is not in the host-neutral protocol

Echo-specific or git-warp-specific richness must remain capability-gated or
adapter-local instead of silently redefining the shared base protocol.

## Current Rule

1. Change shared protocol nouns in `schemas/warp-ttd-protocol.graphql`.
2. Regenerate the Wesley artifact family from that schema.
3. Update local mirrors such as `src/protocol.ts` only as followers of the
   schema change.
4. Do not treat adapter code or fixture data as a second contract source.

## Non-Goals

- This cycle does not vendor the generated Wesley outputs into `warp-ttd`.
- This cycle does not replace `src/protocol.ts` with generated imports.
- This cycle does not define Echo runtime schema ownership.
- This cycle does not settle substrate receipt ownership for `git-warp`.

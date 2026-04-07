# Retrospective — Cycle 0011: Protocol Publication Boundary

**Outcome:** hill met

## What shipped

- **README Protocol section** — consumer-facing guidance: schema path,
  version, Wesley compile path, local mirror vs shared contract
  distinction
- **7 boundary tests** in `protocolPublicationBoundary.spec.ts`:
  single authored schema, self-identifying header, README discoverability
  (schema + version, Wesley path, local mirror distinction), mirror
  follower header, mirror↔schema type alignment
- Schema header already had source-of-truth comment and protocol version
- `src/protocol.ts` header already declared follower status

## Playback

### Agent

1. Can the agent identify exactly one authored protocol source? **Yes.**
   Sole `.graphql` in `schemas/`, header self-identifies.
2. Can the agent name the Wesley-generated artifact family consumers
   should depend on? **Yes.** README names `compile-ttd` and the schema
   file.
3. Can the agent distinguish generated contract from local debugger or
   adapter policy? **Yes.** README calls out `src/protocol.ts` as local
   mirror, not shared contract.
4. Can the agent tell that `src/protocol.ts` follows the schema rather
   than owning it? **Yes.** Header comment, plus test verifying every
   exported type has a schema counterpart.

### User

1. If I need to change the cross-host protocol, do I start in
   `schemas/warp-ttd-protocol.graphql`? **Yes.**
2. If Echo or another consumer needs the protocol, is it clear what
   artifact family they should take from Wesley? **Yes.** README
   Protocol section names the schema and Wesley compile path.
3. Is it clear which repo-local surfaces are convenience mirrors or
   policy layers rather than shared contract? **Yes.** README
   distinguishes local mirror from authored schema.

## Drift check

Initial tests checked the design doc for discoverability. User playback
revealed that consumers would not find boundary information buried in
`docs/design/`. Tests were repointed to the README, which is where
contributors and consumers actually land. The design doc retains the
full artifact family list and not-peer-authorities inventory for
reference, but the README is the authoritative consumer surface.

No scope creep. Non-goals preserved: no vendored Wesley outputs, no
replacement of `src/protocol.ts` with generated imports, no Echo runtime
schema ownership, no substrate receipt ownership.

## Tech debt

None introduced.

## Cool ideas

None logged.

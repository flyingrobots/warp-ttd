---
title: Neighborhood Protocol Shapes
status: proposed
---

# Design Doc — Neighborhood Protocol Shapes

**Cycle:** 0017-neighborhood-protocol-shapes
**Legend:** PROTO
**Type:** design cycle

## Sponsor Human

Debugger user inspecting one local site and asking:

- what is this site?
- what nearby alternatives exist?
- why did one fit and another fail?

This user needs a protocol surface that can power the neighborhood browser
without collapsing everything into:

- one receipt dump
- one opaque effect/event row
- or one host-specific explanation blob

## Sponsor Agent

Agent comparing Echo and `git-warp` at one local site. Needs a host-neutral
shape that separates:

- law-bearing neighborhood core
- reintegration-bearing seam detail
- optional explanatory shell

Without that split, the agent cannot tell whether:

- the hosts agree on the same core judgment
- one host simply explains more
- or the hosts genuinely disagree about local law

## Hill

Define the first protocol shapes for the local neighborhood browser:

1. **NeighborhoodCoreSummary**
   the minimal law-bearing site summary
2. **ReintegrationDetailSummary**
   seam anchors, obligations, and fit evidence summaries
3. **ReceiptShellSummary**
   optional explanatory refinement around the same site

The goal is not to finalize every field or implement every adapter now. The
goal is to give Echo and `git-warp` one honest contract target.

## Playback Questions

### Human

1. Can this shape power a local neighborhood browser without dumping a raw
   receipt first?
2. Can the browser distinguish "what the site is" from "why this one fit"?
3. Can extra explanation exist without changing the core meaning of the site?

### Agent

1. Can I compare two hosts on the same neighborhood core?
2. Can I request reintegration detail without requiring full receipt-shell
   support?
3. Can I tell when one host is missing explanation versus missing core truth?

## Current Problem

The current protocol has strong primitives:

- `PlaybackFrame`
- `ReceiptSummary`
- `EffectEmissionSummary`
- `DeliveryObservationSummary`
- `ExecutionContext`

But it still lacks one explicit local neighborhood object.

That means any future neighborhood browser would have to reconstruct its center
from a loose pile of:

- frame rows
- receipt summaries
- host-local conventions

That is too weak. We need one host-neutral site object.

## Design Decision

The first protocol cut should have three layers, matching the product and
Continuum witness work:

1. **Neighborhood core**
   law-bearing site identity and nearby alternatives
2. **Reintegration detail**
   seam structure explaining fit and failure
3. **Receipt shell**
   richer explanation, scheduling, and provenance refinement

These should be distinct types, not one oversized record with optional fields
for everything.

## 1. Neighborhood Core

The core shape should answer only:

- what site is this?
- which lanes participate?
- what is the current local outcome?
- what nearby alternatives are present?

That suggests the first summary types:

```graphql
enum NeighborhoodOutcome {
  LAWFUL
  OBSTRUCTED
  PENDING
}

type NeighborhoodAlternativeSummary {
  alternativeId: String!
  kind: String!
  outcome: NeighborhoodOutcome!
  summary: String!
}

type NeighborhoodCoreSummary {
  siteId: String!
  headId: String!
  frameIndex: Int!
  coordinate: Coordinate!
  primaryLaneId: String!
  primaryWorldlineId: String!
  participatingLaneIds: [String!]!
  outcome: NeighborhoodOutcome!
  alternatives: [NeighborhoodAlternativeSummary!]!
  summary: String!
}
```

### Why this shape

- `siteId`
  gives the browser and agent one stable local handle
- `coordinate`
  anchors the site causally
- `primaryLaneId` / `primaryWorldlineId`
  keep lane selection and worldline grouping explicit
- `participatingLaneIds`
  is the first practical cut of the `L` set from the witness math
- `outcome`
  gives the local verdict without forcing receipt-shell interpretation
- `alternatives`
  keeps nearby alternatives in the core instead of hiding them in rejected
  receipt prose

### What it deliberately does not include

- seam anchors
- seam obligations
- hidden evidence
- candidate search history
- blocking posets

Those belong in deeper layers.

## 2. Reintegration Detail

This is the first protocol surface that cashes out `R_core`.

It should answer:

- where does the site stitch back into the whole?
- what obligations bind there?
- what evidence summary explains fit or failure?

A first useful shape is:

```graphql
enum ObligationStatus {
  SATISFIED
  VIOLATED
  UNKNOWN
}

type SeamAnchorSummary {
  anchorId: String!
  kind: String!
  laneId: String
  worldlineId: String
  summary: String!
}

type CompatibilityObligationSummary {
  obligationId: String!
  kind: String!
  status: ObligationStatus!
  summary: String!
}

type CompatibilityEvidenceSummary {
  evidenceId: String!
  obligationId: String
  visibility: String!
  summary: String!
}

type ReintegrationDetailSummary {
  siteId: String!
  anchors: [SeamAnchorSummary!]!
  obligations: [CompatibilityObligationSummary!]!
  evidence: [CompatibilityEvidenceSummary!]!
  summary: String!
}
```

### Why this shape

- `siteId`
  ties reintegration detail back to the same neighborhood core
- `anchors`
  is the first protocol cut of `J`
- `obligations`
  is the first protocol cut of `K`
- `evidence`
  is the first protocol cut of `V`

### Why evidence is summary-only here

The full hidden evidence may be:

- large
- host-specific
- sensitive
- or not yet normalized across hosts

So the first protocol shape should publish:

- evidence handles
- obligation association
- visibility hint
- human/agent summary

not raw hidden values.

That keeps the shared contract honest while leaving room for richer host-local
inspection later.

## 3. Receipt Shell

This layer is optional refinement around the same `siteId`.

It should answer:

- what extra explanation exists around this site?

A first honest shape is:

```graphql
type ReceiptShellSummary {
  siteId: String!
  receiptIds: [String!]!
  candidateCount: Int!
  rejectedCount: Int!
  hasBlockingRelation: Boolean!
  summary: String!
}
```

This is intentionally thin at first.

It gives the browser and agent enough to know:

- there is richer explanation available
- which receipts participate
- whether the shell contains meaningful candidate/rejection structure

without forcing the whole blocking/search/explanation world into the minimal
shared cut immediately.

## Shape Relationships

The key doctrine is:

- `NeighborhoodCoreSummary`
  can exist without reintegration detail
- `ReintegrationDetailSummary`
  may be available only when the host can expose seam structure honestly
- `ReceiptShellSummary`
  is optional enrichment and must not redefine the core

That means capability gating will matter.

## Capability Direction

This cycle does not freeze capability names, but the direction is already
clear:

- one capability for neighborhood core
- one capability for reintegration detail
- one capability for receipt shell

That is better than one vague "counterfactual/provenance inspector" switch.

## Host Expectations

### `git-warp`

The likely first host to support:

- neighborhood core
- some receipt shell

Reintegration detail may start partial until the host can summarize seam
anchors and obligations cleanly.

### Echo

The likely first host to pressure-test:

- reintegration detail
- richer runtime-local fit explanation

because the hot runtime has stronger execution and admission structure.

### Shared rule

No host should fake reintegration detail just to satisfy the shape.

If a host only knows the core, it should publish the core honestly and leave
reintegration detail unavailable.

## TypeScript Mirror Direction

The eventual local mirror in `src/protocol.ts` should preserve the same split.

That means:

- separate interfaces/classes
- not one `NeighborhoodInfo` megatype
- no stringly "detailKind" switching if runtime-backed forms are warranted

For example:

```ts
type NeighborhoodOutcome = "LAWFUL" | "OBSTRUCTED" | "PENDING";

interface NeighborhoodCoreSummary { /* ... */ }
interface ReintegrationDetailSummary { /* ... */ }
interface ReceiptShellSummary { /* ... */ }
```

If these later become runtime-backed forms, the split still holds.

## Non-Goals

- Final schema IDs or registry IDs in this cycle
- Final adapter implementation
- Full provenance-chain protocol
- Full per-candidate diff transport
- Strand-fork control verbs
- Raw hidden evidence transport

## Expected Outputs

- one follow-up protocol slice to author the new types in
  `schemas/warp-ttd-protocol.graphql`
- one follow-up application slice to decide where the neighborhood browser
  lives relative to Worldline and Inspector
- one Echo alignment slice asking how much reintegration detail it can publish
  honestly on day one

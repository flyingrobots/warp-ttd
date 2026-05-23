---
title: Generated Family Consumption Boundary
status: landed
---

# Generated Family Consumption Boundary

**Cycle:** 0030-generated-family-consumption
**Legend:** PROTO
**Type:** implementation cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Generated Family Consumption Boundary](../../manual/004-generated-family-consumption.md)

## Sponsor Human

Maintainer trying to keep WARP TTD from turning Continuum and Echo proof-family
payloads into debugger-owned TypeScript folklore.

## Sponsor Agent

LLM agent inspecting session-family and live-target facts. Needs to know
whether a payload was consumed through generated shared-family artifacts or
through an explicit local mirror fallback.

## Hill

WARP TTD has one named boundary for consuming shared-family session payloads,
and that boundary truthfully reports that generated Continuum family artifacts
are not checked in yet.

## Doctrine

- Continuum owns `NeighborhoodCoreSummary`, `ReintegrationDetailSummary`, and
  `ReceiptShellSummary`.
- WARP TTD may hydrate those payloads for debugger views, but the hydration
  boundary must stay explicit.
- `src/protocol.ts` must not grow new proof-family nouns just because WARP TTD
  needs to inspect them.
- Until generated Continuum family artifacts are available, hydration uses
  `consumerPosture: "LOCAL_MIRROR_FALLBACK"`.
- That fallback is a declared compatibility layer, not source-family ownership.

## Implementation Witness

This cycle landed:

- `src/app/sharedFamilyHydration.ts`
- `SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION`
- shared-family source lookup for session-family facts
- local mirror hydration functions moved out of the neighborhood assembler
- generated-family consumption posture exposed through live Echo intake

The implementation is intentionally honest: the repo does not yet contain the
generated Continuum proof-family TypeScript package, so it does not claim to be
using one.

## Playback Questions

1. Can an agent see whether WARP TTD is using generated family artifacts or a
   local mirror fallback?
2. Is the local mirror boundary named and inspectable?
3. Are session-family source refs still owned by `continuum`?
4. Does the neighborhood assembler depend on the boundary instead of carrying
   ad hoc hydration functions?
5. Does the cycle avoid expanding `src/protocol.ts` with upstream proof-family
   nouns?

## Non-Goals

- No generated Continuum package is invented inside WARP TTD.
- No full replacement of `src/protocol.ts`.
- No Echo runtime adapter.
- No authority issuance.
- No runtime admission.
- No host mutation.
- No strand creation.

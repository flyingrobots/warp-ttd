---
title: Host-Published Family Facts
status: landed
---

# Host-Published Family Facts

**Cycle:** 0028-host-published-family-facts
**Legend:** PROTO
**Type:** implementation cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Host-Published Family Facts](../../manual/002-host-published-family-facts.md)

This design packet records the cycle contract and implementation witness.

## Sponsor Human

Maintainer moving WARP TTD from local reconstruction toward live Echo and
Continuum publication. Needs a narrow adapter/session path before a full Echo
adapter imports shared-family facts.

## Sponsor Agent

LLM agent inspecting sessions through CLI JSON or MCP. Needs to know whether a
session summary came from host publication or local fallback derivation.

## Hill

WARP TTD can prefer host-published shared-family summary facts in
`DebuggerSession` while retaining explicit local fallback facts for adapters
that do not publish those summaries yet.

## Doctrine

- Host-published shared-family payloads remain owned by the publishing family.
- WARP TTD may materialize those payloads into debugger read models only through
  a source-family fact.
- Local fallback derivation remains legal only when labeled
  `origin: "LOCAL_FALLBACK"`.
- Matching host-published facts that fail hydration are host obstructions, not
  session-fatal errors; WARP TTD may keep the debugger usable by deriving the
  visible summary locally while recording `posture: "OBSTRUCTED"`.
- The adapter port is read-only and capability-gated by
  `READ_SESSION_FAMILY_FACTS`.
- No host-published fact path may issue authority, construct a presentation,
  admit runtime invocations, mutate a host, or create strands.

## First Fields

The first session-family fields are Continuum-owned summary layers:

| Field | Family | Artifact |
| :--- | :--- | :--- |
| `neighborhoodCore` | `continuum` | `NeighborhoodCoreSummary` |
| `reintegrationDetail` | `continuum` | `ReintegrationDetailSummary` |
| `receiptShell` | `continuum` | `ReceiptShellSummary` |

These fields are enough to prove precedence without building the full Echo
adapter. Admission-chain facts remain a separate read model.

## Implementation Witness

This cycle landed:

- protocol v0.7.0 with `READ_SESSION_FAMILY_FACTS`
- `TtdHostAdapter.sessionFamilyFacts(headId, frameIndex?)`
- `src/app/sessionFamilyFacts.ts` for session-level generated-family facts
- `DebuggerSession.snapshot.sessionFamilyFacts`
- host-published Continuum summary facts in `EchoFixtureAdapter`
- local fallback session-family facts when adapter capability is absent
- obstructed host facts plus local summary derivation when a matching
  host-published payload cannot be hydrated
- CLI JSON visibility through `SerializedSession.snapshot.sessionFamilyFacts`

The implementation leaves git-warp and scenario fixtures on fallback. It does
not change adapter control behavior.

## Playback Questions

1. Can an agent tell whether a session summary came from host publication or
   local fallback?
2. Does `DebuggerSession` avoid calling `sessionFamilyFacts` when
   `READ_SESSION_FAMILY_FACTS` is absent?
3. Can the Echo fixture publish Continuum-owned summary facts without WARP TTD
   claiming to own Continuum semantics?
4. Do existing adapters keep working with local fallback derivation?
5. Does the path remain read-only?
6. Does the cycle avoid grants, presentations, runtime admission, host mutation,
   and strand creation?

## Non-Goals

- No full Echo host adapter.
- No real `jedit` attachment.
- No replacement of `src/protocol.ts`.
- No new Continuum or Echo schema authored in WARP TTD.
- No admission-chain host publication cutover.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

## Repo Evidence

- `docs/manual/002-host-published-family-facts.md`
- `schemas/warp-ttd-protocol.graphql`
- `src/generated/warp-ttd-protocol.wesley.generated.ts`
- `src/protocol.ts`
- `src/adapter.ts`
- `src/app/sessionFamilyFacts.ts`
- `src/app/debuggerSession.ts`
- `src/app/neighborhoodAssembler.ts`
- `src/adapters/echoFixtureAdapter.ts`
- `test/debuggerSession.spec.ts`
- `test/neighborhoodAssembler.spec.ts`
- `test/echoFixtureAdapter.spec.ts`
- `test/cliJson.spec.ts`

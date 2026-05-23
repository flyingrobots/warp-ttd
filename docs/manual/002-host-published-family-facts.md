# Host-Published Family Facts

Source design cycle:
[0028-host-published-family-facts](../design/0028-host-published-family-facts/host-published-family-facts.md)

## Reader Contract

This chapter explains how WARP TTD chooses between host-published
shared-family facts and local debugger fallback summaries.

The short rule is:

> If a host publishes a shared-family summary fact, WARP TTD may use that
> payload as the session summary. If the host does not publish it, WARP TTD may
> derive a local fallback summary, but the source fact must say
> `origin: "LOCAL_FALLBACK"`.

## Why This Exists

The generated-family ingress seam made source-family posture explicit. The next
problem is precedence. A session can now have two possible sources for the same
operator-facing summary:

- a host-published Continuum, Echo, authority, or git-warp family payload
- a debugger-local fallback derived from frames, receipts, and emissions

Both are useful, but they are not equivalent. Host-published facts carry the
source family's own posture. Local fallback facts are debugger projections that
keep the UI and agent surfaces useful while live hosts catch up.

## Port Rule

Host-published session facts enter through `TtdHostAdapter.sessionFamilyFacts`.
The method is read-only and capability-gated by `READ_SESSION_FAMILY_FACTS`.

The first supported fields are:

| Field | Source family | Artifact |
| :--- | :--- | :--- |
| `neighborhoodCore` | `continuum` | `NeighborhoodCoreSummary` |
| `reintegrationDetail` | `continuum` | `ReintegrationDetailSummary` |
| `receiptShell` | `continuum` | `ReceiptShellSummary` |

Adapters that do not declare `READ_SESSION_FAMILY_FACTS` are not called for
these facts. `DebuggerSession` derives local fallback summaries instead.

## Session Rule

`DebuggerSession.snapshot.sessionFamilyFacts` records the source posture for
the session's neighborhood, reintegration, and receipt-shell summaries.

For each supported field:

- `posture: "PRESENT"` with `origin: "HOST_PUBLISHED"` means the host supplied
  the payload used by the session summary
- `posture: "OBSTRUCTED"` with `origin: "HOST_PUBLISHED"` means a matching host
  payload existed but could not be hydrated, so WARP TTD used a local fallback
  summary and recorded the host obstruction
- `origin: "LOCAL_FALLBACK"` means WARP TTD derived the summary locally from
  protocol facts because no usable host payload was selected
- missing adapter capability means local fallback, not inferred host truth

The summary objects remain the same debugger read models. The source-family
facts explain where those objects came from.

## First Landed Cut

Cycle 0028 landed the first host-published path:

- protocol v0.7.0 adds `READ_SESSION_FAMILY_FACTS`
- `src/app/sessionFamilyFacts.ts` defines session-level source-family facts
- `EchoFixtureAdapter` publishes Continuum-owned neighborhood, reintegration,
  and receipt-shell facts
- `DebuggerSession` prefers host-published payloads when the capability is
  present
- malformed host-published payloads do not crash session construction; they are
  recorded as obstructed host facts while WARP TTD derives the visible summary
  locally
- adapters without the capability continue using local fallback derivation
- `SerializedSession.snapshot.sessionFamilyFacts` exposes the result to CLI JSON
  and future MCP/TUI surfaces

## Fallback Discipline

Fallback stays legal because it keeps the debugger useful for fixtures,
git-warp, and partially implemented live hosts. Fallback must stay visible
because agents and operators must not mistake local reconstruction for native
Continuum or Echo publication.

Do not add a new host-published summary unless it answers:

1. Which family owns the payload?
2. Which adapter capability gates the read?
3. What field in `sessionFamilyFacts` records the source?
4. What local fallback remains available when the host cannot publish it?
5. Can CLI JSON or MCP expose the same source fact without TUI parsing?

## Non-Goals

- No full Echo host adapter.
- No generated protocol authority cutover.
- No new Continuum or Echo schema authored in WARP TTD.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

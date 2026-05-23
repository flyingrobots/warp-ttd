---
title: Live Echo Family Intake
status: landed
---

# Live Echo Family Intake

**Cycle:** 0029-live-echo-family-intake
**Legend:** PROTO
**Type:** implementation cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Live Echo Family Intake](../../manual/003-live-echo-family-intake.md)

## Sponsor Human

Maintainer moving from Echo fixture publication toward a live `jedit` target.
Needs a narrow intake contract before a full Echo runtime adapter can open
sessions.

## Sponsor Agent

LLM agent inspecting `targets --json`, MCP live-target posture, or
`target-session --json`. Needs to distinguish a visible live Echo publication
surface from a missing runtime adapter.

## Hill

WARP TTD can report read-only live Echo session-family intake posture for
`jedit` without claiming that a full Echo adapter, runtime admission, or native
Continuum witness is available.

## Contract

The first live Echo intake surface is a read-only manifest:

`<jedit root>/.warp-ttd/live-echo-family-facts.json`

The manifest is deliberately small:

```json
{
  "schemaVersion": "warp-ttd.live-echo-family-intake.v1",
  "publishedFields": [
    "neighborhoodCore",
    "reintegrationDetail",
    "receiptShell"
  ]
}
```

It is a smoke contract, not an adapter. It reports which Continuum
session-family fields the live Echo side can publish. The actual session
payload path remains `TtdHostAdapter.sessionFamilyFacts`.

## Posture Rules

- Missing `jedit` root produces `intakePosture: "UNAVAILABLE"`.
- Missing manifest under a present root also produces
  `intakePosture: "UNAVAILABLE"`.
- A malformed manifest produces `intakePosture: "OBSTRUCTED"` and obstructed
  source-family facts.
- A valid manifest with one or more published fields produces
  `intakePosture: "PRESENT"` for the intake surface.
- Published fields become `HOST_PUBLISHED` target-scope source-family facts.
- Unlisted fields stay `ABSENT` with `origin: "UNAVAILABLE"`.

## Implementation Witness

This cycle landed:

- `src/app/liveEchoFamilyIntake.ts`
- `LiveTargetInspection.sessionFamilyIntake` for `jedit`
- jedit obstruction in `target-session --json`
- MCP live-target parity through the existing live-target inspection tool
- tests for missing, present, and malformed live Echo intake manifests

## Playback Questions

1. Can an agent see that `jedit` has no live Echo adapter yet?
2. Can an agent still inspect the live Echo family intake posture?
3. Does a missing root stay unavailable instead of becoming inferred truth?
4. Does a malformed manifest become obstruction rather than a crash?
5. Does the target surface remain read-only?

## Non-Goals

- No full Echo runtime adapter.
- No Echo session open.
- No editor-domain semantics.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

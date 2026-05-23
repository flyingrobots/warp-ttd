---
title: Jedit Echo Smoke
status: landed
---

# Jedit Echo Smoke

**Cycle:** 0031-jedit-echo-smoke
**Legend:** DELIVERY
**Type:** implementation cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Jedit Echo Smoke](../../manual/005-jedit-echo-smoke.md)

## Sponsor Human

Operator preparing to point WARP TTD at `jedit` without waiting for the full
Echo adapter to land.

## Sponsor Agent

LLM agent checking live target posture. Needs `jedit` to appear in the same
structured live-target and target-session surfaces as `graft`, even when the
session is not openable yet.

## Hill

`target-session --json` reports a read-only `jedit` session inspection with
`sessionPosture: "OBSTRUCTED"` instead of omitting `jedit` or pretending a full
Echo session adapter exists.

## Surface

The smoke surface is:

```sh
npm run targets -- --json
npm run target-session -- --json
```

`targets --json` reports `jedit` and `graft`.

`target-session --json` now also reports `jedit`. For this slice, `jedit` is
always obstructed because WARP TTD cannot open a live Echo session yet. The
obstruction includes `sessionFamilyIntake`, so agents can still inspect live
Echo intake posture.

## Implementation Witness

This cycle landed:

- `LiveEchoTargetSessionInspection`
- `inspectLiveTargetSessions()` returning `jedit` and `graft`
- CLI JSON coverage for jedit target-session obstruction
- integration coverage preserving graft read-only session open
- MCP live-target coverage for the jedit family intake posture

## Playback Questions

1. Does `target-session --json` include `jedit`?
2. Does `jedit` remain read-only?
3. Does `jedit` report `adapterPosture: "UNAVAILABLE"`?
4. Does `jedit` report `sessionPosture: "OBSTRUCTED"`?
5. Does the obstruction still expose `sessionFamilyIntake`?
6. Does `graft` still open through the git-warp adapter when available?

## Non-Goals

- No real Echo session open.
- No browser attachment.
- No jedit editor operations.
- No grant issuance.
- No runtime admission.
- No host mutation.
- No strand creation.

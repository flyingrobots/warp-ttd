---
title: Live Target Debugging Smoke
status: active
---

# Live Target Debugging Smoke

**Cycle:** 0020-live-target-debugging-smoke
**Legend:** DELIVERY
**Type:** feature cycle

## Sponsor Human

Operator who wants WARP TTD to debug the two real application pressure points:
`jedit`, a live Echo app, and `graft`, a live git-warp app. Needs the debugger
to say what it can inspect now without pretending missing runtime facts exist.

## Sponsor Agent

Agent preparing the next adapter/protocol slice. Needs a deterministic command
that identifies live target roots, host posture, and missing admission-chain
facts before attempting heavier runtime attachment or UI work.

## Hill

WARP TTD exposes a read-only live-target smoke command:

```bash
npm run targets -- --json
```

The command reports one `LiveTargetInspection` JSONL envelope for `jedit` and
one for `graft`.

## First Implementation

The first slice is discovery only:

- `jedit`
  - host: Echo
  - default root: `../jedit`
  - adapter posture: `UNAVAILABLE`
  - admission-chain posture: `UNAVAILABLE`
- `graft`
  - host: git-warp
  - default root: `../graft`
  - adapter posture: `CONFIGURED`
  - graph name: `graft-ast`
  - admission-chain posture: `UNAVAILABLE`

Both roots can be overridden with `WARP_TTD_JEDIT_ROOT` and
`WARP_TTD_GRAFT_ROOT`.

## Non-Goals

- No runtime attachment in this slice.
- No Echo admission.
- No grant issuance or capability presentation.
- No strand creation.
- No app-domain semantics imported into WARP TTD.
- No TUI panel.

## Playback Questions

1. Can an agent run one JSON command and see both live target names?
2. Can the command distinguish root presence from adapter readiness?
3. Does `jedit` honestly report that the Echo live adapter is not wired yet?
4. Does `graft` advertise the existing git-warp adapter path and `graft-ast`
   graph name?
5. Does the output avoid claiming admission-chain facts for git-warp targets?
6. Does the output distinguish translated substrate evidence from native
   Continuum witnesshood?

## Follow-On Work

- Use the configured `graft` target to open a real git-warp session and emit
  session/worldline/receipt facts.
- Add the admission-chain read model before attempting a real `jedit` Echo
  adapter.
- Teach MCP to expose the same live-target smoke posture. Cycle 0021 adds that
  surface with runtime-boundary evidence posture.

# Jedit Echo Smoke

Source design cycle:
[0031-jedit-echo-smoke](../design/0031-jedit-echo-smoke/jedit-echo-smoke.md)

## Reader Contract

`jedit` is now present in the target-session smoke surface.

The rule is:

> `target-session --json` must report `jedit` honestly, even before WARP TTD can
> open a live Echo session.

## What Agents See

Run:

```sh
npm run target-session -- --json
```

The command emits a `LiveTargetSessionInspection` for `jedit` with:

- `target: "jedit"`
- `hostKind: "ECHO"`
- `readOnly: true`
- `adapterPosture: "UNAVAILABLE"`
- `sessionPosture: "OBSTRUCTED"`
- `sessionFamilyIntake`

That is the correct smoke posture. WARP TTD can inspect live Echo family intake
metadata, but it cannot yet open the Echo runtime session.

## Why This Exists

Before this slice, `target-session --json` could open or obstruct `graft`, but
`jedit` had no parallel session smoke output. That made the dual-live target
story asymmetric for agents.

Now both targets appear in the session smoke path:

- `jedit` reports an obstructed Echo session plus intake posture
- `graft` still opens through the git-warp adapter when its root is present

## Safety Boundaries

- No browser attachment.
- No Echo session open.
- No jedit editor operations.
- No grant issuance.
- No runtime admission.
- No host mutation.
- No strand creation.

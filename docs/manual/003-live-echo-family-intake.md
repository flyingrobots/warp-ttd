# Live Echo Family Intake

Source design cycle:
[0029-live-echo-family-intake](../design/0029-live-echo-family-intake/live-echo-family-intake.md)

## Reader Contract

WARP TTD can inspect live Echo family-intake posture for `jedit` before it can
open a full Echo runtime session.

The rule is:

> `jedit` family intake is read-only evidence posture. It does not mean the Echo
> adapter is configured, a session is open, native Continuum witnesshood exists,
> or an invocation has been admitted.

## Manifest Rule

The first live Echo intake path is a root-local manifest:

`<jedit root>/.warp-ttd/live-echo-family-facts.json`

The manifest declares which session-family fields the live Echo side can
publish:

- `neighborhoodCore`
- `reintegrationDetail`
- `receiptShell`

`targets --json` exposes this as `LiveTargetInspection.sessionFamilyIntake`.
`target-session --json` exposes the same object on the obstructed jedit session
inspection.

## Postures

- `intakePosture: "UNAVAILABLE"` means the root or manifest is absent.
- `intakePosture: "PRESENT"` means the manifest was read and names at least one
  published field.
- `intakePosture: "OBSTRUCTED"` means the manifest exists but cannot be used.

Each field also has a source-family fact:

- published fields are `posture: "PRESENT"` with `origin: "HOST_PUBLISHED"`
- unlisted fields are `posture: "ABSENT"` with `origin: "UNAVAILABLE"`
- malformed manifests produce `posture: "OBSTRUCTED"` with
  `origin: "HOST_PUBLISHED"`

## Why This Is Not An Adapter

The manifest is a smoke contract. It lets agents and operators verify that
`jedit` can expose live Echo family posture without letting WARP TTD pretend it
can open a runtime session.

The actual session payload path remains `TtdHostAdapter.sessionFamilyFacts`.

## Safety Boundaries

- No Echo session open.
- No editor-domain semantics.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

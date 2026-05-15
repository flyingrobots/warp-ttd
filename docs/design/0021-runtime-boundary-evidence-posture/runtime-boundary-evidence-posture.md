---
title: Runtime Boundary Evidence Posture
status: active
---

# Runtime Boundary Evidence Posture

**Cycle:** 0021-runtime-boundary-evidence-posture
**Legend:** DELIVERY
**Type:** feature cycle

## Sponsor Human

Operator aligning WARP TTD with Continuum's runtime-boundary evidence status.
Needs the debugger to distinguish live adapter support from actual Continuum
evidence.

## Sponsor Agent

Agent consuming `targets --json` or MCP tools before attaching to a live app.
Needs machine-readable target facts that do not infer native witnesshood from
adapter configuration.

## Hill

WARP TTD reports runtime-boundary evidence posture for each live target through
the CLI and MCP:

```ts
runtimeBoundaryEvidence: {
  posture: "UNAVAILABLE" | "TRANSLATED_SUBSTRATE" | "CONTINUUM_NATIVE";
  nativeContinuumWitness: boolean;
  substrate?: string;
  evidenceKind?: string;
}
```

## Doctrine

- Adapter configured does not mean Continuum evidence is available.
- Translated substrate evidence is not native Continuum witnesshood.
- Unknown evidence posture must not be upgraded by inference.
- No target may report `CONTINUUM_NATIVE` unless `nativeContinuumWitness` is
  true.

## First Implementation

- `jedit`
  - runtime-boundary evidence posture: `UNAVAILABLE`
  - native Continuum witness: `false`
- `graft`
  - runtime-boundary evidence posture: `TRANSLATED_SUBSTRATE`
  - substrate: `git-warp`
  - evidence kind: `warp-index`
  - native Continuum witness: `false`

The MCP surface exposes the same facts through
`warp_ttd.inspect_live_targets`.

## Non-Goals

- No runtime attachment.
- No native Continuum evidence synthesis.
- No Echo admission.
- No grant issuance or capability presentation.
- No strand creation.
- No mutation path.

## Playback Questions

1. Does `targets --json` report `graft` as translated substrate evidence?
2. Does `targets --json` report `jedit` evidence posture as unavailable?
3. Does every non-native target report `nativeContinuumWitness: false`?
4. Does MCP expose the same live-target evidence posture as the CLI?
5. Does the MCP tool remain read-only and avoid control, grant, admission, or
   mutation names?

## Follow-On Work

- Replace `graft` static translated-substrate posture with facts read from the
  live git-warp target.
- Mark `jedit` as native only after Echo/jedit emits actual
  `ContinuumNativeEvidence`.
- Add a reading-envelope inspector after runtime-boundary evidence posture is
  stable across CLI and MCP.

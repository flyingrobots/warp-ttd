# Generated Family Consumption Boundary

Source design cycle:
[0030-generated-family-consumption](../design/0030-generated-family-consumption/generated-family-consumption.md)

## Reader Contract

WARP TTD consumes shared-family payloads through a named hydration boundary.
That boundary must say whether generated family artifacts are being used or
whether WARP TTD is using a local debugger mirror.

The rule is:

> Local hydration is allowed only when the source-family posture remains visible
> and the consumer reports `LOCAL_MIRROR_FALLBACK`.

## Current State

The repo now has `src/app/sharedFamilyHydration.ts`.

That module owns:

- session-family source refs for Continuum summary artifacts
- local mirror hydration for `NeighborhoodCoreSummary`
- local mirror hydration for `ReintegrationDetailSummary`
- local mirror hydration for `ReceiptShellSummary`
- `inspectSharedFamilyConsumption()`

The current consumer posture is:

`consumerPosture: "LOCAL_MIRROR_FALLBACK"`

This is truthful because generated Continuum proof-family TypeScript artifacts
are not checked into WARP TTD yet.

## Ownership Rule

Continuum owns the summary artifact families:

| Field | Owner | Artifact |
| :--- | :--- | :--- |
| `neighborhoodCore` | `continuum` | `NeighborhoodCoreSummary` |
| `reintegrationDetail` | `continuum` | `ReintegrationDetailSummary` |
| `receiptShell` | `continuum` | `ReceiptShellSummary` |

WARP TTD owns debugger projection, fallback hydration, posture wrapping, and
inspection surfaces. It does not become the source-family owner.

## Future Cutover

When generated Continuum family artifacts are available, this boundary is where
the cutover should happen. The rest of the debugger should not learn a second
ad hoc payload path.

Do not extend `src/protocol.ts` with shared proof-family nouns just to make the
debugger convenient. Add generated family consumption here instead.

## Safety Boundaries

- No generated Continuum package invented in WARP TTD.
- No full replacement of `src/protocol.ts` in this slice.
- No Echo runtime adapter.
- No authority issuance.
- No runtime admission.
- No host mutation.
- No strand creation.

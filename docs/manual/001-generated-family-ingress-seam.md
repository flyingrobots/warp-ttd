# Generated Family Ingress Seam

Source design cycle:
[0027-generated-family-ingress-seam](../design/0027-generated-family-ingress-seam/generated-family-ingress-seam.md)

## Reader Contract

This chapter explains how generated shared-family artifacts enter WARP TTD
without replacing the debugger's native investigation model or smuggling
host-specific semantics into host-neutral protocol surfaces.

The short rule is:

> Generated shared-family artifacts enter through a narrow ingress seam. WARP
> TTD wraps them with debugger posture, links them to session coordinates, and
> keeps fallback local summaries explicit until a host publishes native facts.

## Why This Exists

WARP TTD now has three boundary decisions in place:

- the host-neutral TTD protocol starts in `schemas/warp-ttd-protocol.graphql`
  and is compiled by Wesley
- the debugger/shared-family boundary says WARP TTD owns investigation, not
  authority, admission, witnesses, or app semantics
- live targets pressure both sides of the boundary: `jedit` needs Echo and
  Continuum proof facts, while `graft` needs causal history and translated
  substrate evidence

The next risk is adding generated facts in the wrong place. If generated
families are imported directly into `DebuggerSession`, TUI models, or adapter
internals without a boundary, the repo recreates a different form of drift:
generated types are present, but their ownership and posture are still unclear.

The ingress seam prevents that drift.

## The Seam

The generated family ingress seam is an application-layer boundary with one
job: normalize generated shared-family payloads into debugger-readable facts.

It should receive:

- a generated payload or an explicit absence/obstruction result
- the producing family name
- the source schema or artifact identity when available
- host target identity
- coordinate or session scope
- evidence posture

It should return:

- a WARP TTD read-model fact
- a stable `posture`: `ABSENT`, `PRESENT`, or `OBSTRUCTED`
- source-family metadata
- optional generated payload carried as data, not re-authored as debugger truth
- links to receipts, witnesses, readings, or adapter facts when available

## Ownership Rule

Generated shared-family payloads remain owned by their source family:

| Family | Owner | WARP TTD handling |
| :--- | :--- | :--- |
| Host-neutral TTD protocol | WARP TTD schema plus Wesley generation | consume as debugger protocol authority |
| Continuum reading and evidence families | Continuum | wrap as shared-family projections |
| Echo admission and witness families | Echo and authority layers | inspect posture and payloads, never issue or admit |
| git-warp causal substrate facts | git-warp adapter | translate into debugger summaries with substrate posture |
| Debugger session summaries | WARP TTD | author locally and version as debugger facts |

Do not copy generated family payload shapes into `src/protocol.ts` as a second
authority. `src/protocol.ts` may keep local wrappers while the full generated
cutover is incomplete, but the source-family payload must remain identifiable
as generated or absent.

## First Ingress Shape

The first implementation should be data-only. It does not need to replace
existing protocol types yet.

```ts
type GeneratedFamilyPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";
type GeneratedFamilyOrigin =
  | "GENERATED_PAYLOAD"
  | "HOST_PUBLISHED"
  | "TRANSLATED_SUBSTRATE"
  | "LOCAL_FALLBACK"
  | "UNAVAILABLE";

type GeneratedFamilyRef = {
  family: "warp-ttd-protocol" | "continuum" | "echo" | "authority" | "git-warp";
  artifact?: string;
  schemaVersion?: string;
};

type GeneratedFamilyFact<TPayload> = {
  posture: GeneratedFamilyPosture;
  source: GeneratedFamilyRef;
  origin: GeneratedFamilyOrigin;
  scope: "SESSION" | "COORDINATE" | "TARGET";
  target?: string;
  payload?: TPayload;
  reason?: string;
};
```

This shape is intentionally a seam, not a new domain model. It allows adapter
and app code to say:

- the generated payload is present
- the generated payload is absent because the host does not publish it yet
- the generated payload is obstructed because a source artifact or runtime read
  failed

## Landed Implementation

Cycle 0027 landed the seam as `src/app/generatedFamilyIngress.ts`. The module is
data-only: it builds generated-family refs and present, absent, or obstructed
facts with explicit source family, origin, scope, optional target, optional
payload, and reason metadata.

The first consumer is the admission-chain read model. `AdmissionChainReadModel`
now carries:

- `sourceFamilyFacts`: canonical source-family posture facts in admission-chain
  order
- `facts[].sourceFamily`: the same source-family fact nested beside each
  debugger admission fact

The first exposed surfaces are still read-only:

- `warp-ttd admission-chain --json`
- MCP `warp_ttd.inspect_admission_chain`

Fixture-derived basis, receipt, and reading facts are marked
`origin: "LOCAL_FALLBACK"`. Echo and authority facts that are not host-published
yet are marked `origin: "UNAVAILABLE"` and `posture: "ABSENT"`. This makes the
debugger's local summary useful without implying that Continuum, Echo, or an
authority layer already published native facts.

## First Consumers

The first useful consumers are read-only:

- admission-chain facts that are waiting for Echo-published payloads
- live target evidence facts that need to distinguish generated native evidence
  from translated substrate evidence
- neighborhood, reintegration, and receipt-shell facts that should eventually
  come from Echo/Continuum publication before WARP TTD falls back to local
  derivation

The seam should not add TUI-only payloads. CLI JSON and MCP should be able to
inspect the same posture and source-family facts.

## Fallback Discipline

Fallback local derivation stays legal, but it must be visible.

For example, WARP TTD may continue deriving `NeighborhoodCoreSummary` from
frames, receipts, and emissions for fixtures and git-warp. Once Echo publishes
native neighborhood facts, the read model should state whether the fact came
from:

- generated host publication
- translated substrate evidence
- local debugger fallback derivation
- absence
- obstruction

This prevents a locally derived summary from being mistaken for a native
Continuum or Echo proof-family payload.

## Non-Goals

- No full generated protocol authority cutover in the first ingress slice.
- No replacement of `src/protocol.ts` yet.
- No new Continuum or Echo schema authored in WARP TTD.
- No Echo host adapter implementation in the seam slice.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

## Implementation Order

1. Add a tiny generated-family ingress module with posture and source-family
   metadata.
2. Add tests proving present, absent, and obstructed generated-family facts are
   distinguishable.
3. Thread the seam into one read model without changing adapter behavior.
4. Add CLI/MCP visibility only after the app-layer fact shape is stable.
5. Use the seam to guide Echo/jedit adapter work when generated family payloads
   become available.

## What To Check Before Adding A New Generated Payload

Ask these questions before adding a field or type:

1. Which family owns this payload?
2. Is the payload generated, host-published, translated, locally derived, absent,
   or obstructed?
3. What coordinate, target, or session scope does it belong to?
4. Does WARP TTD need the full payload now, or only a posture and reference?
5. Would adding this to `src/protocol.ts` create a second authority?
6. Can an agent inspect the same fact through CLI JSON or MCP?
7. Does this accidentally issue authority, perform admission, mutate host state,
   or create a strand?

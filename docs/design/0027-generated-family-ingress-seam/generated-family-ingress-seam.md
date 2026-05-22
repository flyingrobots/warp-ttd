---
title: Generated Family Ingress Seam
status: proposed
---

# Generated Family Ingress Seam

**Cycle:** 0027-generated-family-ingress-seam
**Legend:** PROTO
**Type:** design-first feature cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Generated Family Ingress Seam](../../manual/001-generated-family-ingress-seam.md)

The manual is now the compiled reading path for design cycles moving forward.
This design packet remains the cycle contract and verification record.

## Sponsor Human

Maintainer moving WARP TTD from handwritten local protocol mirrors toward
generated shared-family consumption. Needs a narrow seam before adapter,
DebuggerSession, CLI, MCP, or TUI code start importing generated payloads
directly.

## Sponsor Agent

LLM agent consuming WARP TTD facts through CLI JSON or MCP. Needs generated
family facts to carry source, scope, and posture so the agent can distinguish
native publication from translated substrate evidence, local fallback
derivation, absence, and obstruction.

## Hill

WARP TTD defines a generated-family ingress seam that can carry a generated or
host-published payload as `PRESENT`, `ABSENT`, or `OBSTRUCTED` without turning
that payload into debugger-owned semantic authority.

## Doctrine

- Generated shared-family payloads remain owned by their source family.
- WARP TTD owns posture, coordinate/session scope, source metadata, and
  debugger summaries around those payloads.
- Absence and obstruction are first-class outcomes.
- Local fallback derivation remains allowed only when labeled as fallback.
- New payloads must not be added to `src/protocol.ts` as peer authority when
  they belong to Continuum, Echo, authority, admission, witness, or reading
  families.
- No ingress path may issue grants, construct `CapabilityPresentation`, perform
  runtime admission, mutate host state, or create strands.

## First Shape

The first implementation should be a small app-layer read-model helper, not a
generated artifact replacement.

```ts
type GeneratedFamilyPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";

type GeneratedFamilyRef = {
  family: "warp-ttd-protocol" | "continuum" | "echo" | "authority" | "git-warp";
  artifact?: string;
  schemaVersion?: string;
};

type GeneratedFamilyFact<TPayload> = {
  posture: GeneratedFamilyPosture;
  source: GeneratedFamilyRef;
  scope: "SESSION" | "COORDINATE" | "TARGET";
  target?: string;
  payload?: TPayload;
  reason?: string;
};
```

This gives WARP TTD one place to normalize source-family facts before they reach
admission-chain read models, live target evidence facts, CLI JSON, MCP tools,
or future TUI views.

## First Implementation

1. Add an app-layer generated-family ingress module.
2. Test present, absent, and obstructed generated-family facts.
3. Thread the seam into one existing read model without changing adapter
   behavior.
4. Keep generated payload identity visible in structured outputs when exposed.
5. Leave full generated protocol authority cutover for a later cycle.

## Playback Questions

1. Can a generated-family fact state `PRESENT`, `ABSENT`, or `OBSTRUCTED`
   without losing source-family metadata?
2. Can WARP TTD distinguish generated host publication from local fallback
   derivation?
3. Can the seam carry Continuum, Echo, authority, git-warp, and WARP TTD
   protocol family refs without claiming to own all payloads?
4. Can admission-chain work consume the seam without adding shared-family
   payload authority to `src/protocol.ts`?
5. Can CLI/MCP surfaces later expose the same source and posture facts without
   TUI-only interpretation?
6. Does the seam preserve the no-grants, no-admission, no-mutation, no-strands
   boundary?

## Non-Goals

- No full generated protocol authority cutover.
- No replacement of `src/protocol.ts`.
- No new Continuum or Echo schema authored in WARP TTD.
- No Echo host adapter implementation.
- No TUI panel.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

## Repo Evidence

- `MANUAL.md`
- `docs/manual/001-generated-family-ingress-seam.md`
- `docs/design/0026-debugger-native-shared-family-boundary/debugger-native-shared-family-boundary.md`
- `docs/method/backlog/up-next/PROTO_generated-protocol-authority-cutover.md`
- `docs/method/backlog/up-next/PROTO_wesley-generated-echo-family-consumption.md`
- `src/protocol.ts`
- `src/generated/warp-ttd-protocol.wesley.generated.ts`

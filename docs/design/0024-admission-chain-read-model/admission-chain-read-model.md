---
title: Admission-Chain Read Model
status: active
---

# Admission-Chain Read Model

**Cycle:** 0024-admission-chain-read-model
**Legend:** PROTO
**Type:** feature cycle

## Sponsor Human

Operator debugging `jedit`, a live Echo app, and `graft`, a live git-warp app.
Needs WARP TTD to show lawful invocation facts without collapsing compiler
claims, authority, runtime admission, witnesses, receipts, and readings.

## Sponsor Agent

LLM agent using MCP as the primary debugger surface. Needs a deterministic,
versioned, ordered read model that states which admission-chain facts are
present, absent, or obstructed before any TUI-specific rendering exists.

## Hill

WARP TTD exposes a versioned admission-chain read model:

```ts
{
  schemaVersion: "warp-ttd.admission-chain.v1";
  facts: AdmissionChainFact[];
  basis: AdmissionFact;
  artifactRegistration: AdmissionFact;
  opticArtifactHandle: AdmissionFact;
  opticAdmissionRequirements: AdmissionFact;
  capabilityGrant: AdmissionFact;
  capabilityPresentation: AdmissionFact;
  admissionTicket: AdmissionFact;
  lawWitness: AdmissionFact;
  receipts: AdmissionFact;
  reading: AdmissionFact;
}
```

The `facts` list is canonical order for agents and renderers. The named fields
remain compatibility affordances and direct lookup handles.

Future Echo WAL-backed durability adds another evidence dimension to this
chain: causal commit evidence. WARP TTD should inspect Echo-projected commit
anchors and recovery posture when Echo exposes them, but it must not parse WAL
segments or become a second Echo recovery engine.

## Canonical Fact Order

1. `basis`
2. `artifactRegistration`
3. `opticArtifactHandle`
4. `opticAdmissionRequirements`
5. `capabilityGrant`
6. `capabilityPresentation`
7. `admissionTicket`
8. `lawWitness`
9. `receipts`
10. `reading`

Future `causalCommitEvidence` / `recoveryEvidence` belongs between
`lawWitness` and `receipts` once Echo exposes it. It is not in the current
read model. The extension is tracked by
[`0042-echo-causal-commit-evidence-read-model`](../0042-echo-causal-commit-evidence-read-model/echo-causal-commit-evidence-read-model.md).

## Doctrine

- The read model inspects facts; it does not compile artifacts.
- The read model reports authority posture; it does not issue
  `CapabilityGrant` or `CapabilityPresentation` objects.
- The read model reports admission posture; it does not perform Echo admission.
- The read model reports witnesses, receipts, and readings as evidence posture.
- The future read model reports durability posture as adapter-provided evidence,
  not as raw WAL ownership.
- Missing host facts are explicit `ABSENT` posture, not inferred truth.
- `OpticArtifactHandle` remains a runtime registration handle, not authority.

## First Implementation

The initial slice is intentionally conservative:

- Add `src/app/admissionChainReadModel.ts`.
- Give MCP `warp_ttd.inspect_admission_chain` and CLI
  `admission-chain --json` a `schemaVersion:
  "warp-ttd.admission-chain.v1"` field.
- Add a canonical ordered `facts` array for agents.
- Preserve existing named fields for compatibility.
- Keep Echo-specific artifact, handle, grant, ticket, and witness facts
  `ABSENT` until live Echo/jedit adapters expose them.
- Keep receipts and current reading posture `PRESENT` when the session snapshot
  provides them.

## Non-Goals

- No grant issuance.
- No `CapabilityPresentation` construction.
- No Echo runtime admission.
- No artifact compilation.
- No strand creation.
- No TUI panel in this slice.

## Playback Questions

1. Does MCP expose the admission-chain read model with a versioned schema name?
2. Does CLI `admission-chain --json` expose the same versioned read model?
3. Does the read model provide a deterministic ordered fact list?
4. Are Echo-only facts still explicit `ABSENT` posture when unavailable?
5. Are receipts and current readings exposed as `PRESENT` facts when available?
6. Does the existing named-field MCP contract remain compatible?
7. Does the surface remain read-only and avoid control, grant, admission,
   mutation, or strand behavior?

## Follow-On Work

- Add adapter extension points for real Echo artifact registration facts.
- Add `OpticRegistrationDescriptor` and Echo-owned `OpticArtifactHandle`
  values when jedit/Echo publish them.
- Add `CapabilityGrant`, `CapabilityPresentation`, `AdmissionTicket`, and
  `LawWitness` posture once the runtime can expose them as inspection facts.
- Add optional commit evidence references and causal commit evidence facts once
  Echo exposes WAL-backed evidence through a read-only adapter/shared-family
  surface.
- Promote the read model into the authored protocol schema after the host
  vocabulary stabilizes against live `jedit`.

---
title: Echo Causal Commit Evidence Read Model
status: proposed
---

# Echo Causal Commit Evidence Read Model

**Cycle:** 0042-echo-causal-commit-evidence-read-model
**Legend:** PROTO
**Type:** design cycle

## Sponsor Human

Operator debugging `jedit` after Echo begins exposing WAL-backed durability
evidence. Needs to know whether a submitted edit was durably accepted,
recovered as pending, decided by a tick receipt, rejected, obstructed, or
blocked by a recovery fault.

## Sponsor Agent

LLM agent using CLI JSON or MCP. Needs a host-neutral read model for durability
and recovery posture without becoming a second Echo recovery engine.

## Hill

WARP TTD becomes WAL-evidence-aware, not WAL-owned.

```text
Echo owns WAL truth.
WARP TTD inspects Echo-projected causal commit evidence.
```

WARP TTD must not parse raw Echo WAL segments, truncate WAL tails, validate
commit markers, or recover Echo runtime state. It should inspect commit anchors,
recovery certificates, durability posture, and obstruction posture supplied by
an Echo adapter or generated shared-family artifact.

## Boundary Rule

| Concern | Owner |
| :--- | :--- |
| WAL segment format | Echo |
| WAL append authority | Echo |
| WAL recovery and truncation | Echo |
| Commit-marker validation | Echo |
| Runtime admission and tick semantics | Echo |
| Causal commit evidence projection | Echo adapter or shared-family artifact |
| CLI/MCP/TUI explanation | WARP TTD |
| Cross-target correlation and posture display | WARP TTD |

The debugger should be the cockpit instrument, not the black box recorder.

## Adapter Capability

Add this capability only when an Echo adapter can truthfully expose the
underlying evidence:

```text
READ_CAUSAL_COMMIT_EVIDENCE
```

Do not use `READ_WAL`. WAL is the mechanism; causal commit evidence is the
debugger concept.

## Read Model Sketch

```ts
interface CausalCommitEvidence {
  readonly evidenceId: string;
  readonly posture: "ABSENT" | "PRESENT" | "OBSTRUCTED";
  readonly source:
    | "ECHO_WAL"
    | "ECHO_CHECKPOINT"
    | "ECHO_RECOVERY_CERTIFICATE";
  readonly durabilityMode:
    | "STRICT"
    | "BUFFERED"
    | "DISABLED"
    | "UNKNOWN";
  readonly writerEpoch?: string;
  readonly lsn?: number;
  readonly transactionId?: string;
  readonly commitDigest?: string;
  readonly checkpointDigest?: string;
  readonly recoveryPosture?:
    | "CLEAN"
    | "TAIL_TRUNCATED"
    | "OBSTRUCTED"
    | "FAULTED";
  readonly obstruction?: {
    readonly code: string;
    readonly message: string;
  };
}
```

Existing summaries should gain optional evidence references before WARP TTD
adds a large standalone inspector:

- `ReceiptSummary.commitEvidenceRef?`
- `ReadingInspection.commitEvidenceRef?`
- `AdmissionFact.commitEvidenceRef?`
- `SessionFamilyFact.commitEvidenceRef?`

The detailed `CausalCommitEvidence` lookup can follow once Echo exposes stable
commit anchors.

## Admission Chain Extension

The current admission-chain read model distinguishes artifact registration,
handles, grants, tickets, witnesses, receipts, and readings. Once Echo WAL
exists, durability posture becomes an additional fact dimension:

```text
OpticArtifact
-> OpticAdmissionRequirements
-> OpticRegistrationDescriptor
-> OpticArtifactHandle
-> CapabilityGrant
-> CapabilityPresentation
-> AdmissionTicket
-> LawWitness
-> CausalCommitEvidence / RecoveryEvidence
-> Receipt or ReadingEnvelope
```

This does not make WAL a user-facing ontology. It makes durable commit posture
visible where agents need it.

## jedit Recovery States

For `jedit`, the Echo adapter should eventually let WARP TTD explain:

| State | Meaning |
| :--- | :--- |
| `NotAccepted` | No committed Echo acceptance evidence exists. |
| `AcceptedPending` | Echo committed acceptance, but no decided receipt is known. |
| `AcceptedDecided` | Echo committed acceptance and a tick receipt decision. |
| `AcceptedRejected` | Echo committed a final rejection outcome for that attempt. |
| `AcceptedObstructed` | Echo committed or recovered obstruction posture. |
| `RecoveryFaulted` | Echo recovery found a global or scoped recovery fault. |
| `DurabilityUnknown` | Host did not expose durable commit evidence. |

Never silently infer durability from a receipt. The honest display is:

```text
receipt present; durable commit evidence unavailable
```

## CLI And MCP First

The first surfaces should be structured:

```sh
npm run admission-chain -- --json
npm run target-session -- --json
```

Future MCP tools should expose the same read model:

```text
warp_ttd.inspect_admission_chain
warp_ttd.inspect_readings
warp_ttd.inspect_live_targets
```

Do not add a TUI WAL viewer before the JSON/MCP contract exists. Do not add a
raw WAL viewer to core WARP TTD.

## Recovery Certificate Projection

When Echo publishes a recovery certificate, WARP TTD should be able to inspect
these fields as read-only evidence:

- checkpoint used;
- WAL tail scanned;
- last committed LSN;
- truncated tail range;
- recovered submission count;
- recovered receipt count;
- obstruction count;
- final frontier digest.

Example compact target-session posture:

```json
{
  "target": "jedit",
  "sessionPosture": "PRESENT",
  "durability": {
    "posture": "PRESENT",
    "source": "ECHO_WAL",
    "mode": "STRICT",
    "recovery": "CLEAN",
    "lastCommittedLsn": 1842
  }
}
```

For the current smoke state:

```json
{
  "durability": {
    "posture": "ABSENT",
    "reason": "No Echo runtime adapter or WAL evidence exposed."
  }
}
```

## Non-Goals

- No `readWalSegments`.
- No `recoverWal`.
- No `truncateUncommittedWalTail`.
- No raw WAL segment parser in `DebuggerSession`.
- No Echo runtime recovery in WARP TTD.
- No debugger-forced submission acceptance, receipt commit, recovery clean mark,
  or runtime posture mutation.
- No jedit editor-domain nouns in the durability model.
- No TUI-first implementation.

## Playback Questions

1. Can CLI and MCP show that causal commit evidence is absent when Echo has not
   exposed it?
2. Can WARP TTD distinguish receipt presence from durable receipt evidence?
3. Can a `jedit` submitted edit be explained as not accepted, pending, decided,
   rejected, obstructed, faulted, or unknown after restart?
4. Does `READ_CAUSAL_COMMIT_EVIDENCE` gate every adapter-provided durability
   fact?
5. Does `DebuggerSession` remain an investigation object rather than a WAL
   recovery engine?
6. Do all facts remain read-only and non-mutating?

## Follow-On Work

- Add fixtures for WAL-backed states before Echo exposes real WAL evidence.
- Extend admission-chain facts with optional `commitEvidenceRef`.
- Add `CausalCommitEvidence` lookup/read model after Echo publishes stable
  anchor names.
- Add CLI/MCP JSON first.
- Add a TUI durability lens only after structured surfaces are stable.

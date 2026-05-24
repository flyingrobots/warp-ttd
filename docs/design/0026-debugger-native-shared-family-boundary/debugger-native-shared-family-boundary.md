---
title: Debugger-Native Shared-Family Boundary
status: landed
---

# Debugger-Native Shared-Family Boundary

**Cycle:** 0026-debugger-native-shared-family-boundary
**Legend:** PROTO
**Type:** design cycle

## Sponsor Human

Maintainer adding live Echo, git-warp, Continuum, or Wesley facts to WARP TTD.
Needs one boundary rule before changing schemas, adapters, CLI JSON, MCP tools,
or TUI renderers.

## Sponsor Agent

LLM agent consuming WARP TTD as a structured inspection surface. Needs to know
whether a noun is debugger-local, generated from a shared family, or raw
adapter residue before trusting it as host-neutral truth.

## Hill

WARP TTD freezes one boundary between three classes of facts:

1. **Debugger-native protocol families** owned by WARP TTD.
2. **Shared-family projections** consumed from Continuum, Echo, Wesley, or
   authority-family artifacts.
3. **Host-specific adapter residue** kept behind explicit adapter boundaries.

The boundary keeps host-neutral debugging honest without flattening real host
differences.

## Boundary Rule

WARP TTD owns the act of investigation. It does not own the app, authority,
admission, witness, or shared semantic family being investigated.

That means:

- debugger-local navigation, framing, summaries, pins, obstructions, and
  posture wrappers stay WARP TTD-native
- facts that describe authority, admission, observer-relative readings,
  runtime witnesshood, or shared coordination truth come from generated
  shared-family artifacts when those artifacts exist
- host substrate details remain adapter-local unless WARP TTD deliberately
  projects them into a debugger summary

## Ownership Matrix

| Fact class | Owner | WARP TTD posture | Examples |
| :--- | :--- | :--- | :--- |
| Debugger-native protocol family | WARP TTD | Author and version locally | `DebuggerSession`, playback cursor, frame window, `InvestigationIntent`, pin trail |
| Host-neutral TTD protocol | Authored schema plus Wesley generation | Follow the schema and generated artifact family | `HostHello`, `AdapterCapability`, `PlaybackFrame`, `ReceiptSummary` |
| Shared Continuum/Echo family | Continuum, Echo, or authority owner, compiled by Wesley when available | Consume generated types and wrap with posture | `ReadingEnvelope`, `ObserverPlan`, `OpticRegistrationDescriptor`, `LawWitness` |
| Authority family | User, host, quorum, or policy authority | Inspect and display; never issue by implication | `CapabilityGrant`, `CapabilityPresentation` |
| Runtime admission family | Echo or another runtime | Inspect tickets, witnesses, and obstruction posture | `OpticArtifactHandle`, `AdmissionTicket`, runtime admission obstruction |
| Runtime durability family | Echo or another runtime | Inspect commit anchors and recovery posture; never recover or mutate | `CausalCommitEvidence`, recovery certificate, durability posture |
| git-warp substrate residue | git-warp adapter | Translate into debugger summaries only when useful | git refs, patch SHA, Lamport receipt details, graph name |
| App-domain residue | The app target | Keep out of the debugger core | jedit editor commands, graft domain graph ontology |

## Debugger-Native Protocol Families

These families are WARP TTD-native by design. They describe the debugger's
inspection session, not the host application's semantic truth.

- `DebuggerSession`
- live target inspection and live target session inspection
- playback cursor and playback control result posture
- playback head snapshots and frame windows
- lane, worldline, coordinate, and tick views as debugger coordinates
- receipt, effect, delivery, and execution summaries
- neighborhood and reintegration summaries
- admission-chain read-model posture wrappers
- investigation intents, pins, and investigation trails
- CLI JSONL and MCP result envelopes that report what WARP TTD can inspect

These may be represented in the authored WARP TTD protocol schema, but they are
not claims that Echo, git-warp, or Continuum own the same internal model.

## Shared-Family Projections

These nouns should become projections over generated shared-family artifacts as
soon as those artifacts are stable enough to consume. Until then, WARP TTD may
represent absence or obstruction posture, but it should not create a competing
handwritten semantic authority.

- `OpticArtifact`
- `OpticAdmissionRequirements`
- `OpticRegistrationDescriptor`
- `OpticArtifactHandle`
- `CapabilityGrant`
- `CapabilityPresentation`
- `AdmissionTicket`
- `LawWitness`
- `CausalCommitEvidence`
- `RecoveryEvidence`
- `RecoveryCertificate`
- `ReadingEnvelope`
- `ObserverPlan`
- `ObservationRequest`
- `TickResult`
- `ContinuumEvidenceStatus`
- `ContinuumNativeEvidence`
- `WitnessedSuffixShell`
- `CausalSuffixBundle`
- `ImportOutcome`

The local rule is: expose the fact's availability, posture, identifier, and
links before vendoring the full family. When the generated family exists, use
it as the payload authority.

## Host-Specific Adapter Residue

Some useful facts are real but not host-neutral. They stay behind the adapter
boundary unless WARP TTD intentionally turns them into a debugger projection.

For git-warp:

- repository path
- graph name
- git object IDs
- patch SHA
- writer-local Lamport receipt details
- materialized graph node and edge details

For Echo or jedit:

- app command names
- editor buffer semantics
- runtime-local storage IDs
- raw WAL segment paths or object-store locations
- app-private observer defaults
- Echo implementation diagnostics that are not published as shared-family facts

These values can appear in structured output only with their host posture
visible. They must not silently become base protocol nouns.

## Promotion Rules

When adding a noun or field, apply this order:

1. If it is debugger session state, playback navigation, a summary, a pin, or a
   posture wrapper, it may be WARP TTD-native.
2. If it is shared across Continuum, Echo, authority, admission, witness, or
   reading families, consume a generated artifact or expose explicit
   `ABSENT`/`OBSTRUCTED` posture until one exists.
3. If it is a raw host substrate value, keep it adapter-local or label it as
   translated substrate evidence.
4. If it mutates the app, issues authority, performs admission, or creates a
   strand, stop. That requires an admitted-control design, not a read-model
   field.
5. If a human view needs it, the CLI or MCP structured surface gets it first.

## Schema Decision

The authored WARP TTD protocol schema can own debugger-native families and
host-neutral inspection envelopes. It must not become a shadow home for shared
Continuum or Echo families.

`src/protocol.ts` remains a local follower until the generated protocol
cutover. New shared-family payload shapes should not be added there as peer
authority. Prefer:

- a generated Wesley artifact when available
- an app read model with `ABSENT`, `PRESENT`, or `OBSTRUCTED` posture
- a narrow adapter-local type that never leaks as host-neutral truth

## Live Target Consequences

`jedit` and `graft` stay useful because they pressure different sides of the
boundary.

- `jedit` should publish Echo and Continuum facts for artifact registration,
  handles, authority posture, admission tickets, witnesses, receipts, and
  readings. Once Echo exposes WAL-backed durability evidence, `jedit` should
  also surface causal commit evidence and recovery posture through Echo adapter
  or shared-family facts. WARP TTD consumes those facts.
- `graft` should publish causal history, receipts, materialized readings, and
  translated substrate evidence. WARP TTD translates those facts into debugger
  summaries without pretending they are native Continuum witnesshood.

The same debugger session may inspect both, but the payload authority remains
with the producing family.

## MCP And CLI Contract

Agent-facing surfaces should name the boundary in their outputs:

- WARP TTD-native envelopes use `warp-ttd.*` schema versions.
- shared-family payloads carry their family name, source, schema version, or
  generated artifact identity when available.
- unavailable shared-family facts are explicit absence, not omitted panels.
- translated substrate facts stay marked as translated substrate evidence.
- no MCP tool or CLI command may issue `CapabilityGrant`, construct
  `CapabilityPresentation`, perform runtime admission, or mutate host state
  unless a later admitted-control cycle explicitly changes the contract.

## Playback Questions

1. Can an agent identify which protocol families WARP TTD owns locally?
2. Can an agent identify which nouns must come from generated shared-family
   artifacts?
3. Can a maintainer keep raw host residue out of the host-neutral protocol?
4. Can admission-chain work proceed without re-litigating whether
   `CapabilityGrant`, `CapabilityPresentation`, `AdmissionTicket`, and
   `LawWitness` are debugger-owned?
5. Can live target work explain why git-warp translated substrate evidence is
   not native Continuum witnesshood?
6. Can future Echo WAL evidence work stay limited to commit anchors and
   recovery posture without raw WAL parsing or recovery behavior?
7. Can future TUI work render the same boundary without introducing TUI-only
   facts?

## Acceptance Checklist

- Keep `AdapterCapability` distinct from `CapabilityGrant` and
  `CapabilityPresentation`.
- Keep `OpticArtifactHandle` as an Echo-owned runtime registration handle, not
  authority.
- Keep `ReadingEnvelope`, `ObserverPlan`, and `ContinuumEvidenceStatus` in the
  shared-family projection bucket.
- Keep `READ_CAUSAL_COMMIT_EVIDENCE` distinct from raw WAL access.
- Reject debugger-owned WAL parsing, recovery, tail truncation, or clean
  recovery marking.
- Keep git-warp graph details as adapter residue unless projected into a
  debugger summary.
- Reject new host-neutral protocol nouns that are really app-domain semantics.
- Reject new control paths that issue grants, present authority, admit runtime
  invocations, mutate apps, or create strands.

## Non-Goals

- No generated protocol authority cutover in this slice.
- No new shared-family schemas.
- No Echo adapter implementation.
- No WAL parser.
- No Echo runtime recovery.
- No WAL tail truncation.
- No jedit app semantics in WARP TTD.
- No git-warp graph ontology in WARP TTD core.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

## Follow-On Work

1. Use this packet to guide the generated family ingress seam.
2. Promote admission-chain payloads to generated shared-family consumers as
   Echo and Wesley stabilize them.
3. Add host-published neighborhood facts while keeping WARP TTD's neighborhood
   summaries as debugger projections.
4. Add MCP parity for live session and read surfaces with the same boundary
   labels.

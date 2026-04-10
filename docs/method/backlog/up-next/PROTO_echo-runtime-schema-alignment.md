# Protocol evolution for Echo's runtime schema

The warp-ttd protocol was shaped by git-warp's model. Echo's runtime
schema (frozen in Phase 8 ADR-0008) is significantly richer and the
protocol needs to grow to accommodate it without breaking git-warp.

## What Echo's runtime schema has that the protocol doesn't

### 1. Typed opaque identifiers

Echo defines `HeadId`, `WorldlineId`, `IntentKind` as 32-byte
hash-backed opaque scalars with explicit semantic rules (no
reinterpretation as display labels, preserve byte width). The protocol
uses `String!` for all identifiers. This loses the opacity contract.

**Proposed change:** Add optional typed scalar aliases to the protocol
schema. Adapters that support them declare a capability; adapters
that don't continue using strings. The protocol should at least
document the expected semantics per field even if the wire format
stays string.

### 2. WorldlineTick vs GlobalTick distinction

Echo distinguishes:
- `WorldlineTick` — per-worldline Lamport-style append coordinate
- `GlobalTick` — runtime-global scheduler cycle coordinate

The protocol has `tick: Int!` on `Coordinate`, collapsing both into
one undifferentiated integer.

**Proposed change:** Add `globalTick: Int` to `LaneFrameView` and
`ReceiptSummary`. The per-lane tick stays as-is; the global tick is
an optional correlation field. git-warp can leave it null (it doesn't
have a global scheduler).

### 3. Playback control richness

Echo's `PlaybackMode` is a 5-variant union:
- `Paused`, `Play`, `StepForward`, `StepBack`, `Seek(target, then)`
- `SeekThen` has `Pause` and `Play` follow-up policies

The protocol only has three mutations: `stepForward`, `stepBackward`,
`seekToFrame`. Missing:
- Continuous `Play` mode (advance until paused)
- `SeekThen` policy (what to do after seeking — pause or keep playing)

**Proposed change:** Add `play(headId)` and `pause(headId)` mutations.
Extend `seekToFrame` with an optional `then: SeekThen` enum argument.
Capability-gated; git-warp can skip if it doesn't have continuous
playback.

### 4. Ingress routing (not present at all)

Echo has a full deterministic ingress routing system:
- `IngressTarget` — 3-variant union: `DefaultWriter`, `InboxAddress`,
  `ExactHead`
- `InboxPolicy` — 3-variant union: `AcceptAll`, `KindFilter`,
  `Budgeted(maxPerTick)`

This tells the debugger *how intents reach writer heads*. A debugger
could show: "this intent was routed to head X via inbox address Y,
which has a budget of 5/tick."

**Proposed change:** Add a `routingInfo` field to `ReceiptSummary`
with target kind, inbox address, and policy summary. Optional;
git-warp omits it. This is introspection, not control.

### 5. Head eligibility and disposition

Echo tracks per-head scheduler state:
- `HeadEligibility` — `Dormant` / `Admitted`
- `HeadDisposition` — `Dormant` / `Runnable` / `Blocked` / `Retired`

The debugger can't currently see why a head isn't advancing. It could
be dormant (not admitted), blocked (waiting on dependencies), or
retired.

**Proposed change:** Add a `headStatus` query:
```graphql
headStatus(headId: String!): HeadStatus!
```
Where `HeadStatus` contains `eligibility`, `disposition`, and
optionally `blockReason`. Capability-gated.

### 6. Scheduler introspection

Echo's `SchedulerStatus` is rich:
- `state` (Inactive/Running/Stopping)
- `activeMode` (UntilIdle + optional cycleLimit)
- `workState` (Quiescent/RunnablePending/BlockedOnly)
- `runId`, `latestCycleGlobalTick`, `latestCommitGlobalTick`
- `lastRunCompletion` (Quiesced/BlockedOnly/CycleLimitReached/Stopped)

The protocol has `ExecutionContext` (mode + sessionId) which is the
debugger's own session state, not the substrate's scheduler state.

**Proposed change:** Add a `schedulerStatus` query that returns
Echo's full scheduler metadata. Capability-gated. git-warp doesn't
have a scheduler; it returns null or a simplified analog.

### 7. WriterHeadKey composite

Echo uses `WriterHeadKey { worldlineId, headId }` as a composite
key.

**Status:** landed for the minimum surface. `ReceiptSummary.writer`
and `EffectEmissionSummary.producerWriter` now use an explicit
`WriterRef { writerId, worldlineId }` runtime form instead of flat
writer strings.

### 8. Explicit worldline identity outside lane naming

Today TTD can usually infer worldline identity from `LaneRef.id`,
`LaneRef.kind`, and `parentId`, but that is still inference. A lane id
like `wl:main` or `ws:sandbox` is a local convention, not a typed
causal identity contract. The host should provide worldline identity
directly instead of making the debugger recover it from prefixes or
tree shape.

This matters most for:
- strand receipts and effects that should still name their owning or
  root worldline explicitly
- writer/head identity, where worldline and head form a real composite
  key in Echo
- future cross-host comparison, where local lane labels may differ but
  causal identity should not

**Status:** landed for the current minimum surface. The protocol now
names explicit `worldlineId` on `LaneRef`, `Coordinate`,
`LaneFrameView`, `ReceiptSummary`, and `EffectEmissionSummary`, so TTD
does not have to reconstruct worldline identity from `wl:` / `ws:`
prefixes or parent-chain shape.

**Remaining gap:** Echo's fuller `WriterHeadKey { worldlineId, headId }`
shape is still richer than the protocol's current writer surface. If
TTD needs to distinguish the same writer across multiple playback heads
in one worldline, the next honest move is a first-class head-aware
writer identity.

## How Echo's runtime works (for protocol designers)

### The tick model

Echo runs a deterministic scheduler that processes writer heads in
canonical order. Each scheduler cycle is a `GlobalTick`. Within a
worldline, each committed state transition is a `WorldlineTick`.
These are different clocks — a single global tick may advance
multiple worldlines, and a worldline may not advance every global
tick.

### The ingress model

Intents enter through a routing layer:
1. An intent arrives with an `IngressTarget` (which worldline/inbox/head)
2. The target worldline's `InboxPolicy` decides whether to accept it
3. Accepted intents are queued for the writer head
4. The scheduler drains heads in canonical order

This routing is invisible to warp-ttd today. The debugger sees
receipts but not *how the intent got there*.

### The playback model

Echo's `PlaybackCursor` is stateful:
- It has a mode (Paused/Play/Step/Seek)
- Seek has a follow-up policy (pause after seeking, or resume playing)
- The cursor materializes any tick without mutating the head
- Multiple cursors can exist simultaneously at different ticks

This is richer than warp-ttd's step/seek mutations, which are
fire-and-forget.

### The parallel execution model

Echo runs rewrites on independent shards and performs canonical merge.
During merge, some shard-local results may be superseded. These are
counterfactuals unique to Echo — git-warp's CRDT model converges
without an explicit merge phase.

## Implementation strategy

All additions should be **capability-gated**:
1. New capabilities in the `Capability` enum (e.g., `READ_HEAD_STATUS`,
   `READ_SCHEDULER_STATUS`, `CONTROL_PLAY`, `CONTROL_PAUSE`)
2. New types added to the schema but not required
3. git-warp adapter unchanged; Echo adapter declares new capabilities
4. TUI/CLI gain new views when capabilities are present

This follows warp-ttd's existing doctrine: explicit envelopes,
capability-gated evolution, no breaking changes.

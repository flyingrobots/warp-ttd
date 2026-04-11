# Design Doc — Session Mode And Signals

**Cycle:** 0015-session-mode-and-signals
**Legend:** PROTO
**Type:** feature cycle

## Sponsor Human

Application developer embedding a WARP host under TTD. Needs explicit,
machine-readable alerts when the debugger changes how the app should
behave:

- we are entering replay mode
- we are skipping to a different frame/tick
- we are exiting replay mode
- we are live again

This user cannot safely infer those transitions from ad hoc callback
timing or by comparing two snapshots after the fact.

## Sponsor Agent

Agent integrating Echo or `git-warp` with TTD. Needs a host-neutral
model that distinguishes:

- causal effect candidates
- observer encounters
- sink delivery attempts
- debugger-driven session transitions

Without that split, replay automation will either suppress too much,
deliver twice, or invent host-specific folklore for what "live" means.

## Hill

TTD has one shared session-mode vocabulary, but it stops overloading
that vocabulary to mean every kind of event.

- `EffectEmissionSummary` stays causal effect-candidate truth.
- `ObserverTraceSummary` becomes observer-encounter truth.
- `DeliveryObservationSummary` stays sink-result truth.
- `ExecutionContext` stays the ambient session lens.
- `SessionSignal` becomes the explicit debugger/app alert surface for
  mode transitions and playback jumps.

An app or agent can tell both:

1. **what exists in causal history**
2. **what the debugger is making the host do right now**

without guessing from timing or implicit callback suppression.

## Playback Questions

### Human

1. Can I tell whether the debugger is live, replaying, or just
   inspecting?
2. Can the app be notified when I enter replay, seek, or return to
   live?
3. Can the debugger show an effect candidate without implying it was
   re-delivered?

### Agent

1. Can I separate causal effect truth from observer encounters and
   delivery results?
2. Can I tell whether a visible effect was encountered in `LIVE`,
   `REPLAY`, or `DEBUG`?
3. Can I react to debugger-induced transitions without diffing
   snapshots or inventing host-local heuristics?

## Current Problem

Today the protocol defines one enum:

```graphql
enum ExecutionMode {
  LIVE
  REPLAY
  DEBUG
}
```

and uses it in:

- `ExecutionContext.mode`
- `DeliveryObservationSummary.executionMode`

This is directionally right but semantically incomplete.

Two different questions are currently compressed together:

1. **What session lens is active?**
2. **What kind of event is this object describing?**

That compression becomes dangerous as soon as apps need explicit alerts
for "the debugger is entering replay mode" or "the debugger just jumped
to a different frame."

## Core Decision

### 1. Keep one shared value vocabulary

The values are still one shared concept. Rename that concept from
`ExecutionMode` to `SessionMode`.

```typescript
type SessionMode = "LIVE" | "REPLAY" | "DEBUG";
```

Definitions:

- `LIVE`
  Normal frontier-following session. New effect candidates may be
  eligible for delivery.
- `REPLAY`
  Historical reenactment of already-admitted causal history.
  Externalization is usually suppressed or policy-gated.
- `DEBUG`
  Read-only inspection or arbitrary seek. The session is not claiming
  "I am replaying history in order"; it is inspecting.

### 2. Do not treat every carrier of `SessionMode` as the same event

`SessionMode` is a shared lens vocabulary, not a whole event model.

These objects are **not** semantically equal even if they share the
same mode values:

| Surface | What it means |
|---------|----------------|
| `ExecutionContext.sessionMode` | The ambient session lens now |
| `ObserverTraceSummary.sessionMode` | The session lens when this observer encounter happened |
| `DeliveryObservationSummary.sessionMode` | The session lens when this sink decision happened |

Same values, different claims.

## Proposed Noun Split

### Causal effect truth

```typescript
interface EffectEmissionSummary {
  emissionId: string;
  coordinate: Coordinate;
  effectKind: EffectKind;
  producerWriter: WriterRef;
  summary: string;
}
```

This is causal substrate truth:

> At this coordinate, the system admitted an outbound effect candidate.

It should **not** carry a `live: boolean` or `sessionMode`. The same
effect may later be:

- encountered live
- encountered again during replay
- inspected in debug
- delivered by one sink
- suppressed by another

Those later facts do not belong on the emission itself.

### Observer encounter truth

```typescript
type TraceKind = "ENTERED_VIEW" | "PRESENT_IN_VIEW" | "EXITED_VIEW";

interface ObserverTraceSummary {
  traceId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  worldlineId: string;
  observerId?: string;
  apertureId?: string;
  sessionMode: SessionMode;
  traceKind: TraceKind;
  emissionId?: string;
  summary: string;
}
```

This is the missing noun in the current model.

It answers:

> What did this observer encounter while operating under this session
> lens?

This is where "am I seeing this live or due to replay?" actually
belongs.

### Sink result truth

```typescript
interface DeliveryObservationSummary {
  observationId: string;
  emissionId: string;
  sinkId: string;
  outcome: DeliveryOutcome;
  reason: string;
  sessionMode: SessionMode;
  summary: string;
}
```

This remains a policy/result object:

> Under this session lens, this sink delivered, suppressed, skipped, or
> failed to deliver the effect candidate.

This is not causal graph truth unless a host deliberately re-imports it
as later substrate truth.

## New Application-Layer Concept: SessionSignal

Apps built on top of TTD need an alert surface for debugger-driven
transitions. This is not the same thing as effect emissions or observer
traces.

The debugger is allowed to make the app do things like:

- enter replay mode
- leave replay mode
- seek to a non-adjacent frame
- reattach to live frontier following

Those are control-plane transitions. They should become a new
application-layer concept:

```typescript
type SessionSignalKind =
  | "MODE_CHANGED"
  | "FRAME_MOVED"
  | "ATTACHED_TO_LIVE_FRONTIER"
  | "DETACHED_FROM_LIVE_FRONTIER";

interface SessionSignal {
  signalId: string;
  headId: string;
  kind: SessionSignalKind;
  previousMode?: SessionMode;
  nextMode?: SessionMode;
  previousFrameIndex?: number;
  nextFrameIndex?: number;
  previousCoordinate?: Coordinate;
  nextCoordinate?: Coordinate;
  summary: string;
}
```

### Why `SessionSignal` should not start as protocol substrate truth

These alerts are about what the debugger/application is doing, not what
the WARP substrate admitted as causal history.

So the first home should be the TTD application layer:

- `DebuggerSession` produces `SessionSignal`s
- TUI / CLI / MCP consumers read them
- hosts may later provide stronger hints, but the first useful version
  can be derived from session transitions

This keeps the protocol honest and avoids pretending every debugger
action is a causal fact.

## Derived Alerts

The canonical signal set above is intentionally small. Human-facing
alerts can be derived from it:

| Derived alert | Source |
|--------------|--------|
| "WE ARE ENTERING REPLAY MODE" | `MODE_CHANGED` with `nextMode = REPLAY` |
| "WE ARE EXITING REPLAY MODE" | `MODE_CHANGED` with `previousMode = REPLAY` |
| "WE ARE LIVE" | `MODE_CHANGED` with `nextMode = LIVE` |
| "WE ARE SKIPPING TO A DIFFERENT TICK" | `FRAME_MOVED` where the frame delta is not adjacent |

That lets the core stay small while still serving UIs, apps, and
agents that want stronger phrasing.

## Example: One effect, three truths

1. Tick `10` admits notification effect `E`.
   `EffectEmissionSummary(emissionId = E, coordinate.tick = 10)`

2. Live session steps into tick `10`.
   `ObserverTraceSummary(emissionId = E, sessionMode = LIVE, traceKind = ENTERED_VIEW)`

3. Network sink delivers it.
   `DeliveryObservationSummary(emissionId = E, outcome = DELIVERED, sessionMode = LIVE)`

4. User rewinds into replay and steps through tick `10`.
   `SessionSignal(kind = MODE_CHANGED, previousMode = LIVE, nextMode = REPLAY)`
   `ObserverTraceSummary(emissionId = E, sessionMode = REPLAY, traceKind = ENTERED_VIEW)`
   `DeliveryObservationSummary(emissionId = E, outcome = SUPPRESSED, sessionMode = REPLAY)`

5. User arbitrarily seeks back to frame `10` in a debug session.
   `SessionSignal(kind = FRAME_MOVED, previousFrameIndex = 57, nextFrameIndex = 10)`
   `ObserverTraceSummary(emissionId = E, sessionMode = DEBUG, traceKind = PRESENT_IN_VIEW)`

Same effect. Different encounter. Different delivery result. Explicit
session transition.

## Design Consequences

### Protocol

Planned next protocol move:

- rename `ExecutionMode` to `SessionMode`
- rename `ExecutionContext.mode` to `sessionMode`
- rename `DeliveryObservationSummary.executionMode` to `sessionMode`
- add `ObserverTraceSummary`
- do **not** add `sessionMode` to `EffectEmissionSummary`

### Application core

Planned next app-layer move:

- `DebuggerSession` tracks previous and current session snapshot
- stepping, seeking, and mode changes emit `SessionSignal`
- TUI / CLI / MCP can surface alerts without ad hoc diffing

### Host adapters

Hosts remain responsible for:

- causal effect candidates
- delivery results if they truly have them
- ambient session context if they know it

Hosts do **not** need to fake debugger control-plane alerts as causal
facts.

## Non-Goals

- No claim yet that `SessionSignal` must be host protocol data.
- No streaming/event-bus design in this cycle.
- No delivery-observation implementation for `git-warp` in this cycle.
- No attempt to model arbitrary application callbacks as lawful
  substrate effects.

## Recommended Next Slice

1. Rename `ExecutionMode` to `SessionMode` in protocol and local mirror.
2. Introduce `ObserverTraceSummary` as a first-class protocol noun.
3. Add `SessionSignal` to `DebuggerSession` as an app-layer runtime
   object.
4. Teach the TUI to surface derived alerts for mode changes and large
   frame jumps.

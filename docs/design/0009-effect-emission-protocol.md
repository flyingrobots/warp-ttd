# 0009 — Effect Emission & Delivery Observation Protocol

**Status:** in progress
**Cycle:** unscheduled (cross-repo alignment slice)

## Context

XYPH requires outbound effect emission, replay-safe delivery suppression,
and debugger-visible output provenance. Per the cross-repo alignment doc
(`xyph/design/effect-emission-alignment.md`):

- git-warp owns generic substrate facts for emitted effects and delivery
  observations
- warp-ttd inspects those facts through explicit protocol envelopes
- XYPH interprets them with domain meaning

git-warp has not yet landed substrate support for effect emission or
delivery observations. This design defines the warp-ttd protocol surface
so it is ready when git-warp provides the data. Until then, adapters
declare capabilities honestly and fixture adapters provide test data.

## Three Distinct Layers

The protocol must not collapse these into one thing:

### 1. Effect emission

> The system produced an outbound effect candidate at this coordinate.

An effect emission record captures the fact that something was emitted —
a diagnostic event, UI notification, export artifact, network call, or
bridge dispatch. It is substrate truth, independent of what happened to
the effect afterward.

### 2. Delivery observation

> Adapter X delivered, suppressed, failed, or skipped that effect.

A delivery observation captures what happened to a specific effect
emission at a specific adapter/sink. The same effect may have multiple
delivery observations (one per sink in a fan-out).

### 3. Execution context

> The session is operating under this lens.

The execution context describes whether the current session is live,
replay, or debug mode, which governs whether effects may be externalized.
This is not per-effect — it is session-level metadata.

## Protocol Additions

### New types

```typescript
type DeliveryOutcome = "delivered" | "suppressed" | "failed" | "skipped";

type ExecutionMode = "live" | "replay" | "debug";

interface EffectEmissionSummary {
  emissionId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  coordinate: Coordinate;
  effectKind: string;           // e.g., "diagnostic", "notification", "export"
  producerWriterId: string;
  summary: string;
}

interface DeliveryObservationSummary {
  observationId: string;
  emissionId: string;           // links back to the effect
  headId: string;
  frameIndex: number;
  sinkId: string;               // which adapter/sink handled this
  outcome: DeliveryOutcome;
  reason: string;               // why this outcome (e.g., "replay-suppressed")
  observerId?: string;          // observer/aperture context if relevant
  executionMode: ExecutionMode;  // the lens at time of delivery attempt
  summary: string;
}

interface ExecutionContext {
  mode: ExecutionMode;
  sessionId?: string;
  observerId?: string;
  apertureId?: string;
}
```

### New capabilities

```typescript
type Capability =
  | ... existing ...
  | "read:effect-emissions"
  | "read:delivery-observations"
  | "read:execution-context";
```

### New adapter methods

```typescript
interface TtdHostAdapter {
  ... existing ...
  effectEmissions(headId: string, frameIndex?: number): Promise<EffectEmissionSummary[]>;
  deliveryObservations(headId: string, frameIndex?: number): Promise<DeliveryObservationSummary[]>;
  executionContext(): Promise<ExecutionContext>;
}
```

These methods are **capability-gated**. Callers check `HostHello.capabilities`
before invoking them. Adapters that do not support effect/delivery inspection
omit the capability strings and the methods return empty arrays or a default
execution context.

### CLI `--json` envelopes

```jsonl
{"envelope":"EffectEmissionSummary","data":{...}}
{"envelope":"DeliveryObservationSummary","data":{...}}
{"envelope":"ExecutionContext","data":{...}}
```

## Key Design Decisions

### Delivery outcome is a closed enum, not a boolean

Four states: `delivered`, `suppressed`, `failed`, `skipped`. This prevents
collapsing "nothing delivered" and "delivery was suppressed during replay"
into the same signal.

### Execution context is session-level, not per-effect

The execution mode (live/replay/debug) applies to the entire session. It
does not vary per effect. Individual delivery observations record which
mode was active at the time of the delivery attempt.

### Capabilities gate the new methods

This preserves backward compatibility. Existing adapters (echo fixture,
git-warp v16) do not declare the new capabilities and are not expected to
return effect/delivery data. When git-warp adds substrate support, its
adapter declares the capabilities and implements the methods.

### Fixture adapter provides test data

The echo fixture adapter gains contrived effect/delivery data for testing.
The git-warp adapter returns empty arrays until git-warp v17+ provides
substrate support.

## Protocol Version Impact

This adds new envelope types, new capability strings, and new adapter
methods. Per the versioning rules in design doc 0008:

- New optional capabilities and envelope types = **minor bump**
- Target: v0.2.0 when this lands

## Prerequisite from git-warp

git-warp does not yet provide:

- effect emission records in materialized state or receipts
- delivery observation records
- execution/delivery lens metadata

When git-warp lands these, the GitWarpAdapter should:

1. Declare the new capabilities in `HostHello`
2. Map git-warp's substrate facts into `EffectEmissionSummary` and
   `DeliveryObservationSummary`
3. Read the execution lens from the WarpCore session context

Until then, the git-warp adapter omits the capabilities and the methods
return empty arrays.

## Key Files

- `src/protocol.ts` — new types
- `src/adapter.ts` — new methods
- `src/adapters/echoFixtureAdapter.ts` — fixture data for testing
- `src/adapters/gitWarpAdapter.ts` — provisional empty implementation
- `test/effectEmission.spec.ts` — new, pins effect/delivery behavior
- `test/protocolContract.spec.ts` — updated with new envelope shapes

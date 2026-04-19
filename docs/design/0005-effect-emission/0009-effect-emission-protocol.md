# 0009 — Effect Emission & Delivery Observation Protocol

**Status:** implemented
**Cycle:** unscheduled (cross-repo alignment slice)

## Context

Applications built on WARP require outbound effect emission, replay-safe
delivery suppression, and debugger-visible output provenance. The
canonical split:

- git-warp owns generic substrate facts for emitted effects and the
  host-side delivery pipeline around them
- warp-ttd inspects those facts through explicit protocol envelopes
- Applications interpret them with domain meaning

git-warp already has substrate-side effect entities and host-domain
effect/delivery runtime types. The warp-ttd adapter now maps substrate
effect entities into debugger-visible `EffectEmissionSummary` records.
What it has not yet landed is delivery-observation wiring or a real
session-lens export. Adapters still declare capabilities honestly and
fixture adapters provide the wider test matrix.

## Three Distinct Layers

The protocol must not collapse these into one thing:

### 1. Effect emission

> The system produced an outbound effect candidate at this coordinate.

An effect emission record captures the fact that something was emitted —
a diagnostic event, UI notification, export artifact, network call, or
bridge dispatch. In git-warp terms, the substrate truth is the
`@warp/effect:*` graph entity written during the tick. The debugger
protocol surface is the host/runtime summary of that outbound candidate,
not the later delivery result and not an observer trace.

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
type DeliveryOutcome = "DELIVERED" | "SUPPRESSED" | "FAILED" | "SKIPPED";

type ExecutionMode = "LIVE" | "REPLAY" | "DEBUG";

type EffectKind = string; // wire-encoded as string, hydrated locally as a runtime-backed kind

interface EffectEmissionSummary {
  emissionId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  worldlineId: string;
  coordinate: Coordinate;
  effectKind: EffectKind;
  producerWriter: WriterRef;
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
  | "READ_EFFECT_EMISSIONS"
  | "READ_DELIVERY_OBSERVATIONS"
  | "READ_EXECUTION_CONTEXT";
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

This preserves backward compatibility. Existing adapters that have not
yet added debugger-facing effect/delivery data do not need to declare
the new capabilities. Adapters declare exactly the slices they can back
with real host truth.

### Fixture adapter provides test data

The echo fixture adapter gains contrived effect/delivery data for testing.
The git-warp adapter now declares `READ_EFFECT_EMISSIONS` and maps
historical `@warp/effect:*` graph entities into effect summaries by
materializing at the requested frame ceiling. It still omits the
delivery/context capabilities and returns empty delivery arrays until
delivery-observation wiring exists.

## Protocol Version Impact

This adds new envelope types, new capability strings, and new adapter
methods. Per the versioning rules in design doc 0008:

- New optional capabilities and envelope types = **minor bump**
- Protocol version bumped to v0.5.0 for adapters implementing the
  current head-aware writer and runtime-backed effect-kind surface

## Prerequisite from git-warp

git-warp already provides:

- effect graph entities via `PatchBuilder.emitEffect()`
- host-domain `EffectEmission` / `DeliveryObservation` types for the
  effect pipeline
- execution/delivery lens metadata in the host-domain effect pipeline

What git-warp does not yet provide to warp-ttd is:

- adapter mapping from delivery traces into `DeliveryObservationSummary`
- session wiring that exposes execution context through the debugger host

When git-warp lands these, the GitWarpAdapter should:

1. Declare the delivery/context capabilities in `HostHello`
2. Map git-warp's host-domain delivery facts into
   `DeliveryObservationSummary`
3. Read the execution lens from the WarpCore session context

Until then, the git-warp adapter declares effect-emission support,
returns empty delivery arrays, and exposes a debugger-mode
execution-context fallback rather than pretending it has live delivery
state.

## CLI Integration

New commands expose effect/delivery data in both human and `--json` modes:

- `effects` — list effect emissions at the current frame
- `deliveries` — list delivery observations at the current frame
- `context` — show the execution context (live/replay/debug)

These are added to the existing CLI alongside `hello`, `catalog`, `frame`,
`step`, `demo`. The `demo` command includes effect/delivery data in its
full walkthrough.

## Scenario Fixture Adapter

The hexagonal architecture means `TtdHostAdapter` is the seam. A
**ScenarioFixtureAdapter** takes a declarative scenario description and
returns a fully functional adapter — simulating what any real host
adapter would produce, without touching a real substrate.

### Why

- Tests the full protocol surface without git, network, or substrate
- Exercises multi-writer, multi-sink, all 4 delivery outcomes, strands
- Reusable across unit tests, TUI development, CLI testing
- Simulates git-warp-shaped behavior patterns (frame-per-tick, receipts)
- Serves as the mock layer until git-warp lands substrate support

### Scenario shape

```typescript
interface ScenarioFrame {
  tick: number;
  receipts: Array<{
    laneId: string;
    writerId: string;
    headId?: string;
    admitted: number;
    rejected: number;
    counterfactual: number;
  }>;
  emissions: Array<{
    effectKind: EffectKind;
    laneId: string;
    producerHeadId?: string;
    deliveries: Array<{
      sinkId: string;
      outcome: DeliveryOutcome;
      reason: string;
    }>;
  }>;
}

interface Scenario {
  hostKind: HostKind;
  executionMode: ExecutionMode;
  lanes: Array<{ id: string; kind: LaneKind; parentId?: string; writable: boolean }>;
  frames: ScenarioFrame[];
}
```

### Built-in scenarios

- `scenarioLiveWithEffects()` — live mode, 2 frames, diagnostics delivered
- `scenarioReplayWithSuppression()` — replay mode, suppressed network
  delivery alongside delivered local sink
- `scenarioMultiWriterWithConflicts()` — concurrent writers, rejected
  rewrites, effect emissions on conflict resolution

### Fixture matrix (covered by built-in scenarios)

| Emission | Sink | Outcome | Mode |
|----------|------|---------|------|
| diagnostic (frame 1) | tui-log | delivered | live |
| diagnostic (frame 1) | chunk-file | delivered | live |
| notification (frame 2) | network | suppressed | replay |
| notification (frame 2) | tui-log | delivered | replay |
| export (frame 2) | export-sink | failed | live |
| bridge (frame 2) | bridge-sink | skipped | debug |

## Sync Point

This slice is complete when:

1. Protocol types, adapter interface, fixture data, and tests are green
2. CLI commands expose effect/delivery data with `--json`
3. All work is fixture-driven — no git-warp substrate dependency

The first sync point with git-warp is when the GitWarpAdapter needs to
return real data instead of empty arrays. That requires git-warp Phase 1
(WarpCore.emit, Git persistence of effect records).

## Key Files

- `src/protocol.ts` — new types
- `src/adapter.ts` — new methods
- `src/adapters/echoFixtureAdapter.ts` — fixture data for testing
- `src/adapters/gitWarpAdapter.ts` — provisional empty implementation
- `src/cli.ts` — new commands (effects, deliveries, context)
- `test/effectEmission.spec.ts` — pins effect/delivery behavior
- `test/cliJson.spec.ts` — updated with new envelope tests

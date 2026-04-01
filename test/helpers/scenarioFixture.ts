/**
 * ScenarioFixtureAdapter — declarative scenario builder for TtdHostAdapter.
 *
 * Takes a scenario description and returns a fully functional adapter
 * that simulates what any real host adapter would produce, without
 * touching a real substrate.
 */
import type { TtdHostAdapter } from "../../src/adapter.ts";
import { FrameOutOfRangeError, UnknownHeadError } from "../../src/errors.ts";
import type {
  Capability,
  DeliveryObservationSummary,
  DeliveryOutcome,
  EffectEmissionSummary,
  ExecutionMode,
  HostKind,
  LaneKind,
  LaneRef,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "../../src/protocol.ts";

// ---------------------------------------------------------------------------
// Scenario types
// ---------------------------------------------------------------------------

interface ScenarioDelivery {
  sinkId: string;
  outcome: DeliveryOutcome;
  reason: string;
}

interface ScenarioEmission {
  effectKind: string;
  laneId: string;
  producerWriterId?: string;
  deliveries: ScenarioDelivery[];
}

interface ScenarioReceipt {
  laneId: string;
  writerId: string;
  admitted: number;
  rejected: number;
  counterfactual: number;
}

interface ScenarioFrame {
  tick: number;
  receipts: ScenarioReceipt[];
  emissions: ScenarioEmission[];
}

interface ScenarioLane {
  id: string;
  kind: LaneKind;
  writable: boolean;
  parentId?: string;
}

interface Scenario {
  hostKind: HostKind;
  executionMode: ExecutionMode;
  lanes: ScenarioLane[];
  frames: ScenarioFrame[];
}

// ---------------------------------------------------------------------------
// Internal state built from a scenario
// ---------------------------------------------------------------------------

interface BuiltScenario {
  capabilities: Capability[];
  lanes: LaneRef[];
  receiptsByFrame: Map<number, ReceiptSummary[]>;
  emissionsByFrame: Map<number, EffectEmissionSummary[]>;
  observationsByFrame: Map<number, DeliveryObservationSummary[]>;
}

// ---------------------------------------------------------------------------
// Helpers — extracted to satisfy complexity/line limits
// ---------------------------------------------------------------------------

const HEAD_ID = "head:default";

function buildLanes(scenarioLanes: ScenarioLane[]): LaneRef[] {
  return scenarioLanes.map((l) => {
    const ref: LaneRef = {
      id: l.id,
      kind: l.kind,
      writable: l.writable,
      description: `${l.kind} ${l.id}`
    };
    if (l.parentId !== undefined) {
      ref.parentId = l.parentId;
    }
    return ref;
  });
}

function buildCapabilities(hasEffects: boolean): Capability[] {
  const caps: Capability[] = [
    "read:hello",
    "read:lane-catalog",
    "read:playback-head",
    "read:frame",
    "read:receipts",
    "control:step-forward"
  ];
  if (hasEffects) {
    caps.push("read:effect-emissions", "read:delivery-observations", "read:execution-context");
  }
  return caps;
}

interface Counters {
  emission: number;
  observation: number;
  receipt: number;
}

interface BuildFrameDataArgs {
  sf: ScenarioFrame;
  frameIndex: number;
  prevTick: number;
  mode: ExecutionMode;
  counters: Counters;
}

function buildFrameData(
  args: BuildFrameDataArgs
): { receipts: ReceiptSummary[]; emissions: EffectEmissionSummary[]; observations: DeliveryObservationSummary[] } {
  const { sf, frameIndex, prevTick, mode, counters } = args;
  const receipts = sf.receipts.map((sr) => {
    counters.receipt++;
    const id = counters.receipt.toString().padStart(4, "0");
    return {
      receiptId: `receipt:scenario:${id}`,
      headId: HEAD_ID, frameIndex, laneId: sr.laneId,
      inputTick: prevTick, outputTick: sf.tick,
      admittedRewriteCount: sr.admitted, rejectedRewriteCount: sr.rejected,
      counterfactualCount: sr.counterfactual,
      digest: `digest:${id}`,
      summary: `Writer ${sr.writerId}: ${sr.admitted.toString()} applied, ${sr.rejected.toString()} rejected, ${sr.counterfactual.toString()} counterfactual`
    };
  });

  const emissions: EffectEmissionSummary[] = [];
  const observations: DeliveryObservationSummary[] = [];

  for (const se of sf.emissions) {
    counters.emission++;
    const emId = `emit:scenario:${counters.emission.toString().padStart(4, "0")}`;

    emissions.push({
      emissionId: emId, headId: HEAD_ID, frameIndex,
      laneId: se.laneId, coordinate: { laneId: se.laneId, tick: sf.tick },
      effectKind: se.effectKind,
      producerWriterId: se.producerWriterId ?? sf.receipts[0]?.writerId ?? "scenario-writer",
      summary: `${se.effectKind} emitted at tick ${sf.tick.toString()}`
    });

    for (const sd of se.deliveries) {
      counters.observation++;
      observations.push({
        observationId: `deliv:scenario:${counters.observation.toString().padStart(4, "0")}`,
        emissionId: emId, headId: HEAD_ID, frameIndex,
        sinkId: sd.sinkId, outcome: sd.outcome, reason: sd.reason,
        executionMode: mode,
        summary: `${se.effectKind} → ${sd.sinkId}: ${sd.outcome}`
      });
    }
  }

  return { receipts, emissions, observations };
}

function buildAllFrameData(scenario: Scenario): BuiltScenario {
  const counters: Counters = { emission: 0, observation: 0, receipt: 0 };
  const receiptsByFrame = new Map<number, ReceiptSummary[]>();
  const emissionsByFrame = new Map<number, EffectEmissionSummary[]>();
  const observationsByFrame = new Map<number, DeliveryObservationSummary[]>();

  for (let fi = 0; fi < scenario.frames.length; fi++) {
    const sf = scenario.frames[fi];
    if (sf === undefined) continue;
    const prevTick = fi > 0 ? (scenario.frames[fi - 1]?.tick ?? 0) : 0;
    const data = buildFrameData({ sf, frameIndex: fi + 1, prevTick, mode: scenario.executionMode, counters });
    receiptsByFrame.set(fi + 1, data.receipts);
    emissionsByFrame.set(fi + 1, data.emissions);
    observationsByFrame.set(fi + 1, data.observations);
  }

  const hasEffects = scenario.frames.some((f) => f.emissions.length > 0);

  return {
    capabilities: buildCapabilities(hasEffects),
    lanes: buildLanes(scenario.lanes),
    receiptsByFrame, emissionsByFrame, observationsByFrame
  };
}

function buildPlaybackFrame(
  lanes: LaneRef[],
  scenario: Scenario,
  frameIndex: number
): PlaybackFrame {
  if (frameIndex === 0) {
    return {
      headId: HEAD_ID, frameIndex: 0,
      lanes: lanes.map((lane) => ({
        laneId: lane.id, coordinate: { laneId: lane.id, tick: 0 }, changed: false
      }))
    };
  }
  const sf = scenario.frames[frameIndex - 1];
  if (sf === undefined) {
    throw new FrameOutOfRangeError(frameIndex, scenario.frames.length);
  }
  return {
    headId: HEAD_ID, frameIndex,
    lanes: lanes.map((lane) => ({
      laneId: lane.id, coordinate: { laneId: lane.id, tick: sf.tick }, changed: true
    }))
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildScenario(scenario: Scenario): TtdHostAdapter {
  const built = buildAllFrameData(scenario);
  const heads = new Map<string, PlaybackHeadSnapshot>();
  const laneIds = scenario.lanes.map((l) => l.id);
  const writableIds = scenario.lanes.filter((l) => l.writable).map((l) => l.id);

  heads.set(HEAD_ID, {
    headId: HEAD_ID, label: "Scenario Playback Head",
    currentFrameIndex: 0, trackedLaneIds: laneIds,
    writableLaneIds: writableIds, paused: true
  });

  function requireHead(headId: string): PlaybackHeadSnapshot {
    const head = heads.get(headId);
    if (head === undefined) {
      throw new UnknownHeadError(headId);
    }
    return head;
  }

  function resolveFrame(headId: string, frameIndex?: number): number {
    return frameIndex ?? requireHead(headId).currentFrameIndex;
  }

  return {
    adapterName: "scenario-fixture",
    hello: () => Promise.resolve({
      hostKind: scenario.hostKind, hostVersion: "0.0.0-scenario",
      protocolVersion: "0.1.0", schemaId: "ttd-protocol-scenario-v1",
      capabilities: built.capabilities
    }),
    laneCatalog: () => Promise.resolve({ lanes: structuredClone(built.lanes) }),
    playbackHead: (hid) => Promise.resolve(structuredClone(requireHead(hid))),
    frame: (hid, fi) => Promise.resolve(structuredClone(buildPlaybackFrame(built.lanes, scenario, resolveFrame(hid, fi)))),
    receipts: (hid, fi) => Promise.resolve(structuredClone(built.receiptsByFrame.get(resolveFrame(hid, fi)) ?? [])),
    effectEmissions: (hid, fi) => Promise.resolve(structuredClone(built.emissionsByFrame.get(resolveFrame(hid, fi)) ?? [])),
    deliveryObservations: (hid, fi) => Promise.resolve(structuredClone(built.observationsByFrame.get(resolveFrame(hid, fi)) ?? [])),
    executionContext: () => Promise.resolve({ mode: scenario.executionMode }),
    stepForward(headId: string): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const maxFrame = scenario.frames.length;
      const nextIndex = Math.min(head.currentFrameIndex + 1, maxFrame);
      heads.set(headId, { ...head, currentFrameIndex: nextIndex, paused: true });
      return Promise.resolve(structuredClone(buildPlaybackFrame(built.lanes, scenario, nextIndex)));
    },
    stepBackward(headId: string): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const prevIndex = Math.max(head.currentFrameIndex - 1, 0);
      heads.set(headId, { ...head, currentFrameIndex: prevIndex, paused: true });
      return Promise.resolve(structuredClone(buildPlaybackFrame(built.lanes, scenario, prevIndex)));
    },
    seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const maxFrame = scenario.frames.length;
      const clamped = Math.max(0, Math.min(frameIndex, maxFrame));
      heads.set(headId, { ...head, currentFrameIndex: clamped, paused: true });
      return Promise.resolve(structuredClone(buildPlaybackFrame(built.lanes, scenario, clamped)));
    }
  };
}

// ---------------------------------------------------------------------------
// Built-in scenarios
// ---------------------------------------------------------------------------

export function scenarioLiveWithEffects(): TtdHostAdapter {
  return buildScenario({
    hostKind: "git-warp", executionMode: "live",
    lanes: [{ id: "wl:live", kind: "worldline", writable: false }],
    frames: [
      { tick: 1,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "diagnostic", laneId: "wl:live", deliveries: [
          { sinkId: "sink:tui-log", outcome: "delivered", reason: "Live — delivered to TUI log." },
          { sinkId: "sink:chunk-file", outcome: "delivered", reason: "Live — written to chunk file." }
        ]}]
      },
      { tick: 2,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 1, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "notification", laneId: "wl:live", deliveries: [
          { sinkId: "sink:network", outcome: "delivered", reason: "Live — sent via network." }
        ]}]
      }
    ]
  });
}

export function scenarioReplayWithSuppression(): TtdHostAdapter {
  return buildScenario({
    hostKind: "git-warp", executionMode: "replay",
    lanes: [{ id: "wl:live", kind: "worldline", writable: false }],
    frames: [{ tick: 1,
      receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 }],
      emissions: [{ effectKind: "notification", laneId: "wl:live", deliveries: [
        { sinkId: "sink:network", outcome: "suppressed", reason: "Replay — external delivery suppressed." },
        { sinkId: "sink:tui-log", outcome: "delivered", reason: "Replay — local sink delivers." }
      ]}]
    }]
  });
}

export function scenarioMultiWriterWithConflicts(): TtdHostAdapter {
  return buildScenario({
    hostKind: "git-warp", executionMode: "live",
    lanes: [
      { id: "wl:live", kind: "worldline", writable: false },
      { id: "strand:experiment", kind: "strand", writable: true, parentId: "wl:live" }
    ],
    frames: [
      { tick: 1,
        receipts: [
          { laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 },
          { laneId: "wl:live", writerId: "bob", admitted: 1, rejected: 1, counterfactual: 0 }
        ],
        emissions: [{ effectKind: "diagnostic", laneId: "wl:live", deliveries: [
          { sinkId: "sink:tui-log", outcome: "delivered", reason: "Conflict resolution diagnostic." }
        ]}]
      },
      { tick: 2,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 1, rejected: 0, counterfactual: 1 }],
        emissions: [{ effectKind: "export", laneId: "wl:live", deliveries: [
          { sinkId: "sink:export", outcome: "failed", reason: "Export adapter unavailable." }
        ]}]
      },
      { tick: 3,
        receipts: [{ laneId: "strand:experiment", writerId: "bob", admitted: 1, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "bridge", laneId: "strand:experiment", deliveries: [
          { sinkId: "sink:bridge", outcome: "skipped", reason: "Debug inspection — bridge dispatch skipped." }
        ]}]
      }
    ]
  });
}

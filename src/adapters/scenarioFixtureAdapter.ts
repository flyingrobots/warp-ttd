/**
 * ScenarioFixtureAdapter — declarative scenario builder for TtdHostAdapter.
 *
 * Takes a scenario description and returns a fully functional adapter
 * that simulates what any real host adapter would produce, without
 * touching a real substrate.
 */
import type { TtdHostAdapter } from "../adapter.ts";
import { EffectKind } from "../EffectKind.ts";
import { FrameOutOfRangeError, UnknownHeadError } from "../errors.ts";
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
  ReceiptSummary,
  WriterRef
} from "../protocol.ts";

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
  producerHeadId?: string;
  deliveries: ScenarioDelivery[];
}

interface ScenarioReceipt {
  laneId: string;
  writerId: string;
  headId?: string;
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
  worldlineIdByLaneId: Map<string, string>;
  receiptsByFrame: Map<number, ReceiptSummary[]>;
  emissionsByFrame: Map<number, EffectEmissionSummary[]>;
  observationsByFrame: Map<number, DeliveryObservationSummary[]>;
}

// ---------------------------------------------------------------------------
// Helpers — extracted to satisfy complexity/line limits
// ---------------------------------------------------------------------------

const HEAD_ID = "head:default";

function resolveScenarioWorldlineId(
  lane: ScenarioLane,
  lanesById: Map<string, ScenarioLane>
): string {
  if (lane.kind === "WORLDLINE") {
    return lane.id;
  }

  if (lane.parentId === undefined) {
    throw new TypeError(`Strand lane ${lane.id} is missing parentId`);
  }

  const parent = lanesById.get(lane.parentId);

  if (parent === undefined) {
    throw new TypeError(`Lane ${lane.id} points at unknown parent ${lane.parentId}`);
  }

  return resolveScenarioWorldlineId(parent, lanesById);
}

function buildLanes(scenarioLanes: ScenarioLane[]): LaneRef[] {
  const lanesById = new Map(scenarioLanes.map((lane) => [lane.id, lane]));
  return scenarioLanes.map((l) => {
    const ref: LaneRef = {
      id: l.id,
      kind: l.kind,
      worldlineId: resolveScenarioWorldlineId(l, lanesById),
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
    "READ_HELLO",
    "READ_LANE_CATALOG",
    "READ_PLAYBACK_HEAD",
    "READ_FRAME",
    "READ_RECEIPTS",
    "CONTROL_STEP_FORWARD",
    "CONTROL_STEP_BACKWARD",
    "CONTROL_SEEK"
  ];
  if (hasEffects) {
    caps.push("READ_EFFECT_EMISSIONS", "READ_DELIVERY_OBSERVATIONS", "READ_EXECUTION_CONTEXT");
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
  worldlineIdByLaneId: Map<string, string>;
}

function createWriterRef(
  writerId: string,
  worldlineId: string,
  headId?: string
): WriterRef {
  if (headId === undefined) {
    return { writerId, worldlineId };
  }

  return { writerId, worldlineId, headId };
}

function buildFrameData(
  args: BuildFrameDataArgs
): { receipts: ReceiptSummary[]; emissions: EffectEmissionSummary[]; observations: DeliveryObservationSummary[] } {
  const { sf, frameIndex, prevTick, mode, counters, worldlineIdByLaneId } = args;
  const receipts = sf.receipts.map((sr) => {
    counters.receipt++;
    const id = counters.receipt.toString().padStart(4, "0");
    const worldlineId = worldlineIdByLaneId.get(sr.laneId);
    if (worldlineId === undefined) {
      throw new TypeError(`Receipt lane ${sr.laneId} is not declared in the scenario catalog`);
    }
    return {
      receiptId: `receipt:scenario:${id}`,
      headId: HEAD_ID,
      frameIndex,
      laneId: sr.laneId,
      worldlineId,
      writer: createWriterRef(sr.writerId, worldlineId, sr.headId),
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
    const worldlineId = worldlineIdByLaneId.get(se.laneId);

    if (worldlineId === undefined) {
      throw new TypeError(`Emission lane ${se.laneId} is not declared in the scenario catalog`);
    }

    emissions.push({
      emissionId: emId, headId: HEAD_ID, frameIndex,
      laneId: se.laneId, worldlineId, coordinate: { laneId: se.laneId, worldlineId, tick: sf.tick },
      effectKind: EffectKind.from(se.effectKind),
      producerWriter: createWriterRef(
        se.producerWriterId ?? sf.receipts[0]?.writerId ?? "scenario-writer",
        worldlineId,
        se.producerHeadId
      ),
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
  const lanes = buildLanes(scenario.lanes);
  const worldlineIdByLaneId = new Map(lanes.map((lane) => [lane.id, lane.worldlineId]));
  const receiptsByFrame = new Map<number, ReceiptSummary[]>();
  const emissionsByFrame = new Map<number, EffectEmissionSummary[]>();
  const observationsByFrame = new Map<number, DeliveryObservationSummary[]>();

  for (let fi = 0; fi < scenario.frames.length; fi++) {
    const sf = scenario.frames[fi];
    if (sf === undefined) continue;
    const prevTick = fi > 0 ? (scenario.frames[fi - 1]?.tick ?? 0) : 0;
    const data = buildFrameData({
      sf,
      frameIndex: fi + 1,
      prevTick,
      mode: scenario.executionMode,
      counters,
      worldlineIdByLaneId
    });
    receiptsByFrame.set(fi + 1, data.receipts);
    emissionsByFrame.set(fi + 1, data.emissions);
    observationsByFrame.set(fi + 1, data.observations);
  }

  const hasEffects = scenario.frames.some((f) => f.emissions.length > 0);

  return {
    capabilities: buildCapabilities(hasEffects),
    lanes,
    worldlineIdByLaneId,
    receiptsByFrame, emissionsByFrame, observationsByFrame
  };
}

function cloneEffectEmissionSummary(emission: EffectEmissionSummary): EffectEmissionSummary {
  return {
    ...structuredClone(emission),
    coordinate: structuredClone(emission.coordinate),
    producerWriter: structuredClone(emission.producerWriter),
    effectKind: emission.effectKind.clone()
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
        laneId: lane.id,
        worldlineId: lane.worldlineId,
        coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: 0 },
        changed: false
      }))
    };
  }
  const sf = scenario.frames[frameIndex - 1];
  if (sf === undefined) {
    throw new FrameOutOfRangeError(frameIndex, scenario.frames.length);
  }
  const changedLanes = new Set(sf.receipts.map((r) => r.laneId));
  return {
    headId: HEAD_ID, frameIndex,
    lanes: lanes.map((lane) => ({
      laneId: lane.id,
      worldlineId: lane.worldlineId,
      coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: sf.tick },
      changed: changedLanes.has(lane.id)
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
      protocolVersion: "0.5.0", schemaId: "ttd-protocol-scenario-v1",
      capabilities: built.capabilities
    }),
    laneCatalog: () => Promise.resolve({ lanes: structuredClone(built.lanes) }),
    playbackHead: (hid) => Promise.resolve(structuredClone(requireHead(hid))),
    frame: (hid, fi) => Promise.resolve(structuredClone(buildPlaybackFrame(built.lanes, scenario, resolveFrame(hid, fi)))),
    receipts: (hid, fi) => Promise.resolve(structuredClone(built.receiptsByFrame.get(resolveFrame(hid, fi)) ?? [])),
    effectEmissions: (hid, fi) => Promise.resolve(
      (built.emissionsByFrame.get(resolveFrame(hid, fi)) ?? [])
        .map((emission) => cloneEffectEmissionSummary(emission))
    ),
    deliveryObservations: (hid, fi) => Promise.resolve(structuredClone(built.observationsByFrame.get(resolveFrame(hid, fi)) ?? [])),
    executionContext: () => Promise.resolve({ mode: scenario.executionMode }),
    stepForward(headId: string): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const maxFrame = scenario.frames.length;
      const nextIndex = Math.min(head.currentFrameIndex + 1, maxFrame);
      const frame = buildPlaybackFrame(built.lanes, scenario, nextIndex);
      heads.set(headId, { ...head, currentFrameIndex: nextIndex, paused: true });
      return Promise.resolve(structuredClone(frame));
    },
    stepBackward(headId: string): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const prevIndex = Math.max(head.currentFrameIndex - 1, 0);
      const frame = buildPlaybackFrame(built.lanes, scenario, prevIndex);
      heads.set(headId, { ...head, currentFrameIndex: prevIndex, paused: true });
      return Promise.resolve(structuredClone(frame));
    },
    seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
      const head = requireHead(headId);
      const maxFrame = scenario.frames.length;
      const clamped = Math.max(0, Math.min(frameIndex, maxFrame));
      const frame = buildPlaybackFrame(built.lanes, scenario, clamped);
      heads.set(headId, { ...head, currentFrameIndex: clamped, paused: true });
      return Promise.resolve(structuredClone(frame));
    }
  };
}

// ---------------------------------------------------------------------------
// Built-in scenarios
// ---------------------------------------------------------------------------

export function scenarioLiveWithEffects(): TtdHostAdapter {
  return buildScenario({
    hostKind: "GIT_WARP", executionMode: "LIVE",
    lanes: [{ id: "wl:live", kind: "WORLDLINE", writable: false }],
    frames: [
      { tick: 1,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "diagnostic", laneId: "wl:live", deliveries: [
          { sinkId: "sink:tui-log", outcome: "DELIVERED", reason: "Live — delivered to TUI log." },
          { sinkId: "sink:chunk-file", outcome: "DELIVERED", reason: "Live — written to chunk file." }
        ]}]
      },
      { tick: 2,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 1, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "notification", laneId: "wl:live", deliveries: [
          { sinkId: "sink:network", outcome: "DELIVERED", reason: "Live — sent via network." }
        ]}]
      }
    ]
  });
}

export function scenarioReplayWithSuppression(): TtdHostAdapter {
  return buildScenario({
    hostKind: "GIT_WARP", executionMode: "REPLAY",
    lanes: [{ id: "wl:live", kind: "WORLDLINE", writable: false }],
    frames: [{ tick: 1,
      receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 }],
      emissions: [{ effectKind: "notification", laneId: "wl:live", deliveries: [
        { sinkId: "sink:network", outcome: "SUPPRESSED", reason: "Replay — external delivery suppressed." },
        { sinkId: "sink:tui-log", outcome: "DELIVERED", reason: "Replay — local sink delivers." }
      ]}]
    }]
  });
}

export function scenarioMultiWriterWithConflicts(): TtdHostAdapter {
  return buildScenario({
    hostKind: "GIT_WARP", executionMode: "LIVE",
    lanes: [
      { id: "wl:live", kind: "WORLDLINE", writable: false },
      { id: "strand:experiment", kind: "STRAND", writable: true, parentId: "wl:live" }
    ],
    frames: [
      { tick: 1,
        receipts: [
          { laneId: "wl:live", writerId: "alice", admitted: 2, rejected: 0, counterfactual: 0 },
          { laneId: "wl:live", writerId: "bob", admitted: 1, rejected: 1, counterfactual: 0 }
        ],
        emissions: [{ effectKind: "diagnostic", laneId: "wl:live", deliveries: [
          { sinkId: "sink:tui-log", outcome: "DELIVERED", reason: "Conflict resolution diagnostic." }
        ]}]
      },
      { tick: 2,
        receipts: [{ laneId: "wl:live", writerId: "alice", admitted: 1, rejected: 0, counterfactual: 1 }],
        emissions: [{ effectKind: "export", laneId: "wl:live", deliveries: [
          { sinkId: "sink:export", outcome: "FAILED", reason: "Export adapter unavailable." }
        ]}]
      },
      { tick: 3,
        receipts: [{ laneId: "strand:experiment", writerId: "bob", admitted: 1, rejected: 0, counterfactual: 0 }],
        emissions: [{ effectKind: "bridge", laneId: "strand:experiment", deliveries: [
          { sinkId: "sink:bridge", outcome: "SKIPPED", reason: "Debug inspection — bridge dispatch skipped." }
        ]}]
      }
    ]
  });
}

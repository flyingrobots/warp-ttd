/**
 * ScenarioFixtureAdapter — declarative scenario builder for TtdHostAdapter.
 *
 * Takes a scenario description and returns a fully functional adapter
 * that simulates what any real host adapter would produce, without
 * touching a real substrate.
 */
import type { TtdHostAdapter } from "../adapter.ts";
import { FrameOutOfRangeError, UnknownHeadError } from "../errors.ts";
import type {
  AdapterCapability,
  DeliveryObservationSummary,
  DeliveryOutcome,
  EffectEmissionSummary,
  ExecutionMode,
  HostHello,
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
  capabilities: AdapterCapability[];
  lanes: LaneRef[];
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

function buildCapabilities(hasEffects: boolean): AdapterCapability[] {
  const caps: AdapterCapability[] = [
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

interface BuiltFrameData {
  receipts: ReceiptSummary[];
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
}

interface BuiltFrameMaps {
  receiptsByFrame: Map<number, ReceiptSummary[]>;
  emissionsByFrame: Map<number, EffectEmissionSummary[]>;
  observationsByFrame: Map<number, DeliveryObservationSummary[]>;
}

interface DeliveryObservationArgs {
  sd: ScenarioDelivery;
  se: ScenarioEmission;
  frameArgs: BuildFrameDataArgs;
  emissionId: string;
}

interface PopulateFrameDataArgs {
  scenario: Scenario;
  counters: Counters;
  worldlineIdByLaneId: Map<string, string>;
  maps: BuiltFrameMaps;
}

interface ScenarioRuntime {
  scenario: Scenario;
  built: BuiltScenario;
  heads: Map<string, PlaybackHeadSnapshot>;
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

function requireScenarioWorldline(
  laneId: string,
  worldlineIdByLaneId: Map<string, string>,
  noun: "Receipt" | "Emission"
): string {
  const worldlineId = worldlineIdByLaneId.get(laneId);

  if (worldlineId === undefined) {
    throw new TypeError(`${noun} lane ${laneId} is not declared in the scenario catalog`);
  }

  return worldlineId;
}

function buildReceiptSummary(
  sr: ScenarioReceipt,
  args: BuildFrameDataArgs
): ReceiptSummary {
  args.counters.receipt++;
  const id = args.counters.receipt.toString().padStart(4, "0");
  const worldlineId = requireScenarioWorldline(sr.laneId, args.worldlineIdByLaneId, "Receipt");

  return {
    receiptId: `receipt:scenario:${id}`,
    headId: HEAD_ID,
    frameIndex: args.frameIndex,
    laneId: sr.laneId,
    worldlineId,
    writer: createWriterRef(sr.writerId, worldlineId, sr.headId),
    inputTick: args.prevTick,
    outputTick: args.sf.tick,
    admittedRewriteCount: sr.admitted,
    rejectedRewriteCount: sr.rejected,
    counterfactualCount: sr.counterfactual,
    digest: `digest:${id}`,
    summary: `Writer ${sr.writerId}: ${sr.admitted.toString()} applied, ${sr.rejected.toString()} rejected, ${sr.counterfactual.toString()} counterfactual`
  };
}

function buildEmissionSummary(
  se: ScenarioEmission,
  args: BuildFrameDataArgs,
  emissionId: string
): EffectEmissionSummary {
  const worldlineId = requireScenarioWorldline(se.laneId, args.worldlineIdByLaneId, "Emission");
  const writerId = se.producerWriterId ?? args.sf.receipts[0]?.writerId ?? "scenario-writer";

  return {
    emissionId,
    headId: HEAD_ID,
    frameIndex: args.frameIndex,
    laneId: se.laneId,
    worldlineId,
    coordinate: { laneId: se.laneId, worldlineId, tick: args.sf.tick },
    effectKind: se.effectKind,
    producerWriter: createWriterRef(writerId, worldlineId, se.producerHeadId),
    summary: `${se.effectKind} emitted at tick ${args.sf.tick.toString()}`
  };
}

function buildDeliveryObservation(
  args: DeliveryObservationArgs
): DeliveryObservationSummary {
  const { sd, se, frameArgs, emissionId } = args;
  frameArgs.counters.observation++;

  return {
    observationId: `deliv:scenario:${frameArgs.counters.observation.toString().padStart(4, "0")}`,
    emissionId,
    headId: HEAD_ID,
    frameIndex: frameArgs.frameIndex,
    sinkId: sd.sinkId,
    outcome: sd.outcome,
    reason: sd.reason,
    executionMode: frameArgs.mode,
    summary: `${se.effectKind} → ${sd.sinkId}: ${sd.outcome}`
  };
}

function buildEmissionData(args: BuildFrameDataArgs): {
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
} {
  const emissions: EffectEmissionSummary[] = [];
  const observations: DeliveryObservationSummary[] = [];

  for (const se of args.sf.emissions) {
    args.counters.emission++;
    const emissionId = `emit:scenario:${args.counters.emission.toString().padStart(4, "0")}`;
    emissions.push(buildEmissionSummary(se, args, emissionId));
    observations.push(...se.deliveries.map((sd) =>
      buildDeliveryObservation({ sd, se, frameArgs: args, emissionId })
    ));
  }

  return { emissions, observations };
}

function buildFrameData(args: BuildFrameDataArgs): BuiltFrameData {
  return {
    receipts: args.sf.receipts.map((sr) => buildReceiptSummary(sr, args)),
    ...buildEmissionData(args)
  };
}

function createBuiltFrameMaps(): BuiltFrameMaps {
  return {
    receiptsByFrame: new Map<number, ReceiptSummary[]>(),
    emissionsByFrame: new Map<number, EffectEmissionSummary[]>(),
    observationsByFrame: new Map<number, DeliveryObservationSummary[]>()
  };
}

function storeFrameData(
  maps: BuiltFrameMaps,
  frameIndex: number,
  data: BuiltFrameData
): void {
  maps.receiptsByFrame.set(frameIndex, data.receipts);
  maps.emissionsByFrame.set(frameIndex, data.emissions);
  maps.observationsByFrame.set(frameIndex, data.observations);
}

function populateFrameData(args: PopulateFrameDataArgs): void {
  const { scenario, counters, worldlineIdByLaneId, maps } = args;

  for (let fi = 0; fi < scenario.frames.length; fi++) {
    const sf = scenario.frames[fi];
    if (sf === undefined) continue;

    const prev = scenario.frames[fi - 1];
    const prevTick = prev === undefined ? 0 : prev.tick;
    const data = buildFrameData({
      sf,
      frameIndex: fi + 1,
      prevTick,
      mode: scenario.executionMode,
      counters,
      worldlineIdByLaneId
    });
    storeFrameData(maps, fi + 1, data);
  }
}

function buildAllFrameData(scenario: Scenario): BuiltScenario {
  const counters: Counters = { emission: 0, observation: 0, receipt: 0 };
  const lanes = buildLanes(scenario.lanes);
  const maps = createBuiltFrameMaps();
  const worldlineIdByLaneId = new Map(lanes.map((lane) => [lane.id, lane.worldlineId]));

  populateFrameData({ scenario, counters, worldlineIdByLaneId, maps });
  const hasEffects = scenario.frames.some((f) => f.emissions.length > 0);

  return {
    capabilities: buildCapabilities(hasEffects),
    lanes,
    ...maps
  };
}

function initialPlaybackFrame(lanes: readonly LaneRef[]): PlaybackFrame {
  return {
    headId: HEAD_ID,
    frameIndex: 0,
    lanes: lanes.map((lane) => ({
      laneId: lane.id,
      worldlineId: lane.worldlineId,
      coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: 0 },
      changed: false
    }))
  };
}

function materializedPlaybackFrame(
  lanes: readonly LaneRef[],
  sf: ScenarioFrame,
  frameIndex: number
): PlaybackFrame {
  const changedLanes = new Set(sf.receipts.map((r) => r.laneId));

  return {
    headId: HEAD_ID,
    frameIndex,
    lanes: lanes.map((lane) => ({
      laneId: lane.id,
      worldlineId: lane.worldlineId,
      coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: sf.tick },
      changed: changedLanes.has(lane.id)
    }))
  };
}

function buildPlaybackFrame(
  lanes: readonly LaneRef[],
  scenario: Scenario,
  frameIndex: number
): PlaybackFrame {
  if (frameIndex === 0) return initialPlaybackFrame(lanes);

  const sf = scenario.frames[frameIndex - 1];

  if (sf === undefined) {
    throw new FrameOutOfRangeError(frameIndex, scenario.frames.length);
  }

  return materializedPlaybackFrame(lanes, sf, frameIndex);
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function buildInitialHead(scenario: Scenario): PlaybackHeadSnapshot {
  const laneIds = scenario.lanes.map((l) => l.id);
  const writableIds = scenario.lanes.filter((l) => l.writable).map((l) => l.id);

  return {
    headId: HEAD_ID,
    label: "Scenario Playback Head",
    currentFrameIndex: 0,
    trackedLaneIds: laneIds,
    writableLaneIds: writableIds,
    paused: true
  };
}

function createScenarioRuntime(scenario: Scenario): ScenarioRuntime {
  const heads = new Map<string, PlaybackHeadSnapshot>();
  heads.set(HEAD_ID, buildInitialHead(scenario));

  return {
    scenario,
    built: buildAllFrameData(scenario),
    heads
  };
}

function requireRuntimeHead(runtime: ScenarioRuntime, headId: string): PlaybackHeadSnapshot {
  const head = runtime.heads.get(headId);

  if (head === undefined) {
    throw new UnknownHeadError(headId);
  }

  return head;
}

function resolveRuntimeFrame(
  runtime: ScenarioRuntime,
  headId: string,
  frameIndex?: number
): number {
  return frameIndex ?? requireRuntimeHead(runtime, headId).currentFrameIndex;
}

function runtimePlaybackFrame(
  runtime: ScenarioRuntime,
  headId: string,
  frameIndex?: number
): PlaybackFrame {
  const index = resolveRuntimeFrame(runtime, headId, frameIndex);
  return buildPlaybackFrame(runtime.built.lanes, runtime.scenario, index);
}

function moveRuntimeHead(
  runtime: ScenarioRuntime,
  headId: string,
  frameIndex: number
): PlaybackFrame {
  const head = requireRuntimeHead(runtime, headId);
  const frame = buildPlaybackFrame(runtime.built.lanes, runtime.scenario, frameIndex);
  runtime.heads.set(headId, { ...head, currentFrameIndex: frameIndex, paused: true });
  return structuredClone(frame);
}

function nextRuntimeFrame(runtime: ScenarioRuntime, headId: string): number {
  const head = requireRuntimeHead(runtime, headId);
  return Math.min(head.currentFrameIndex + 1, runtime.scenario.frames.length);
}

function previousRuntimeFrame(runtime: ScenarioRuntime, headId: string): number {
  const head = requireRuntimeHead(runtime, headId);
  return Math.max(head.currentFrameIndex - 1, 0);
}

function clampedRuntimeFrame(runtime: ScenarioRuntime, frameIndex: number): number {
  return Math.max(0, Math.min(frameIndex, runtime.scenario.frames.length));
}

function cloneFrameReceipts(runtime: ScenarioRuntime, headId: string, frameIndex?: number): ReceiptSummary[] {
  const resolved = resolveRuntimeFrame(runtime, headId, frameIndex);
  return structuredClone(runtime.built.receiptsByFrame.get(resolved) ?? []);
}

function cloneFrameObservations(
  runtime: ScenarioRuntime,
  headId: string,
  frameIndex?: number
): DeliveryObservationSummary[] {
  const resolved = resolveRuntimeFrame(runtime, headId, frameIndex);
  return structuredClone(runtime.built.observationsByFrame.get(resolved) ?? []);
}

function scenarioHello(runtime: ScenarioRuntime): Promise<HostHello> {
  return Promise.resolve({
    hostKind: runtime.scenario.hostKind,
    hostVersion: "0.0.0-scenario",
    protocolVersion: "0.6.0",
    schemaId: "ttd-protocol-scenario-v1",
    capabilities: runtime.built.capabilities
  });
}

function buildScenarioAdapter(runtime: ScenarioRuntime): TtdHostAdapter {
  const { scenario } = runtime;

  return {
    adapterName: "scenario-fixture",
    hello: () => scenarioHello(runtime),
    laneCatalog: () => Promise.resolve({ lanes: structuredClone(runtime.built.lanes) }),
    playbackHead: (hid) => Promise.resolve(structuredClone(requireRuntimeHead(runtime, hid))),
    frame: (hid, fi) => Promise.resolve(structuredClone(runtimePlaybackFrame(runtime, hid, fi))),
    receipts: (hid, fi) => Promise.resolve(cloneFrameReceipts(runtime, hid, fi)),
    effectEmissions: (hid, fi) => Promise.resolve(
      (runtime.built.emissionsByFrame.get(resolveRuntimeFrame(runtime, hid, fi)) ?? [])
        .map((emission) => structuredClone(emission))
    ),
    deliveryObservations: (hid, fi) => Promise.resolve(cloneFrameObservations(runtime, hid, fi)),
    executionContext: () => Promise.resolve({ mode: scenario.executionMode }),
    stepForward(headId: string): Promise<PlaybackFrame> {
      return Promise.resolve(moveRuntimeHead(runtime, headId, nextRuntimeFrame(runtime, headId)));
    },
    stepBackward(headId: string): Promise<PlaybackFrame> {
      return Promise.resolve(moveRuntimeHead(runtime, headId, previousRuntimeFrame(runtime, headId)));
    },
    seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
      return Promise.resolve(moveRuntimeHead(runtime, headId, clampedRuntimeFrame(runtime, frameIndex)));
    }
  };
}

export function buildScenario(scenario: Scenario): TtdHostAdapter {
  return buildScenarioAdapter(createScenarioRuntime(scenario));
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

function multiWriterConflictLanes(): ScenarioLane[] {
  return [
    { id: "wl:live", kind: "WORLDLINE", writable: false },
    { id: "strand:experiment", kind: "STRAND", writable: true, parentId: "wl:live" }
  ];
}

function multiWriterConflictFrames(): ScenarioFrame[] {
  return [
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
  ];
}

export function scenarioMultiWriterWithConflicts(): TtdHostAdapter {
  return buildScenario({
    hostKind: "GIT_WARP", executionMode: "LIVE",
    lanes: multiWriterConflictLanes(),
    frames: multiWriterConflictFrames()
  });
}

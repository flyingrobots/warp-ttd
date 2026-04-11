/**
 * git-warp host adapter for warp-ttd.
 *
 * Bridges WarpCore's deterministic graph substrate into TTD's
 * protocol shape: frames indexed by Lamport tick, receipts
 * derived from TickReceipts, lanes from worldlines and strands.
 */
import type { WarpCore } from "@git-stunts/git-warp";
import type { TtdHostAdapter } from "../adapter.ts";
import {
  FrameOutOfRangeError,
  InternalIndexError,
  UnknownHeadError
} from "../errors.ts";
import { extractGitWarpEffectEmissions } from "./gitWarpEffectEmissionExtractor.ts";
import type {
  DeliveryObservationSummary,
  EffectEmissionSummary,
  ExecutionContext,
  HostHello,
  LaneCatalog,
  LaneFrameView,
  LaneRef,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "../protocol.ts";

/**
 * Minimal surface we need from WarpCore. Using a structural type
 * instead of importing the class keeps the adapter testable against
 * any compatible implementation.
 */
interface TickReceipt {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly {
    readonly op: string;
    readonly target: string;
    readonly result: string;
    readonly reason?: string;
  }[];
}

type WarpCoreSharedSurface = Pick<
  WarpCore,
  "discoverWriters" | "listStrands" | "getNodes" | "getEdges"
>;

type GitWarpNodeProps = NonNullable<Awaited<ReturnType<WarpCore["getNodeProps"]>>>;

interface WarpCoreLike<TMaterializedState, TNodeProps extends GitWarpNodeProps>
  extends WarpCoreSharedSurface {
  materialize(options: { receipts: true; ceiling?: number | null }): Promise<{
    state: TMaterializedState;
    receipts: TickReceipt[];
  }>;
  materialize(options?: { receipts?: false; ceiling?: number | null }): Promise<TMaterializedState>;
  getNodeProps(nodeId: string): Promise<TNodeProps | null>;
}

/**
 * A single indexed frame: the Lamport tick it represents and the
 * TickReceipts that belong to it.
 */
interface IndexedFrame {
  readonly tick: number;
  readonly receipts: TickReceipt[];
}

type StrandCatalogEntry = Awaited<ReturnType<WarpCoreSharedSurface["listStrands"]>>[number];

const LIVE_WORLDLINE_ID = "wl:live";

// Read the actual installed git-warp version at import time.
// createRequire is needed because package.json isn't an ES module.
import { createRequire } from "node:module";
const gitWarpPkg = createRequire(import.meta.url)("@git-stunts/git-warp/package.json") as { version: string };
const GIT_WARP_HOST_VERSION: string = gitWarpPkg.version;

/**
 * Builds the frame index from TickReceipts.
 *
 * Frame 0 = empty (no tick, no receipts).
 * Frame N = all receipts at the Nth unique Lamport tick.
 *
 * Receipts are grouped by lamport value and sorted ascending.
 */
function buildFrameIndex(receipts: TickReceipt[]): IndexedFrame[] {
  const byTick = new Map<number, TickReceipt[]>();

  for (const r of receipts) {
    let group = byTick.get(r.lamport);

    if (!group) {
      group = [];
      byTick.set(r.lamport, group);
    }

    group.push(r);
  }

  const ticks = [...byTick.keys()].sort((a, b) => a - b);

  return ticks.map((tick) => ({
    tick,
    // Safe: ticks array was built from byTick.keys()
    receipts: byTick.get(tick) ?? []
  }));
}

function buildLiveWorldlineLane(): LaneRef {
  return {
    id: LIVE_WORLDLINE_ID,
    kind: "WORLDLINE",
    worldlineId: LIVE_WORLDLINE_ID,
    writable: false,
    description: "Live frontier worldline"
  };
}

function describeStrandScope(strand: StrandCatalogEntry): string {
  return strand.scope !== null && strand.scope !== ""
    ? ` (${strand.scope})`
    : "";
}

function toStrandLane(strand: StrandCatalogEntry): LaneRef {
  return {
    id: `ws:${strand.strandId}`,
    kind: "STRAND",
    worldlineId: LIVE_WORLDLINE_ID,
    parentId: LIVE_WORLDLINE_ID,
    writable: strand.overlay.writable,
    description: `Strand ${strand.strandId}${describeStrandScope(strand)}`
  };
}

async function buildLaneCatalog(
  graph: Pick<WarpCoreSharedSurface, "listStrands">
): Promise<LaneRef[]> {
  const strands = await graph.listStrands();

  return [buildLiveWorldlineLane(), ...strands.map(toStrandLane)];
}

function requireIndexedFrame(
  frameIndex: IndexedFrame[],
  index: number
): IndexedFrame {
  const frame = frameIndex[index];

  if (!frame) {
    throw new InternalIndexError(index, frameIndex.length);
  }

  return frame;
}

function countOps(
  receipt: TickReceipt
): { admitted: number; rejected: number; counterfactual: number } {
  let admitted = 0;
  let rejected = 0;
  let counterfactual = 0;

  for (const op of receipt.ops) {
    if (op.result === "applied") {
      admitted++;
    } else if (op.result === "superseded") {
      rejected++;
    } else if (op.result === "redundant") {
      counterfactual++;
    }
  }

  return { admitted, rejected, counterfactual };
}

function requireHead(
  headStates: ReadonlyMap<string, PlaybackHeadSnapshot>,
  headId: string
): PlaybackHeadSnapshot {
  const head = headStates.get(headId);

  if (!head) {
    throw new UnknownHeadError(headId);
  }

  return head;
}

function resolveRequestedFrameIndex(
  head: PlaybackHeadSnapshot,
  frameIndex?: number
): number {
  return frameIndex ?? head.currentFrameIndex;
}

function resolveIndexedFrameForResolvedIndex(
  frameIndex: IndexedFrame[],
  resolvedIndex: number
): IndexedFrame {
  const maxFrame = frameIndex.length;

  if (resolvedIndex < 0 || resolvedIndex > maxFrame) {
    throw new FrameOutOfRangeError(resolvedIndex, maxFrame);
  }

  return requireIndexedFrame(frameIndex, resolvedIndex - 1);
}

function resolveInputTick(
  frameIndex: IndexedFrame[],
  resolvedIndex: number
): number {
  if (resolvedIndex === 1) {
    return 0;
  }

  return requireIndexedFrame(frameIndex, resolvedIndex - 2).tick;
}

interface ReceiptSummaryArgs {
  readonly headId: string;
  readonly frameIndex: number;
  readonly outputTick: number;
  readonly inputTick: number;
  readonly receipt: TickReceipt;
}

function toReceiptSummary(args: ReceiptSummaryArgs): ReceiptSummary {
  const { headId, frameIndex, outputTick, inputTick, receipt } = args;
  const { admitted, rejected, counterfactual } = countOps(receipt);

  return {
    receiptId: `receipt:gw:${receipt.patchSha.slice(0, 8)}`,
    headId,
    frameIndex,
    laneId: LIVE_WORLDLINE_ID,
    worldlineId: LIVE_WORLDLINE_ID,
    writer: { writerId: receipt.writer, worldlineId: LIVE_WORLDLINE_ID },
    inputTick,
    outputTick,
    admittedRewriteCount: admitted,
    rejectedRewriteCount: rejected,
    counterfactualCount: counterfactual,
    digest: receipt.patchSha,
    summary: `Writer ${receipt.writer} at lamport ${receipt.lamport.toString()}: ${admitted.toString()} applied, ${rejected.toString()} superseded, ${counterfactual.toString()} redundant`
  };
}

function buildGenesisFrame(headId: string, lanes: readonly LaneRef[]): PlaybackFrame {
  return {
    headId,
    frameIndex: 0,
    lanes: lanes.map((lane) => ({
      laneId: lane.id,
      worldlineId: lane.worldlineId,
      coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: 0 },
      changed: false
    }))
  };
}

function toLaneFrameView(
  lane: LaneRef,
  indexed: IndexedFrame,
  previousTick: number
): LaneFrameView {
  const changed = lane.kind === "WORLDLINE" && indexed.tick !== previousTick;
  const view: LaneFrameView = {
    laneId: lane.id,
    worldlineId: lane.worldlineId,
    coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: indexed.tick },
    changed
  };

  if (changed && indexed.receipts[0]) {
    view.btrDigest = indexed.receipts[0].patchSha;
  }

  return view;
}

export class GitWarpAdapter<TMaterializedState, TNodeProps extends GitWarpNodeProps> implements TtdHostAdapter {
  public readonly adapterName = "git-warp";

  readonly #graph: WarpCoreLike<TMaterializedState, TNodeProps>;
  readonly #frameIndex: IndexedFrame[];
  readonly #lanes: LaneRef[];
  readonly #headStates = new Map<string, PlaybackHeadSnapshot>();

  private constructor(
    graph: WarpCoreLike<TMaterializedState, TNodeProps>,
    frameIndex: IndexedFrame[],
    lanes: LaneRef[]
  ) {
    this.#graph = graph;
    this.#frameIndex = frameIndex;
    this.#lanes = lanes;

    // Initialize the default playback head at frame 0
    const laneIds = lanes.map((l) => l.id);
    const writableIds = lanes.filter((l) => l.writable).map((l) => l.id);

    this.#headStates.set("head:default", {
      headId: "head:default",
      label: "Default Playback Head",
      currentFrameIndex: 0,
      trackedLaneIds: laneIds,
      writableLaneIds: writableIds,
      paused: true
    });
  }

  /**
   * Factory: opens a WarpCore graph and builds the frame index.
   *
   * The frame index is built once from the full materialized receipts.
   * This is a snapshot — it does not auto-refresh on new patches.
   */
  public static async create<TMaterializedState, TNodeProps extends GitWarpNodeProps>(
    graph: WarpCoreLike<TMaterializedState, TNodeProps>
  ): Promise<GitWarpAdapter<TMaterializedState, TNodeProps>> {
    const { receipts } = await graph.materialize({ receipts: true });
    const frameIndex = buildFrameIndex(receipts);
    const lanes = await buildLaneCatalog(graph);

    return new GitWarpAdapter(graph, frameIndex, lanes);
  }

  public hello(): Promise<HostHello> {
    return Promise.resolve({
      hostKind: "GIT_WARP",
      hostVersion: GIT_WARP_HOST_VERSION,
      protocolVersion: "0.5.0",
      schemaId: "ttd-protocol-git-warp-v1",
      capabilities: [
        "READ_HELLO",
        "READ_LANE_CATALOG",
        "READ_PLAYBACK_HEAD",
        "READ_FRAME",
        "READ_RECEIPTS",
        "READ_EFFECT_EMISSIONS",
        "CONTROL_STEP_FORWARD",
        "CONTROL_STEP_BACKWARD",
        "CONTROL_SEEK"
      ]
    });
  }

  public laneCatalog(): Promise<LaneCatalog> {
    return Promise.resolve({ lanes: [...this.#lanes] });
  }

  public playbackHead(headId: string): Promise<PlaybackHeadSnapshot> {
    return Promise.resolve({ ...requireHead(this.#headStates, headId) });
  }

  public frame(headId: string, frameIndex?: number): Promise<PlaybackFrame> {
    const resolvedIndex = resolveRequestedFrameIndex(
      requireHead(this.#headStates, headId),
      frameIndex
    );

    if (resolvedIndex !== 0) {
      resolveIndexedFrameForResolvedIndex(this.#frameIndex, resolvedIndex);
    }

    return Promise.resolve(this.#buildFrame(headId, resolvedIndex));
  }

  public receipts(headId: string, frameIndex?: number): Promise<ReceiptSummary[]> {
    const resolvedIndex = resolveRequestedFrameIndex(
      requireHead(this.#headStates, headId),
      frameIndex
    );

    // Frame 0 has no receipts
    if (resolvedIndex === 0) {
      return Promise.resolve([]);
    }

    const indexed = resolveIndexedFrameForResolvedIndex(this.#frameIndex, resolvedIndex);
    const inputTick = resolveInputTick(this.#frameIndex, resolvedIndex);

    return Promise.resolve(
      indexed.receipts.map((receipt) =>
        toReceiptSummary({
          headId,
          frameIndex: resolvedIndex,
          outputTick: indexed.tick,
          inputTick,
          receipt
        })
      )
    );
  }

  public stepForward(headId: string): Promise<PlaybackFrame> {
    const head = requireHead(this.#headStates, headId);

    const maxFrame = this.#frameIndex.length;
    const nextIndex = Math.min(head.currentFrameIndex + 1, maxFrame);

    this.#headStates.set(headId, {
      ...head,
      currentFrameIndex: nextIndex,
      paused: true
    });

    return Promise.resolve(this.#buildFrame(headId, nextIndex));
  }

  public stepBackward(headId: string): Promise<PlaybackFrame> {
    const head = requireHead(this.#headStates, headId);

    const prevIndex = Math.max(head.currentFrameIndex - 1, 0);

    this.#headStates.set(headId, {
      ...head,
      currentFrameIndex: prevIndex,
      paused: true
    });

    return Promise.resolve(this.#buildFrame(headId, prevIndex));
  }

  public seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
    const head = requireHead(this.#headStates, headId);

    // maxFrame = #frameIndex.length because frame 0 is synthetic (empty)
    // and real frames are 1-indexed into #frameIndex
    const maxFrame = this.#frameIndex.length;
    const clampedIndex = Math.max(0, Math.min(frameIndex, maxFrame));

    this.#headStates.set(headId, {
      ...head,
      currentFrameIndex: clampedIndex,
      paused: true
    });

    return Promise.resolve(this.#buildFrame(headId, clampedIndex));
  }

  #buildFrame(headId: string, frameIndex: number): PlaybackFrame {
    if (frameIndex === 0) {
      return buildGenesisFrame(headId, this.#lanes);
    }

    const indexed = resolveIndexedFrameForResolvedIndex(this.#frameIndex, frameIndex);
    const previousTick = resolveInputTick(this.#frameIndex, frameIndex);

    return {
      headId,
      frameIndex,
      lanes: this.#lanes.map((lane) => toLaneFrameView(lane, indexed, previousTick))
    };
  }

  // --- Effect/delivery inspection ---

  public effectEmissions(headId: string, frameIndex?: number): Promise<EffectEmissionSummary[]> {
    const resolvedIndex = resolveRequestedFrameIndex(
      requireHead(this.#headStates, headId),
      frameIndex
    );

    if (resolvedIndex === 0) {
      return Promise.resolve([]);
    }

    const indexed = resolveIndexedFrameForResolvedIndex(this.#frameIndex, resolvedIndex);

    return extractGitWarpEffectEmissions({
      graph: this.#graph,
      headId,
      frameIndex: resolvedIndex,
      indexedFrame: indexed,
      laneId: LIVE_WORLDLINE_ID,
      worldlineId: LIVE_WORLDLINE_ID
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface requires frameIndex param
  public deliveryObservations(headId: string, _frameIndex?: number): Promise<DeliveryObservationSummary[]> {
    requireHead(this.#headStates, headId);
    return Promise.resolve([]);
  }

  public executionContext(): Promise<ExecutionContext> {
    return Promise.resolve({ mode: "DEBUG" });
  }
}

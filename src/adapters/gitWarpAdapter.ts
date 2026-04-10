/**
 * git-warp host adapter for warp-ttd.
 *
 * Bridges WarpCore's deterministic graph substrate into TTD's
 * protocol shape: frames indexed by Lamport tick, receipts
 * derived from TickReceipts, lanes from worldlines and strands.
 */
import type { TtdHostAdapter } from "../adapter.ts";
import {
  FrameOutOfRangeError,
  InternalIndexError,
  UnknownHeadError
} from "../errors.ts";
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

interface StrandDescriptor {
  readonly strandId: string;
  readonly owner: string | null;
  readonly scope: string | null;
  readonly overlay: {
    readonly writable: boolean;
  };
}

interface WarpCoreLike {
  materialize(options: { receipts: true; ceiling?: number | null }): Promise<{
    state: unknown;
    receipts: TickReceipt[];
  }>;
  materialize(options?: { receipts?: false; ceiling?: number | null }): Promise<unknown>;
  discoverWriters(): Promise<string[]>;
  listStrands(): Promise<StrandDescriptor[]>;
  getNodes(): Promise<string[]>;
  getEdges(): Promise<{ from: string; to: string; label: string }[]>;
}

/**
 * A single indexed frame: the Lamport tick it represents and the
 * TickReceipts that belong to it.
 */
interface IndexedFrame {
  readonly tick: number;
  readonly receipts: TickReceipt[];
}

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

export class GitWarpAdapter implements TtdHostAdapter {
  public readonly adapterName = "git-warp";

  // eslint-disable-next-line no-unused-private-class-members -- retained for future strand operations & live refresh
  readonly #graph: WarpCoreLike;
  readonly #frameIndex: IndexedFrame[];
  readonly #lanes: LaneRef[];
  readonly #headStates = new Map<string, PlaybackHeadSnapshot>();

  private constructor(
    graph: WarpCoreLike,
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
  public static async create(graph: WarpCoreLike): Promise<GitWarpAdapter> {
    const { receipts } = await graph.materialize({ receipts: true });
    const frameIndex = buildFrameIndex(receipts);

    // Build lanes: live worldline + any strands
    const lanes: LaneRef[] = [
      {
        id: LIVE_WORLDLINE_ID,
        kind: "WORLDLINE",
        worldlineId: LIVE_WORLDLINE_ID,
        writable: false,
        description: "Live frontier worldline"
      }
    ];

    const strands = await graph.listStrands();

    for (const strand of strands) {
      lanes.push({
        id: `ws:${strand.strandId}`,
        kind: "STRAND",
        worldlineId: LIVE_WORLDLINE_ID,
        parentId: LIVE_WORLDLINE_ID,
        writable: strand.overlay.writable,
        description: `Strand ${strand.strandId}${strand.scope !== null && strand.scope !== "" ? ` (${strand.scope})` : ""}`
      });
    }

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
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

    return Promise.resolve({ ...head });
  }

  public frame(headId: string, frameIndex?: number): Promise<PlaybackFrame> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

    const resolvedIndex = frameIndex ?? head.currentFrameIndex;

    // Total frames: frame 0 (empty) + one per indexed tick
    const maxFrame = this.#frameIndex.length;

    if (resolvedIndex < 0 || resolvedIndex > maxFrame) {
      throw new FrameOutOfRangeError(resolvedIndex, maxFrame);
    }

    return Promise.resolve(this.#buildFrame(headId, resolvedIndex));
  }

  public receipts(headId: string, frameIndex?: number): Promise<ReceiptSummary[]> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

    const resolvedIndex = frameIndex ?? head.currentFrameIndex;

    // Frame 0 has no receipts
    if (resolvedIndex === 0) {
      return Promise.resolve([]);
    }

    const maxFrame = this.#frameIndex.length;

    if (resolvedIndex < 0 || resolvedIndex > maxFrame) {
      throw new FrameOutOfRangeError(resolvedIndex, maxFrame);
    }

    const indexed = this.#frameIndex[resolvedIndex - 1];

    if (!indexed) {
      return Promise.resolve([]);
    }

    return Promise.resolve(indexed.receipts.map((r) => {
      const { admitted, rejected, counterfactual } = countOps(r);

      return {
        receiptId: `receipt:gw:${r.patchSha.slice(0, 8)}`,
        headId,
        frameIndex: resolvedIndex,
        laneId: LIVE_WORLDLINE_ID,
        worldlineId: LIVE_WORLDLINE_ID,
        writer: { writerId: r.writer, worldlineId: LIVE_WORLDLINE_ID },
        inputTick: resolvedIndex === 1 ? 0 : requireIndexedFrame(this.#frameIndex, resolvedIndex - 2).tick,
        outputTick: indexed.tick,
        admittedRewriteCount: admitted,
        rejectedRewriteCount: rejected,
        counterfactualCount: counterfactual,
        digest: r.patchSha,
        summary: `Writer ${r.writer} at lamport ${r.lamport.toString()}: ${admitted.toString()} applied, ${rejected.toString()} superseded, ${counterfactual.toString()} redundant`
      };
    }));
  }

  public stepForward(headId: string): Promise<PlaybackFrame> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

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
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

    const prevIndex = Math.max(head.currentFrameIndex - 1, 0);

    this.#headStates.set(headId, {
      ...head,
      currentFrameIndex: prevIndex,
      paused: true
    });

    return Promise.resolve(this.#buildFrame(headId, prevIndex));
  }

  public seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new UnknownHeadError(headId);
    }

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
      return {
        headId,
        frameIndex: 0,
        lanes: this.#lanes.map((lane) => ({
          laneId: lane.id,
          worldlineId: lane.worldlineId,
          coordinate: { laneId: lane.id, worldlineId: lane.worldlineId, tick: 0 },
          changed: false
        }))
      };
    }

    const indexed = requireIndexedFrame(this.#frameIndex, frameIndex - 1);

    // Determine previous tick for change detection
    const prevTick = frameIndex >= 2 ? requireIndexedFrame(this.#frameIndex, frameIndex - 2).tick : 0;

    return {
      headId,
      frameIndex,
      lanes: this.#lanes.map((lane) => {
        const changed = lane.kind === "WORLDLINE" && indexed.tick !== prevTick;
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
      })
    };
  }

  // --- Effect/delivery inspection (provisional — awaiting git-warp adapter wiring) ---

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface requires frameIndex param
  public effectEmissions(headId: string, _frameIndex?: number): Promise<EffectEmissionSummary[]> {
    if (!this.#headStates.has(headId)) {
      throw new UnknownHeadError(headId);
    }
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface requires frameIndex param
  public deliveryObservations(headId: string, _frameIndex?: number): Promise<DeliveryObservationSummary[]> {
    if (!this.#headStates.has(headId)) {
      throw new UnknownHeadError(headId);
    }
    return Promise.resolve([]);
  }

  public executionContext(): Promise<ExecutionContext> {
    return Promise.resolve({ mode: "DEBUG" });
  }
}

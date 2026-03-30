/**
 * git-warp host adapter for warp-ttd.
 *
 * Bridges WarpCore's deterministic graph substrate into TTD's
 * protocol shape: frames indexed by Lamport tick, receipts
 * derived from TickReceipts, lanes from worldlines and strands.
 */
import type { TtdHostAdapter } from "../adapter.ts";
import type {
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
type TickReceipt = {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly {
    readonly op: string;
    readonly target: string;
    readonly result: string;
    readonly reason?: string;
  }[];
};

type StrandDescriptor = {
  readonly strandId: string;
  readonly owner: string | null;
  readonly scope: string | null;
  readonly overlay: {
    readonly writable: boolean;
  };
};

type WarpCoreLike = {
  materialize(options: { receipts: true; ceiling?: number | null }): Promise<{
    state: unknown;
    receipts: TickReceipt[];
  }>;
  materialize(options?: { receipts?: false; ceiling?: number | null }): Promise<unknown>;
  discoverWriters(): Promise<string[]>;
  listStrands(): Promise<StrandDescriptor[]>;
  getNodes(): Promise<string[]>;
  getEdges(): Promise<{ from: string; to: string; label: string }[]>;
};

/**
 * A single indexed frame: the Lamport tick it represents and the
 * TickReceipts that belong to it.
 */
type IndexedFrame = {
  readonly tick: number;
  readonly receipts: TickReceipt[];
};

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
    throw new Error(
      `Internal frame index ${index} out of bounds (length: ${frameIndex.length})`
    );
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
  readonly adapterName = "git-warp";

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
  static async create(graph: WarpCoreLike): Promise<GitWarpAdapter> {
    const { receipts } = await graph.materialize({ receipts: true });
    const frameIndex = buildFrameIndex(receipts);

    // Build lanes: live worldline + any strands
    const lanes: LaneRef[] = [
      {
        id: "wl:live",
        kind: "worldline",
        writable: false,
        description: "Live frontier worldline"
      }
    ];

    const strands = await graph.listStrands();

    for (const strand of strands) {
      lanes.push({
        id: `ws:${strand.strandId}`,
        kind: "working-set",
        parentId: "wl:live",
        writable: strand.overlay.writable,
        description: `Strand ${strand.strandId}${strand.scope ? ` (${strand.scope})` : ""}`
      });
    }

    return new GitWarpAdapter(graph, frameIndex, lanes);
  }

  async hello(): Promise<HostHello> {
    return {
      hostKind: "git-warp",
      hostVersion: GIT_WARP_HOST_VERSION,
      protocolVersion: "0.1.0",
      schemaId: "ttd-protocol-git-warp-v1",
      capabilities: [
        "read:hello",
        "read:lane-catalog",
        "read:playback-head",
        "read:frame",
        "read:receipts",
        "control:step-forward"
      ]
    };
  }

  async laneCatalog(): Promise<LaneCatalog> {
    return { lanes: [...this.#lanes] };
  }

  async playbackHead(headId: string): Promise<PlaybackHeadSnapshot> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new Error(`Unknown playback head: ${headId}`);
    }

    return { ...head };
  }

  async frame(headId: string, frameIndex?: number): Promise<PlaybackFrame> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new Error(`Unknown playback head: ${headId}`);
    }

    const resolvedIndex = frameIndex ?? head.currentFrameIndex;

    // Total frames: frame 0 (empty) + one per indexed tick
    const maxFrame = this.#frameIndex.length;

    if (resolvedIndex < 0 || resolvedIndex > maxFrame) {
      throw new Error(
        `Frame index ${resolvedIndex} out of range [0, ${maxFrame}]`
      );
    }

    return this.#buildFrame(headId, resolvedIndex);
  }

  async receipts(headId: string, frameIndex?: number): Promise<ReceiptSummary[]> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new Error(`Unknown playback head: ${headId}`);
    }

    const resolvedIndex = frameIndex ?? head.currentFrameIndex;

    // Frame 0 has no receipts
    if (resolvedIndex === 0) {
      return [];
    }

    const maxFrame = this.#frameIndex.length;

    if (resolvedIndex < 0 || resolvedIndex > maxFrame) {
      throw new Error(
        `Frame index ${resolvedIndex} out of range [0, ${maxFrame}]`
      );
    }

    const indexed = this.#frameIndex[resolvedIndex - 1];

    if (!indexed) {
      return [];
    }

    return indexed.receipts.map((r, i) => {
      const { admitted, rejected, counterfactual } = countOps(r);

      return {
        receiptId: `receipt:gw:${r.patchSha.slice(0, 8)}`,
        headId,
        frameIndex: resolvedIndex,
        laneId: "wl:live",
        inputTick: resolvedIndex === 1 ? 0 : requireIndexedFrame(this.#frameIndex, resolvedIndex - 2).tick,
        outputTick: indexed.tick,
        admittedRewriteCount: admitted,
        rejectedRewriteCount: rejected,
        counterfactualCount: counterfactual,
        digest: r.patchSha,
        summary: `Writer ${r.writer} at lamport ${r.lamport}: ${admitted} applied, ${rejected} superseded, ${counterfactual} redundant`
      };
    });
  }

  async stepForward(headId: string): Promise<PlaybackFrame> {
    const head = this.#headStates.get(headId);

    if (!head) {
      throw new Error(`Unknown playback head: ${headId}`);
    }

    const maxFrame = this.#frameIndex.length;
    const nextIndex = Math.min(head.currentFrameIndex + 1, maxFrame);

    this.#headStates.set(headId, {
      ...head,
      currentFrameIndex: nextIndex,
      paused: true
    });

    return this.#buildFrame(headId, nextIndex);
  }

  #buildFrame(headId: string, frameIndex: number): PlaybackFrame {
    if (frameIndex === 0) {
      return {
        headId,
        frameIndex: 0,
        lanes: this.#lanes.map((lane) => ({
          laneId: lane.id,
          coordinate: { laneId: lane.id, tick: 0 },
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
        const changed = lane.kind === "worldline" && indexed.tick !== prevTick;
        const view: LaneFrameView = {
          laneId: lane.id,
          coordinate: { laneId: lane.id, tick: indexed.tick },
          changed
        };

        if (changed && indexed.receipts[0]) {
          view.btrDigest = indexed.receipts[0].patchSha;
        }

        return view;
      })
    };
  }
}

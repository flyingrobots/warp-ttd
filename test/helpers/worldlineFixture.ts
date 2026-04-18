/**
 * Shared worldline test fixtures.
 *
 * Used by worldlineLayout, worldlineRender, and worldlineSplitView specs
 * to avoid copy-pasting the same lane/frame/receipt builders.
 */
import type { LaneRef, LaneFrameView, ReceiptSummary } from "../../src/protocol.ts";
import type { FrameData } from "../../src/tui/worldlineLayout.ts";

export function makeLane(id: string, kind: "WORLDLINE" | "STRAND", parentId?: string): LaneRef {
  return {
    id,
    kind,
    worldlineId: kind === "WORLDLINE" ? id : (parentId ?? "wl:main"),
    ...(parentId !== undefined ? { parentId } : {}),
    writable: false,
    description: `${kind.toLowerCase()} ${id}`
  };
}

function withDigest(laneFrame: LaneFrameView, btrDigest?: string): LaneFrameView {
  if (btrDigest === undefined) {
    return laneFrame;
  }

  return { ...laneFrame, btrDigest };
}

export function makeLaneFrame(laneId: string, tick: number, opts?: {
  changed?: boolean;
  btrDigest?: string;
  worldlineId?: string;
}): LaneFrameView {
  const worldlineId = opts?.worldlineId ?? laneId;

  return withDigest({
    laneId,
    worldlineId,
    coordinate: { laneId, worldlineId, tick },
    changed: opts?.changed === true,
  }, opts?.btrDigest);
}

export interface ReceiptOpts {
  laneId: string;
  worldlineId?: string;
  writerId: string;
  headId?: string;
  frameIndex: number;
  admitted?: number;
  rejected?: number;
  counterfactual?: number;
}

function makeWriter(opts: ReceiptOpts, worldlineId: string): import("../../src/protocol.ts").WriterRef {
  const base = { writerId: opts.writerId, worldlineId };
  return opts.headId === undefined ? base : { ...base, headId: opts.headId };
}

export function makeReceipt(opts: ReceiptOpts): ReceiptSummary {
  const worldlineId = opts.worldlineId ?? opts.laneId;
  return {
    receiptId: `receipt:${opts.laneId}:${String(opts.frameIndex)}`,
    headId: "head:default",
    frameIndex: opts.frameIndex,
    laneId: opts.laneId,
    worldlineId,
    writer: makeWriter(opts, worldlineId),
    inputTick: opts.frameIndex,
    outputTick: opts.frameIndex + 1,
    admittedRewriteCount: opts.admitted ?? 1,
    rejectedRewriteCount: opts.rejected ?? 0,
    counterfactualCount: opts.counterfactual ?? 0,
    digest: `digest:${String(opts.frameIndex)}`,
    summary: `receipt at frame ${String(opts.frameIndex)}`,
  };
}

export function makeHistory(): { catalog: LaneRef[]; frames: FrameData[] } {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("strand:experiment", "STRAND", "wl:main"),
  ];

  return {
    catalog,
    frames: [
      { frameIndex: 0, lanes: [makeLaneFrame("wl:main", 0, { btrDigest: "abc1234" })], receipts: [] },
      { frameIndex: 1, lanes: [makeLaneFrame("wl:main", 1, { changed: true, btrDigest: "def5678" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 1 })] },
      {
        frameIndex: 2,
        lanes: [
          makeLaneFrame("wl:main", 2, { changed: true, btrDigest: "ghi9012" }),
          makeLaneFrame("strand:experiment", 1, { changed: true, btrDigest: "jkl3456", worldlineId: "wl:main" })
        ],
        receipts: [
          makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 2, admitted: 2, rejected: 1 }),
          makeReceipt({ laneId: "strand:experiment", worldlineId: "wl:main", writerId: "bob", frameIndex: 2 })
        ],
      },
      { frameIndex: 3, lanes: [makeLaneFrame("wl:main", 3, { changed: true, btrDigest: "mno7890" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "carol", frameIndex: 3 })] },
      {
        frameIndex: 4,
        lanes: [makeLaneFrame("wl:main", 4, { changed: true, btrDigest: "stu5678" })],
        receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 4 }), makeReceipt({ laneId: "wl:main", writerId: "bob", frameIndex: 4, admitted: 1, rejected: 2, counterfactual: 2 })],
      },
    ],
  };
}

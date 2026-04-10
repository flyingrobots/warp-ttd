/**
 * Worldline layout — pure rendering logic tests.
 *
 * Cycle 0010 — Worldline Viewer.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { LaneRef, LaneFrameView, ReceiptSummary } from "../src/protocol.ts";
import {
  buildTickRows,
  buildTickLine,
  scrollWindow,
} from "../src/tui/worldlineLayout.ts";
import type { FrameData } from "../src/tui/worldlineLayout.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLane(id: string, kind: "WORLDLINE" | "STRAND", parentId?: string): LaneRef {
  return {
    id,
    kind,
    worldlineId: kind === "WORLDLINE" ? id : (parentId ?? "wl:main"),
    ...(parentId !== undefined ? { parentId } : {}),
    writable: kind === "WORLDLINE",
    description: `${kind.toLowerCase()} ${id}`
  };
}

function withDigest(laneFrame: LaneFrameView, btrDigest?: string): LaneFrameView {
  if (btrDigest === undefined) {
    return laneFrame;
  }

  return { ...laneFrame, btrDigest };
}

function makeLaneFrame(laneId: string, tick: number, opts?: {
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

interface ReceiptOpts {
  laneId: string;
  worldlineId?: string;
  writerId: string;
  frameIndex: number;
  admitted?: number;
  rejected?: number;
  counterfactual?: number;
}

function makeReceipt(opts: ReceiptOpts): ReceiptSummary {
  return {
    receiptId: `receipt:${opts.laneId}:${String(opts.frameIndex)}`,
    headId: "head:default",
    frameIndex: opts.frameIndex,
    laneId: opts.laneId,
    worldlineId: opts.worldlineId ?? opts.laneId,
    writerId: opts.writerId,
    inputTick: opts.frameIndex,
    outputTick: opts.frameIndex + 1,
    admittedRewriteCount: opts.admitted ?? 1,
    rejectedRewriteCount: opts.rejected ?? 0,
    counterfactualCount: opts.counterfactual ?? 0,
    digest: `digest:${String(opts.frameIndex)}`,
    summary: `receipt at frame ${String(opts.frameIndex)}`,
  };
}

function makeHistory(): { catalog: LaneRef[]; frames: FrameData[] } {
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

// ---------------------------------------------------------------------------
// buildTickRows
// ---------------------------------------------------------------------------

test("buildTickRows returns one row per frame in reverse order (newest first)", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  assert.equal(rows.length, 5);
  assert.equal(rows[0]?.frameIndex, 4);
  assert.equal(rows[4]?.frameIndex, 0);
});

test("buildTickRows includes writer attribution from receipts", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  const frame4 = rows[0];
  assert.ok(frame4 !== undefined);
  assert.ok(frame4.writers.includes("alice"));
  assert.ok(frame4.writers.includes("bob"));
});

test("buildTickRows marks frames with rejected rewrites as conflicted", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  const frame2 = rows.find((r) => r.frameIndex === 2);
  assert.equal(frame2?.hasConflict, true);
  const frame4 = rows.find((r) => r.frameIndex === 4);
  assert.equal(frame4?.hasConflict, true);
  const frame1 = rows.find((r) => r.frameIndex === 1);
  assert.equal(frame1?.hasConflict, false);
});

test("buildTickRows includes strand labels for frames with multiple lanes", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  const frame2 = rows.find((r) => r.frameIndex === 2);
  assert.ok(frame2 !== undefined);
  assert.ok(frame2.strandIds.includes("strand:experiment"));
});

test("buildTickRows includes BTR digest from primary lane", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  const frame1 = rows.find((r) => r.frameIndex === 1);
  assert.equal(frame1?.digest, "def5678");
});

// ---------------------------------------------------------------------------
// buildTickLine
// ---------------------------------------------------------------------------

test("buildTickLine shows frame index and truncated digest", () => {
  const line = buildTickLine({
    frameIndex: 3, digest: "mno7890abcdef", writers: ["carol"],
    hasConflict: false, strandIds: [], laneId: "wl:main", tick: 3, activeLaneIds: ["wl:main"],
  }, { width: 80, selected: false });
  assert.ok(line.includes("3"));
  assert.ok(line.includes("mno7890"));
});

test("buildTickLine shows conflict indicator for frames with rejections", () => {
  const line = buildTickLine({
    frameIndex: 2, digest: "ghi9012", writers: ["alice"],
    hasConflict: true, strandIds: [], laneId: "wl:main", tick: 2, activeLaneIds: ["wl:main"],
  }, { width: 80, selected: false });
  assert.ok(line.includes("!"));
});

test("buildTickLine shows frame and digest without strand labels", () => {
  const line = buildTickLine({
    frameIndex: 2, digest: "jkl3456", writers: ["bob"],
    hasConflict: false, strandIds: ["strand:experiment"], laneId: "strand:experiment", tick: 1, activeLaneIds: ["strand:experiment"],
  }, { width: 80, selected: false });
  assert.ok(line.includes("2"));
  assert.ok(line.includes("jkl3456"));
  assert.ok(!line.includes("strand:experiment"), "Strand labels should not appear in tick line");
});

test("buildTickLine marks selected row", () => {
  const line = buildTickLine({
    frameIndex: 1, digest: "def5678", writers: ["alice"],
    hasConflict: false, strandIds: [], laneId: "wl:main", tick: 1, activeLaneIds: ["wl:main"],
  }, { width: 80, selected: true });
  assert.ok(line.includes(">"));
});

test("buildTickLine shows conflict and digest for multi-writer frame", () => {
  const line = buildTickLine({
    frameIndex: 4, digest: "stu5678", writers: ["alice", "bob"],
    hasConflict: true, strandIds: [], laneId: "wl:main", tick: 4, activeLaneIds: ["wl:main"],
  }, { width: 80, selected: false });
  assert.ok(line.includes("!"));
  assert.ok(line.includes("stu5678"));
});

// ---------------------------------------------------------------------------
// scrollWindow
// ---------------------------------------------------------------------------

test("scrollWindow returns full list when it fits", () => {
  const items = [0, 1, 2, 3, 4];
  const { visible, offset } = scrollWindow(items, 0, 10);
  assert.equal(visible.length, 5);
  assert.equal(offset, 0);
});

test("scrollWindow centers on cursor position", () => {
  const items: number[] = [];
  for (let i = 0; i < 100; i++) items.push(i);
  const { visible } = scrollWindow(items, 50, 20);
  assert.ok(visible.includes(50));
  assert.equal(visible.length, 20);
});

test("scrollWindow clamps at boundaries", () => {
  const items: number[] = [];
  for (let i = 0; i < 100; i++) items.push(i);
  const start = scrollWindow(items, 2, 20);
  assert.equal(start.offset, 0);
  const end = scrollWindow(items, 98, 20);
  assert.equal(end.offset, 80);
});

// ---------------------------------------------------------------------------
// Genesis frame
// ---------------------------------------------------------------------------

test("buildTickRows handles genesis frame with no receipts", () => {
  const { frames, catalog } = makeHistory();
  const rows = buildTickRows(frames, catalog);
  const genesis = rows.find((r) => r.frameIndex === 0);
  assert.ok(genesis !== undefined);
  assert.equal(genesis.writers.length, 0);
  assert.equal(genesis.hasConflict, false);
});

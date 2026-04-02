/**
 * Worldline layout — pure rendering logic tests.
 *
 * Cycle 0010 — Worldline Viewer (RED phase).
 *
 * Tests the pure helper functions that build worldline tick rows
 * from protocol data. Follows the navigatorLayout pattern:
 * pure functions in, renderable data out.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { LaneRef, LaneFrameView, ReceiptSummary } from "../src/protocol.ts";

// --- will import from src/tui/worldlineLayout.ts once it exists ---
// import {
//   buildTickRows,
//   buildTickLine,
//   MAX_VISIBLE_TICKS,
//   scrollWindow,
// } from "../src/tui/worldlineLayout.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLane(id: string, kind: "worldline" | "strand", parentId?: string): LaneRef {
  return { id, kind, parentId, writable: kind === "worldline", description: `${kind} ${id}` };
}

function makeLaneFrame(laneId: string, tick: number, opts?: {
  changed?: boolean;
  btrDigest?: string;
}): LaneFrameView {
  return {
    laneId,
    coordinate: { laneId, tick },
    changed: opts?.changed ?? false,
    btrDigest: opts?.btrDigest,
  };
}

function makeReceipt(laneId: string, writerId: string, frameIndex: number, opts?: {
  admitted?: number;
  rejected?: number;
  counterfactual?: number;
}): ReceiptSummary {
  return {
    receiptId: `receipt:${laneId}:${String(frameIndex)}`,
    headId: "head:default",
    frameIndex,
    laneId,
    writerId,
    inputTick: frameIndex,
    outputTick: frameIndex + 1,
    admittedRewriteCount: opts?.admitted ?? 1,
    rejectedRewriteCount: opts?.rejected ?? 0,
    counterfactualCount: opts?.counterfactual ?? 0,
    digest: `digest:${String(frameIndex)}`,
    summary: `receipt at frame ${String(frameIndex)}`,
  };
}

/** A multi-tick worldline with a strand fork and conflicts. */
function makeHistory(): {
  catalog: LaneRef[];
  frames: Array<{ frameIndex: number; lanes: LaneFrameView[]; receipts: ReceiptSummary[] }>;
} {
  const catalog = [
    makeLane("wl:main", "worldline"),
    makeLane("strand:experiment", "strand", "wl:main"),
  ];

  return {
    catalog,
    frames: [
      {
        frameIndex: 0,
        lanes: [makeLaneFrame("wl:main", 0, { btrDigest: "abc1234" })],
        receipts: [],
      },
      {
        frameIndex: 1,
        lanes: [makeLaneFrame("wl:main", 1, { changed: true, btrDigest: "def5678" })],
        receipts: [makeReceipt("wl:main", "alice", 1)],
      },
      {
        frameIndex: 2,
        lanes: [
          makeLaneFrame("wl:main", 2, { changed: true, btrDigest: "ghi9012" }),
          makeLaneFrame("strand:experiment", 1, { changed: true, btrDigest: "jkl3456" }),
        ],
        receipts: [
          makeReceipt("wl:main", "alice", 2, { admitted: 2, rejected: 1 }),
          makeReceipt("strand:experiment", "bob", 2),
        ],
      },
      {
        frameIndex: 3,
        lanes: [
          makeLaneFrame("wl:main", 3, { changed: true, btrDigest: "mno7890" }),
          makeLaneFrame("strand:experiment", 2, { btrDigest: "pqr1234" }),
        ],
        receipts: [makeReceipt("wl:main", "carol", 3)],
      },
      {
        frameIndex: 4,
        lanes: [makeLaneFrame("wl:main", 4, { changed: true, btrDigest: "stu5678" })],
        receipts: [
          makeReceipt("wl:main", "alice", 4),
          makeReceipt("wl:main", "bob", 4, { admitted: 1, rejected: 2, counterfactual: 2 }),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// buildTickRows — transforms frame history into renderable tick rows
// ---------------------------------------------------------------------------

test("buildTickRows returns one row per frame in reverse order (newest first)", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // assert.equal(rows.length, 5);
  // assert.equal(rows[0].frameIndex, 4); // newest first
  // assert.equal(rows[4].frameIndex, 0); // oldest last
  assert.fail("not implemented — RED");
});

test("buildTickRows includes writer attribution from receipts", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // const frame4 = rows[0]; // newest
  // assert.ok(frame4.writers.includes("alice"));
  // assert.ok(frame4.writers.includes("bob"));
  assert.fail("not implemented — RED");
});

test("buildTickRows marks frames with rejected rewrites as conflicted", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // const frame2 = rows.find(r => r.frameIndex === 2);
  // assert.ok(frame2?.hasConflict); // frame 2 has rejected: 1
  // const frame4 = rows.find(r => r.frameIndex === 4);
  // assert.ok(frame4?.hasConflict); // frame 4 has rejected: 2
  // const frame1 = rows.find(r => r.frameIndex === 1);
  // assert.equal(frame1?.hasConflict, false); // no rejections
  assert.fail("not implemented — RED");
});

test("buildTickRows includes strand labels for frames with multiple lanes", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // const frame2 = rows.find(r => r.frameIndex === 2);
  // assert.ok(frame2?.strandIds.includes("strand:experiment"));
  assert.fail("not implemented — RED");
});

test("buildTickRows includes BTR digest from primary lane", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // const frame1 = rows.find(r => r.frameIndex === 1);
  // assert.equal(frame1?.digest, "def5678");
  assert.fail("not implemented — RED");
});

// ---------------------------------------------------------------------------
// buildTickLine — renders a single tick row to a string
// ---------------------------------------------------------------------------

test("buildTickLine shows frame index and truncated digest", () => {
  // const line = buildTickLine({
  //   frameIndex: 3,
  //   digest: "mno7890abcdef",
  //   writers: ["carol"],
  //   hasConflict: false,
  //   strandIds: [],
  //   laneId: "wl:main",
  // }, { width: 80, selected: false });
  // assert.ok(line.includes("3"));
  // assert.ok(line.includes("mno7890")); // truncated
  // assert.ok(line.includes("carol"));
  assert.fail("not implemented — RED");
});

test("buildTickLine shows conflict indicator for frames with rejections", () => {
  // const line = buildTickLine({
  //   frameIndex: 2,
  //   digest: "ghi9012",
  //   writers: ["alice"],
  //   hasConflict: true,
  //   strandIds: [],
  //   laneId: "wl:main",
  // }, { width: 80, selected: false });
  // assert.ok(line.includes("!")); // conflict marker
  assert.fail("not implemented — RED");
});

test("buildTickLine shows strand label when strands are active", () => {
  // const line = buildTickLine({
  //   frameIndex: 2,
  //   digest: "jkl3456",
  //   writers: ["bob"],
  //   hasConflict: false,
  //   strandIds: ["strand:experiment"],
  //   laneId: "strand:experiment",
  // }, { width: 80, selected: false });
  // assert.ok(line.includes("strand:experiment"));
  assert.fail("not implemented — RED");
});

test("buildTickLine marks selected row", () => {
  // const line = buildTickLine({
  //   frameIndex: 1,
  //   digest: "def5678",
  //   writers: ["alice"],
  //   hasConflict: false,
  //   strandIds: [],
  //   laneId: "wl:main",
  // }, { width: 80, selected: true });
  // assert.ok(line.includes(">")); // selection indicator
  assert.fail("not implemented — RED");
});

test("buildTickLine handles multiple writers", () => {
  // const line = buildTickLine({
  //   frameIndex: 4,
  //   digest: "stu5678",
  //   writers: ["alice", "bob"],
  //   hasConflict: true,
  //   strandIds: [],
  //   laneId: "wl:main",
  // }, { width: 80, selected: false });
  // assert.ok(line.includes("alice"));
  // assert.ok(line.includes("bob"));
  assert.fail("not implemented — RED");
});

// ---------------------------------------------------------------------------
// scrollWindow — virtual scroll for large histories
// ---------------------------------------------------------------------------

test("scrollWindow returns full list when it fits", () => {
  // const items = Array.from({ length: 5 }, (_, i) => i);
  // const { visible, offset } = scrollWindow(items, 0, 10);
  // assert.equal(visible.length, 5);
  // assert.equal(offset, 0);
  assert.fail("not implemented — RED");
});

test("scrollWindow centers on cursor position", () => {
  // const items = Array.from({ length: 100 }, (_, i) => i);
  // const { visible, offset } = scrollWindow(items, 50, 20);
  // assert.ok(visible.includes(50)); // cursor is in view
  // assert.equal(visible.length, 20);
  assert.fail("not implemented — RED");
});

test("scrollWindow clamps at boundaries", () => {
  // const items = Array.from({ length: 100 }, (_, i) => i);
  // // cursor near start
  // const start = scrollWindow(items, 2, 20);
  // assert.equal(start.offset, 0);
  // // cursor near end
  // const end = scrollWindow(items, 98, 20);
  // assert.equal(end.offset, 80); // 100 - 20
  assert.fail("not implemented — RED");
});

// ---------------------------------------------------------------------------
// Frame with no receipts (genesis tick)
// ---------------------------------------------------------------------------

test("buildTickRows handles genesis frame with no receipts", () => {
  const { frames, catalog } = makeHistory();
  // const rows = buildTickRows(frames, catalog);
  // const genesis = rows.find(r => r.frameIndex === 0);
  // assert.ok(genesis);
  // assert.equal(genesis.writers.length, 0);
  // assert.equal(genesis.hasConflict, false);
  assert.fail("not implemented — RED");
});

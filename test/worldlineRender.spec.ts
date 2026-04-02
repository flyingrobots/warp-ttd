/**
 * Worldline full render tests — Surface output from renderWorldline.
 *
 * Cycle 0010 — Worldline Viewer (RED phase).
 *
 * Tests the complete rendered output: scroll window, cursor display,
 * strand tree connectors, keybinding hints, and responsive layout.
 * Follows the navigatorLayout.spec.ts pattern.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import { surfaceToString } from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";

import type { LaneRef, LaneFrameView, ReceiptSummary } from "../src/protocol.ts";

// --- will import from src/tui/worldlineLayout.ts once it exists ---
// import { renderWorldline } from "../src/tui/worldlineLayout.ts";

// ---------------------------------------------------------------------------
// BijouContext stub
// ---------------------------------------------------------------------------

const bijouCtx: BijouContext = initDefaultContext();

function renderToString(surface: Surface): string {
  return surfaceToString(surface, bijouCtx.style);
}

// ---------------------------------------------------------------------------
// Fixtures (same as worldlineLayout.spec.ts)
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
    counterfactualCount: 0,
    digest: `digest:${String(frameIndex)}`,
    summary: `receipt at frame ${String(frameIndex)}`,
  };
}

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
      { frameIndex: 0, lanes: [makeLaneFrame("wl:main", 0, { btrDigest: "abc1234" })], receipts: [] },
      { frameIndex: 1, lanes: [makeLaneFrame("wl:main", 1, { changed: true, btrDigest: "def5678" })], receipts: [makeReceipt("wl:main", "alice", 1)] },
      { frameIndex: 2, lanes: [makeLaneFrame("wl:main", 2, { changed: true, btrDigest: "ghi9012" }), makeLaneFrame("strand:experiment", 1, { changed: true, btrDigest: "jkl3456" })], receipts: [makeReceipt("wl:main", "alice", 2, { admitted: 2, rejected: 1 }), makeReceipt("strand:experiment", "bob", 2)] },
      { frameIndex: 3, lanes: [makeLaneFrame("wl:main", 3, { changed: true, btrDigest: "mno7890" })], receipts: [makeReceipt("wl:main", "carol", 3)] },
      { frameIndex: 4, lanes: [makeLaneFrame("wl:main", 4, { changed: true, btrDigest: "stu5678" })], receipts: [makeReceipt("wl:main", "alice", 4), makeReceipt("wl:main", "bob", 4, { admitted: 1, rejected: 2 })] },
    ],
  };
}

// ---------------------------------------------------------------------------
// renderWorldline — full Surface output
// ---------------------------------------------------------------------------

test("renderWorldline: shows tick rows in the output", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // assert.ok(output.includes("abc1234")); // genesis digest
  // assert.ok(output.includes("stu5678")); // latest digest
  assert.fail("not implemented — RED");
});

test("renderWorldline: cursor row is visually distinct", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // assert.ok(output.includes(">")); // selection indicator on cursor row
  assert.fail("not implemented — RED");
});

test("renderWorldline: shows writer names", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // assert.ok(output.includes("alice"));
  // assert.ok(output.includes("bob"));
  // assert.ok(output.includes("carol"));
  assert.fail("not implemented — RED");
});

test("renderWorldline: shows conflict indicator on conflicted ticks", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // // Frame 2 and 4 have rejections
  // // The conflict indicator should appear in the output
  // assert.ok(output.includes("!")); // at least one conflict marker
  assert.fail("not implemented — RED");
});

test("renderWorldline: shows strand label when strand is active", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // assert.ok(output.includes("strand:experiment"));
  assert.fail("not implemented — RED");
});

test("renderWorldline: shows keybinding hints", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // // Should show navigation hints (up/down/enter/back)
  // assert.ok(output.includes("↑") || output.includes("k") || output.includes("up"));
  assert.fail("not implemented — RED");
});

test("renderWorldline: narrow terminal still renders", () => {
  // const { frames, catalog } = makeHistory();
  // const output = renderToString(renderWorldline({
  //   frames, catalog, cursor: 0, w: 40, h: 20, ctx: bijouCtx
  // }));
  // // Should render something, even if truncated
  // assert.ok(output.length > 0);
  assert.fail("not implemented — RED");
});

test("renderWorldline: handles empty history", () => {
  // const output = renderToString(renderWorldline({
  //   frames: [], catalog: [], cursor: 0, w: 100, h: 30, ctx: bijouCtx
  // }));
  // // Should show an empty state message, not crash
  // assert.ok(output.length > 0);
  assert.fail("not implemented — RED");
});

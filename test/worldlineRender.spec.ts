/**
 * Worldline full render tests — Surface output from renderWorldline.
 *
 * Cycle 0010 — Worldline Viewer.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import { surfaceToString } from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";

import type { LaneRef, LaneFrameView, ReceiptSummary } from "../src/protocol.ts";
import { renderWorldline } from "../src/tui/worldlineLayout.ts";
import type { FrameData } from "../src/tui/worldlineLayout.ts";

const bijouCtx: BijouContext = initDefaultContext();

function renderToString(surface: Surface): string {
  return surfaceToString(surface, bijouCtx.style);
}

function makeLane(id: string, kind: "worldline" | "strand", parentId?: string): LaneRef {
  return { id, kind, ...(parentId !== undefined ? { parentId } : {}), writable: kind === "worldline", description: `${kind} ${id}` };
}

function makeLaneFrame(laneId: string, tick: number, opts?: {
  changed?: boolean;
  btrDigest?: string;
}): LaneFrameView {
  return {
    laneId,
    coordinate: { laneId, tick },
    changed: opts?.changed ?? false,
    ...(opts?.btrDigest !== undefined ? { btrDigest: opts.btrDigest } : {}),
  };
}

interface ReceiptOpts {
  laneId: string;
  writerId: string;
  frameIndex: number;
  admitted?: number;
  rejected?: number;
}

function makeReceipt(opts: ReceiptOpts): ReceiptSummary {
  return {
    receiptId: `receipt:${opts.laneId}:${String(opts.frameIndex)}`,
    headId: "head:default",
    frameIndex: opts.frameIndex,
    laneId: opts.laneId,
    writerId: opts.writerId,
    inputTick: opts.frameIndex,
    outputTick: opts.frameIndex + 1,
    admittedRewriteCount: opts.admitted ?? 1,
    rejectedRewriteCount: opts.rejected ?? 0,
    counterfactualCount: 0,
    digest: `digest:${String(opts.frameIndex)}`,
    summary: `receipt at frame ${String(opts.frameIndex)}`,
  };
}

function makeHistory(): { catalog: LaneRef[]; frames: FrameData[] } {
  const catalog = [
    makeLane("wl:main", "worldline"),
    makeLane("strand:experiment", "strand", "wl:main"),
  ];
  return {
    catalog,
    frames: [
      { frameIndex: 0, lanes: [makeLaneFrame("wl:main", 0, { btrDigest: "abc1234" })], receipts: [] },
      { frameIndex: 1, lanes: [makeLaneFrame("wl:main", 1, { changed: true, btrDigest: "def5678" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 1 })] },
      { frameIndex: 2, lanes: [makeLaneFrame("wl:main", 2, { changed: true, btrDigest: "ghi9012" }), makeLaneFrame("strand:experiment", 1, { changed: true, btrDigest: "jkl3456" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 2, admitted: 2, rejected: 1 }), makeReceipt({ laneId: "strand:experiment", writerId: "bob", frameIndex: 2 })] },
      { frameIndex: 3, lanes: [makeLaneFrame("wl:main", 3, { changed: true, btrDigest: "mno7890" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "carol", frameIndex: 3 })] },
      { frameIndex: 4, lanes: [makeLaneFrame("wl:main", 4, { changed: true, btrDigest: "stu5678" })], receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 4 }), makeReceipt({ laneId: "wl:main", writerId: "bob", frameIndex: 4, admitted: 1, rejected: 2 })] },
    ],
  };
}

test("renderWorldline: shows tick rows in the output", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("abc1234"));
  assert.ok(output.includes("stu5678"));
});

test("renderWorldline: cursor row is visually distinct", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes(">"));
});

test("renderWorldline: shows writer names", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("alice"));
  assert.ok(output.includes("bob"));
  assert.ok(output.includes("carol"));
});

test("renderWorldline: shows conflict indicator on conflicted ticks", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("!"));
});

test("renderWorldline: shows strand label when strand is active", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("strand:experiment"));
});

test("renderWorldline: shows keybinding hints", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("scroll"));
});

test("renderWorldline: narrow terminal still renders", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 40, h: 20, ctx: bijouCtx }));
  assert.ok(output.length > 0);
});

test("renderWorldline: handles empty history", () => {
  const output = renderToString(renderWorldline({ frames: [], catalog: [], cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.length > 0);
});

// ---------------------------------------------------------------------------
// Lane graph gutter integration (cycle 0012)
// ---------------------------------------------------------------------------

test("renderWorldline: shows graph gutter with lane rails at wide width", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("●"), "Should show active dot in graph gutter");
});

test("renderWorldline: graph gutter omitted at narrow width", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 35, h: 20, ctx: bijouCtx }));
  assert.ok(!output.includes("●"), "Narrow terminal should not show graph gutter");
});

test("renderWorldline: graph shows fork connector when strand appears", () => {
  const { frames, catalog } = makeHistory();
  const output = renderToString(renderWorldline({ frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx }));
  assert.ok(output.includes("├"), "Should show fork connector for strand");
});

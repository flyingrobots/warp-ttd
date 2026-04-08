/**
 * Worldline split view — lane tree + per-lane tick timeline.
 *
 * Cycle 0014 — Worldline View Rethink.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { LaneRef, LaneFrameView, ReceiptSummary } from "../src/protocol.ts";
import type { FrameData } from "../src/tui/worldlineLayout.ts";

// These are the new exports we expect from cycle 0014:
import {
  filterFramesToLane,
  buildLaneTreeLines,
} from "../src/tui/worldlineLayout.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

function makeReceipt(opts: {
  laneId: string;
  writerId: string;
  frameIndex: number;
  admitted?: number;
  rejected?: number;
}): ReceiptSummary {
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

function makeMultiLaneHistory(): { catalog: LaneRef[]; frames: FrameData[] } {
  const catalog = [
    makeLane("wl:alpha", "worldline"),
    makeLane("strand:feature-a", "strand", "wl:alpha"),
    makeLane("strand:hotfix", "strand", "wl:alpha"),
    makeLane("wl:beta", "worldline"),
  ];

  return {
    catalog,
    frames: [
      {
        frameIndex: 0,
        lanes: [makeLaneFrame("wl:alpha", 0, { btrDigest: "aaa0000" })],
        receipts: [],
      },
      {
        frameIndex: 1,
        lanes: [
          makeLaneFrame("wl:alpha", 1, { changed: true, btrDigest: "aaa1111" }),
          makeLaneFrame("wl:beta", 0, { btrDigest: "bbb0000" }),
        ],
        receipts: [
          makeReceipt({ laneId: "wl:alpha", writerId: "alice", frameIndex: 1 }),
          makeReceipt({ laneId: "wl:beta", writerId: "dave", frameIndex: 1 }),
        ],
      },
      {
        frameIndex: 2,
        lanes: [
          makeLaneFrame("wl:alpha", 2, { changed: true, btrDigest: "aaa2222" }),
          makeLaneFrame("strand:feature-a", 0, { btrDigest: "fea0000" }),
        ],
        receipts: [
          makeReceipt({ laneId: "wl:alpha", writerId: "alice", frameIndex: 2 }),
          makeReceipt({ laneId: "strand:feature-a", writerId: "bob", frameIndex: 2 }),
        ],
      },
      {
        frameIndex: 3,
        lanes: [
          makeLaneFrame("strand:feature-a", 1, { changed: true, btrDigest: "fea1111" }),
          makeLaneFrame("strand:hotfix", 0, { btrDigest: "hot0000" }),
        ],
        receipts: [
          makeReceipt({ laneId: "strand:feature-a", writerId: "bob", frameIndex: 3 }),
          makeReceipt({ laneId: "strand:hotfix", writerId: "carol", frameIndex: 3 }),
        ],
      },
      {
        frameIndex: 4,
        lanes: [
          makeLaneFrame("strand:feature-a", 2, { changed: true, btrDigest: "fea2222" }),
        ],
        receipts: [
          makeReceipt({ laneId: "strand:feature-a", writerId: "bob", frameIndex: 4 }),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// filterFramesToLane
// ---------------------------------------------------------------------------

test("filterFramesToLane returns only frames where the lane participated", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const filtered = filterFramesToLane(frames, "strand:feature-a", catalog);
  // strand:feature-a appears in frames 2, 3, 4
  assert.equal(filtered.length, 3);
  assert.deepEqual(
    filtered.map((f) => f.frameIndex),
    [2, 3, 4],
  );
});

test("filterFramesToLane keeps only that lane's receipts per frame", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const filtered = filterFramesToLane(frames, "strand:feature-a", catalog);
  for (const f of filtered) {
    for (const r of f.receipts) {
      assert.equal(r.laneId, "strand:feature-a", `Frame ${String(f.frameIndex)} should only have strand:feature-a receipts`);
    }
  }
});

test("filterFramesToLane keeps only that lane's LaneFrameView per frame", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const filtered = filterFramesToLane(frames, "strand:feature-a", catalog);
  for (const f of filtered) {
    assert.equal(f.lanes.length, 1);
    assert.equal(f.lanes[0]?.laneId, "strand:feature-a");
  }
});

test("filterFramesToLane returns empty for a lane with no activity", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const filtered = filterFramesToLane(frames, "nonexistent", catalog);
  assert.equal(filtered.length, 0);
});

test("filterFramesToLane for wl:alpha includes frames 0, 1, 2 (but not 3, 4 where only strands tick)", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const filtered = filterFramesToLane(frames, "wl:alpha", catalog);
  assert.deepEqual(
    filtered.map((f) => f.frameIndex),
    [0, 1, 2],
  );
});

// ---------------------------------------------------------------------------
// buildLaneTreeLines
// ---------------------------------------------------------------------------

test("buildLaneTreeLines returns one line per lane in tree order", () => {
  const { catalog } = makeMultiLaneHistory();
  const lines = buildLaneTreeLines(catalog);
  assert.equal(lines.length, 4);
});

test("buildLaneTreeLines shows worldlines before their child strands", () => {
  const { catalog } = makeMultiLaneHistory();
  const lines = buildLaneTreeLines(catalog);
  const ids = lines.map((l) => l.laneId);
  assert.equal(ids[0], "wl:alpha");
  assert.equal(ids[1], "strand:feature-a");
  assert.equal(ids[2], "strand:hotfix");
  assert.equal(ids[3], "wl:beta");
});

test("buildLaneTreeLines indents strands under their parent", () => {
  const { catalog } = makeMultiLaneHistory();
  const lines = buildLaneTreeLines(catalog);
  const alphaLine = lines.find((l) => l.laneId === "wl:alpha");
  const featureLine = lines.find((l) => l.laneId === "strand:feature-a");
  assert.ok(alphaLine !== undefined);
  assert.ok(featureLine !== undefined);
  assert.ok(featureLine.depth > alphaLine.depth, "Strand should be deeper than its parent worldline");
});

test("buildLaneTreeLines includes tree connectors in label", () => {
  const { catalog } = makeMultiLaneHistory();
  const lines = buildLaneTreeLines(catalog);
  const featureLine = lines.find((l) => l.laneId === "strand:feature-a");
  assert.ok(featureLine !== undefined);
  assert.ok(
    featureLine.label.includes("├") || featureLine.label.includes("└"),
    "Strand label should include a tree connector",
  );
});

test("buildLaneTreeLines labels include lane id", () => {
  const { catalog } = makeMultiLaneHistory();
  const lines = buildLaneTreeLines(catalog);
  for (const line of lines) {
    assert.ok(line.label.includes(line.laneId), `Label should contain lane id: ${line.laneId}`);
  }
});

test("buildLaneTreeLines handles empty catalog", () => {
  const lines = buildLaneTreeLines([]);
  assert.equal(lines.length, 0);
});

test("buildLaneTreeLines handles single worldline with no strands", () => {
  const catalog = [makeLane("wl:solo", "worldline")];
  const lines = buildLaneTreeLines(catalog);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.laneId, "wl:solo");
  assert.equal(lines[0]?.depth, 0);
});

// ---------------------------------------------------------------------------
// renderWorldline split view (integration)
// ---------------------------------------------------------------------------
// These test the updated renderWorldline with selectedLaneId.

import { renderWorldline } from "../src/tui/worldlineLayout.ts";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import { surfaceToString } from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";

const bijouCtx: BijouContext = initDefaultContext();

function renderToString(surface: Surface): string {
  return surfaceToString(surface, bijouCtx.style);
}

test("renderWorldline with selectedLaneId shows lane tree", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const output = renderToString(renderWorldline({
    frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx,
    selectedLaneId: "wl:alpha", laneCursor: 0,
  }));
  assert.ok(output.includes("wl:alpha"), "Should show lane name in tree pane");
  assert.ok(output.includes("strand:feature-a"), "Should show child strand in tree pane");
});

test("renderWorldline with selectedLaneId shows only that lane's ticks", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const output = renderToString(renderWorldline({
    frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx,
    selectedLaneId: "strand:feature-a", laneCursor: 1,
  }));
  // strand:feature-a has digests fea0000, fea1111, fea2222
  assert.ok(output.includes("fea0000"), "Should show strand's tick digests");
  assert.ok(output.includes("fea2222"), "Should show strand's tick digests");
  // wl:alpha's digest should NOT appear in the timeline
  assert.ok(!output.includes("aaa1111"), "Should not show other lane's digests in timeline");
});

test("renderWorldline without selectedLaneId falls back to current behavior", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const output = renderToString(renderWorldline({
    frames, catalog, cursor: 0, w: 100, h: 30, ctx: bijouCtx,
  }));
  // Without selectedLaneId, should show all ticks (backward compat)
  assert.ok(output.includes("aaa0000"));
  assert.ok(output.includes("fea2222"));
});

test("renderWorldline narrow terminal collapses to single pane", () => {
  const { frames, catalog } = makeMultiLaneHistory();
  const output = renderToString(renderWorldline({
    frames, catalog, cursor: 0, w: 50, h: 20, ctx: bijouCtx,
    selectedLaneId: "wl:alpha", laneCursor: 0,
  }));
  // Should still render without error at narrow width
  assert.ok(output.length > 0);
});

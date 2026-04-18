import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import {
  laneCursorForLaneId,
  selectedLaneIdForLaneCursor,
  scopeCatalogToNeighborhood
} from "../src/tui/pages/worldlinePage.ts";
import { buildLaneTreeLines } from "../src/tui/worldlineLayout.ts";
import type { LaneRef, PlaybackFrame, ReceiptSummary } from "../src/protocol.ts";

function makeCatalog(): LaneRef[] {
  return [
    { id: "wl:main", kind: "WORLDLINE", worldlineId: "wl:main", writable: false, description: "Main worldline" },
    { id: "ws:sandbox", kind: "STRAND", worldlineId: "wl:main", parentId: "wl:main", writable: false, description: "Sandbox strand" },
  ];
}

function makeNeighborhoodCore(): NeighborhoodCoreSummary {
  const frame: PlaybackFrame = {
    headId: "head:test",
    frameIndex: 2,
    lanes: [
      { laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 }, changed: true },
      { laneId: "ws:sandbox", worldlineId: "wl:main", coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 }, changed: true },
    ]
  };

  const receipts: ReceiptSummary[] = [{
    receiptId: "receipt:1", headId: "head:test", frameIndex: 2,
    laneId: "ws:sandbox", worldlineId: "wl:main",
    inputTick: 0, outputTick: 1, admittedRewriteCount: 1,
    rejectedRewriteCount: 0, counterfactualCount: 0,
    digest: "d1", summary: "test receipt"
  }];

  return NeighborhoodCoreSummary.fromFrame(frame, receipts, []);
}

test("scopeCatalogToNeighborhood keeps only participating lanes and their ancestors", () => {
  const scoped = scopeCatalogToNeighborhood(makeCatalog(), makeNeighborhoodCore());

  assert.deepEqual(
    scoped.map((lane) => lane.id),
    ["wl:main", "ws:sandbox"]
  );
});

test("laneCursorForLaneId follows the scoped lane tree ordering", () => {
  const scoped = scopeCatalogToNeighborhood(makeCatalog(), makeNeighborhoodCore());
  const tree = buildLaneTreeLines(scoped);

  assert.deepEqual(tree.map((line) => line.laneId), ["wl:main", "ws:sandbox"]);
  assert.equal(laneCursorForLaneId(scoped, "wl:main"), 0);
  assert.equal(laneCursorForLaneId(scoped, "ws:sandbox"), 1);
});

test("selectedLaneIdForLaneCursor returns the lane at the clamped tree cursor", () => {
  const scoped = scopeCatalogToNeighborhood(makeCatalog(), makeNeighborhoodCore());

  assert.equal(selectedLaneIdForLaneCursor(scoped, 0), "wl:main");
  assert.equal(selectedLaneIdForLaneCursor(scoped, 1), "ws:sandbox");
  assert.equal(selectedLaneIdForLaneCursor(scoped, 99), "ws:sandbox");
});

test("worldline loading is not duplicated between page and shell", () => {
  const pageSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "..", "src", "tui", "pages", "worldlinePage.ts"),
    "utf-8"
  );
  assert.doesNotMatch(
    pageSource,
    /seekToFrame\(headId.*MAX_SAFE_INTEGER/,
    "worldlinePage must not contain its own worldline loader — loading is handled by sessionSync"
  );
});

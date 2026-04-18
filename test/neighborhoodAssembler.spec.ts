import test from "node:test";
import assert from "node:assert/strict";

import { buildNeighborhoodState } from "../src/app/neighborhoodAssembler.ts";
import type { PlaybackFrame, ReceiptSummary, EffectEmissionSummary } from "../src/protocol.ts";

test("buildNeighborhoodState produces all four neighborhood summaries from protocol data", () => {
  const frame: PlaybackFrame = {
    headId: "head:test",
    frameIndex: 1,
    lanes: [{
      laneId: "wl:main",
      worldlineId: "wl:main",
      coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
      changed: true
    }]
  };

  const receipts: ReceiptSummary[] = [{
    receiptId: "receipt:1",
    headId: "head:test",
    frameIndex: 1,
    laneId: "wl:main",
    worldlineId: "wl:main",
    inputTick: 0,
    outputTick: 1,
    admittedRewriteCount: 1,
    rejectedRewriteCount: 0,
    counterfactualCount: 0,
    digest: "d1",
    summary: "test receipt"
  }];

  const emissions: EffectEmissionSummary[] = [];

  const state = buildNeighborhoodState(frame, receipts, emissions);

  assert.equal(state.neighborhoodCore.outcome, "LAWFUL");
  assert.ok(state.neighborhoodSites.activeSiteId.startsWith("site:"));
  assert.ok(state.reintegrationDetail.summary.length > 0);
  assert.ok(state.receiptShell.summary.length > 0);
});

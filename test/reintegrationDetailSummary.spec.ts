import test from "node:test";
import assert from "node:assert/strict";

import { ReintegrationDetailSummary } from "../src/app/ReintegrationDetailSummary.ts";
import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import type { PlaybackFrame, ReceiptSummary } from "../src/protocol.ts";

function makeNeighborhoodCore(): NeighborhoodCoreSummary {
  return new NeighborhoodCoreSummary({
    siteId: "site:head:test:2:wl:main",
    headId: "head:test",
    frameIndex: 2,
    coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 },
    primaryLaneId: "wl:main",
    primaryWorldlineId: "wl:main",
    participatingLaneIds: ["ws:sandbox"],
    outcome: "OBSTRUCTED",
    alternatives: [{
      alternativeId: "alt:receipt:test:1",
      kind: "COUNTERFACTUAL",
      laneId: "ws:sandbox",
      worldlineId: "wl:main",
      outcome: "PENDING",
      summary: "1 counterfactual"
    }],
    summary: "1 lane(s), 1 alternative(s), obstructed"
  });
}

function makeFrame(): PlaybackFrame {
  return {
    headId: "head:test",
    frameIndex: 2,
    lanes: [
      {
        laneId: "wl:main",
        worldlineId: "wl:main",
        coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 },
        changed: false
      },
      {
        laneId: "ws:sandbox",
        worldlineId: "wl:main",
        coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 },
        changed: true
      }
    ]
  };
}

function makeReceipts(): ReceiptSummary[] {
  return [{
    receiptId: "receipt:test:1",
    headId: "head:test",
    frameIndex: 2,
    laneId: "ws:sandbox",
    worldlineId: "wl:main",
    writer: { writerId: "bob", worldlineId: "wl:main", headId: "head:writer:bob" },
    inputTick: 0,
    outputTick: 1,
    admittedRewriteCount: 1,
    rejectedRewriteCount: 1,
    counterfactualCount: 2,
    digest: "digest:test",
    summary: "sandbox receipt"
  }];
}

test("fromSnapshot derives anchors, obligations, and evidence from frame and receipts", () => {
  const detail = ReintegrationDetailSummary.fromSnapshot(
    makeFrame(),
    makeNeighborhoodCore(),
    makeReceipts()
  );

  assert.equal(detail.siteId, "site:head:test:2:wl:main");
  assert.equal(detail.anchors.length, 2);
  assert.equal(detail.obligations.length, 2);
  assert.equal(detail.evidence.length, 1);
  assert.equal(detail.obligations[0]?.status, "VIOLATED");
  assert.equal(detail.obligations[1]?.status, "UNKNOWN");
});

test("toJSON returns stable plain data", () => {
  const detail = ReintegrationDetailSummary.fromSnapshot(
    makeFrame(),
    makeNeighborhoodCore(),
    makeReceipts()
  );

  const json = detail.toJSON();

  assert.equal(json.summary, detail.summary);
  assert.deepEqual(JSON.parse(JSON.stringify(json)), json);
});

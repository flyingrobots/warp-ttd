import test from "node:test";
import assert from "node:assert/strict";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import { ReceiptShellSummary } from "../src/app/ReceiptShellSummary.ts";
import type { ReceiptSummary } from "../src/protocol.ts";

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
    alternatives: [],
    summary: "1 lane(s), 0 alternative(s), obstructed"
  });
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

test("fromReceipts derives candidate and rejection counts from receipt shell", () => {
  const shell = ReceiptShellSummary.fromReceipts(
    makeNeighborhoodCore(),
    makeReceipts()
  );

  assert.equal(shell.siteId, "site:head:test:2:wl:main");
  assert.deepEqual(shell.receiptIds, ["receipt:test:1"]);
  assert.equal(shell.candidateCount, 4);
  assert.equal(shell.rejectedCount, 1);
  assert.equal(shell.hasBlockingRelation, true);
});

test("toJSON returns stable plain data", () => {
  const shell = ReceiptShellSummary.fromReceipts(
    makeNeighborhoodCore(),
    makeReceipts()
  );

  const json = shell.toJSON();

  assert.equal(json.summary, shell.summary);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(json))), JSON.stringify(json));
});

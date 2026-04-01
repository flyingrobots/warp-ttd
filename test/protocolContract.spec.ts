/**
 * Protocol contract tests — pin the v0.2.0 envelope shapes.
 *
 * These tests assert that every protocol type has exactly the expected
 * fields with the correct types. If a future change breaks one of these
 * tests, that is the signal to bump the protocol version.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";

const adapter = new EchoFixtureAdapter();
const HEAD_ID = "head:main";

test("HostHello v0.1.0 shape", async () => {
  const hello = await adapter.hello();

  // Required fields
  assert.equal(typeof hello.hostKind, "string");
  assert.equal(typeof hello.hostVersion, "string");
  assert.equal(typeof hello.protocolVersion, "string");
  assert.equal(typeof hello.schemaId, "string");
  assert.ok(Array.isArray(hello.capabilities));

  // Protocol version tracks latest implemented surface
  assert.equal(hello.protocolVersion, "0.2.0");

  // No unexpected fields
  const keys = Object.keys(hello).sort();
  assert.deepEqual(keys, ["capabilities", "hostKind", "hostVersion", "protocolVersion", "schemaId"]);
});

test("LaneCatalog v0.1.0 shape", async () => {
  const catalog = await adapter.laneCatalog();

  assert.ok(Array.isArray(catalog.lanes));
  assert.deepEqual(Object.keys(catalog).sort(), ["lanes"]);

  // LaneRef shape — worldline (required fields: id, kind, writable, description)
  const worldline = catalog.lanes[0];
  assert.ok(worldline !== undefined, "Expected at least one lane");
  assert.equal(typeof worldline.id, "string");
  assert.equal(typeof worldline.kind, "string");
  assert.equal(typeof worldline.writable, "boolean");
  assert.equal(typeof worldline.description, "string");
  const worldlineKeys = Object.keys(worldline).sort();
  assert.deepEqual(worldlineKeys, ["description", "id", "kind", "writable"]);

  // LaneRef shape — strand (has parentId)
  const strand = catalog.lanes.find((l) => l.kind === "strand");
  if (strand !== undefined) {
    const strandKeys = Object.keys(strand).sort();
    assert.deepEqual(strandKeys, ["description", "id", "kind", "parentId", "writable"]);
    assert.equal(typeof strand.parentId, "string");
  }
});

test("PlaybackHeadSnapshot v0.1.0 shape", async () => {
  const head = await adapter.playbackHead(HEAD_ID);

  assert.equal(typeof head.headId, "string");
  assert.equal(typeof head.label, "string");
  assert.equal(typeof head.currentFrameIndex, "number");
  assert.ok(Array.isArray(head.trackedLaneIds));
  assert.ok(Array.isArray(head.writableLaneIds));
  assert.equal(typeof head.paused, "boolean");

  const keys = Object.keys(head).sort();
  assert.deepEqual(keys, [
    "currentFrameIndex", "headId", "label", "paused",
    "trackedLaneIds", "writableLaneIds"
  ]);
});

test("PlaybackFrame v0.1.0 shape", async () => {
  const frame = await adapter.frame(HEAD_ID, 1);

  assert.equal(typeof frame.headId, "string");
  assert.equal(typeof frame.frameIndex, "number");
  assert.ok(Array.isArray(frame.lanes));
  assert.deepEqual(Object.keys(frame).sort(), ["frameIndex", "headId", "lanes"]);

  // LaneFrameView shape
  const laneView = frame.lanes[0];
  assert.ok(laneView !== undefined, "Expected at least one lane view");
  assert.equal(typeof laneView.laneId, "string");
  assert.equal(typeof laneView.changed, "boolean");

  // Coordinate shape (nested)
  assert.equal(typeof laneView.coordinate.laneId, "string");
  assert.equal(typeof laneView.coordinate.tick, "number");
  assert.deepEqual(Object.keys(laneView.coordinate).sort(), ["laneId", "tick"]);

  // LaneFrameView keys (changed lane has btrDigest)
  const changedLane = frame.lanes.find((l) => l.changed);
  if (changedLane !== undefined) {
    assert.ok(Object.keys(changedLane).includes("btrDigest"));
  }

  // LaneFrameView keys (unchanged lane has no btrDigest)
  const unchangedLane = frame.lanes.find((l) => !l.changed);
  if (unchangedLane !== undefined) {
    assert.ok(!Object.keys(unchangedLane).includes("btrDigest"));
  }
});

test("ReceiptSummary v0.1.0 shape", async () => {
  const receipts = await adapter.receipts(HEAD_ID, 1);
  assert.ok(receipts.length > 0, "Expected receipts at frame 1");

  const r = receipts[0];
  assert.ok(r !== undefined);
  assert.equal(typeof r.receiptId, "string");
  assert.equal(typeof r.headId, "string");
  assert.equal(typeof r.frameIndex, "number");
  assert.equal(typeof r.laneId, "string");
  assert.equal(typeof r.inputTick, "number");
  assert.equal(typeof r.outputTick, "number");
  assert.equal(typeof r.admittedRewriteCount, "number");
  assert.equal(typeof r.rejectedRewriteCount, "number");
  assert.equal(typeof r.counterfactualCount, "number");
  assert.equal(typeof r.digest, "string");
  assert.equal(typeof r.summary, "string");

  // writerId is optional but present in fixtures that have writer data
  assert.equal(typeof r.writerId, "string", "writerId should be a string when present");

  const keys = Object.keys(r).sort();
  assert.deepEqual(keys, [
    "admittedRewriteCount", "counterfactualCount", "digest",
    "frameIndex", "headId", "inputTick", "laneId", "outputTick",
    "receiptId", "rejectedRewriteCount", "summary", "writerId"
  ]);
});

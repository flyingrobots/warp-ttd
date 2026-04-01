import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";

test("hello exposes the minimal host handshake contract", async () => {
  const adapter = new EchoFixtureAdapter();
  const hello = await adapter.hello();

  assert.equal(hello.hostKind, "echo");
  assert.equal(hello.protocolVersion, "0.2.0");
  assert.equal(hello.schemaId, "ttd-protocol-fixture-v1");
  assert.deepEqual(hello.capabilities, [
    "read:hello",
    "read:lane-catalog",
    "read:playback-head",
    "read:frame",
    "read:receipts",
    "read:effect-emissions",
    "read:delivery-observations",
    "read:execution-context",
    "control:step-forward",
    "control:step-backward",
    "control:seek"
  ]);
});

test("lane catalog exposes one canonical worldline and one speculative strand", async () => {
  const adapter = new EchoFixtureAdapter();
  const catalog = await adapter.laneCatalog();

  assert.equal(catalog.lanes.length, 2);
  assert.deepEqual(catalog.lanes[0], {
    id: "wl:main",
    kind: "worldline",
    writable: false,
    description: "Canonical application worldline"
  });
  assert.deepEqual(catalog.lanes[1], {
    id: "ws:sandbox",
    kind: "strand",
    parentId: "wl:main",
    writable: true,
    description: "Speculative child strand at frame 1"
  });
});

test("initial playback head state is pinned at frame zero", async () => {
  const adapter = new EchoFixtureAdapter();
  const head = await adapter.playbackHead("head:main");
  const frame = await adapter.frame("head:main");

  assert.equal(head.currentFrameIndex, 0);
  assert.equal(head.paused, true);
  assert.equal(frame.frameIndex, 0);
  assert.deepEqual(
    frame.lanes.map((lane) => ({
      laneId: lane.laneId,
      tick: lane.coordinate.tick,
      changed: lane.changed
    })),
    [
      { laneId: "wl:main", tick: 0, changed: false },
      { laneId: "ws:sandbox", tick: 0, changed: false }
    ]
  );
  assert.deepEqual(await adapter.receipts("head:main"), []);
});

test("stepping forward advances the head and surfaces the canonical receipt", async () => {
  const adapter = new EchoFixtureAdapter();

  const steppedFrame = await adapter.stepForward("head:main");
  const headAfter = await adapter.playbackHead("head:main");
  const frameAfter = await adapter.frame("head:main");
  const receipts = await adapter.receipts("head:main");

  assert.equal(steppedFrame.frameIndex, 1);
  assert.equal(headAfter.currentFrameIndex, 1);
  assert.deepEqual(frameAfter, steppedFrame);
  assert.equal(receipts.length, 1);
  assert.deepEqual(receipts[0], {
    receiptId: "receipt:echo:main:0001",
    headId: "head:main",
    frameIndex: 1,
    laneId: "wl:main",
    writerId: "echo-writer",
    inputTick: 0,
    outputTick: 1,
    admittedRewriteCount: 2,
    rejectedRewriteCount: 0,
    counterfactualCount: 0,
    digest: "rcpt:main:0001",
    summary: "Committed two independent rewrites on the canonical worldline."
  });
});

test("explicit frame lookup allows receipt-bearing speculative frames to be inspected", async () => {
  const adapter = new EchoFixtureAdapter();
  const frame = await adapter.frame("head:main", 2);
  const receipts = await adapter.receipts("head:main", 2);

  assert.equal(frame.frameIndex, 2);
  assert.deepEqual(
    frame.lanes.map((lane) => ({
      laneId: lane.laneId,
      tick: lane.coordinate.tick,
      changed: lane.changed
    })),
    [
      { laneId: "wl:main", tick: 1, changed: false },
      { laneId: "ws:sandbox", tick: 1, changed: true }
    ]
  );
  assert.deepEqual(receipts, [
    {
      receiptId: "receipt:echo:sandbox:0001",
      headId: "head:main",
      frameIndex: 2,
      laneId: "ws:sandbox",
      writerId: "sandbox-writer",
      inputTick: 0,
      outputTick: 1,
      admittedRewriteCount: 1,
      rejectedRewriteCount: 1,
      counterfactualCount: 1,
      digest: "rcpt:sandbox:0001",
      summary:
        "Accepted one speculative rewrite and captured one counterfactual."
    }
  ]);
});

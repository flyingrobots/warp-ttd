import test from "node:test";
import assert from "node:assert/strict";

import { scenarioLinearHistory, scenarioMultiWriter } from "./helpers/gitWarpFixture.ts";
import { GitWarpAdapter } from "../src/adapters/gitWarpAdapter.ts";

test("hello identifies the host as git-warp", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const hello = await adapter.hello();

    assert.equal(hello.hostKind, "GIT_WARP");
    assert.equal(hello.protocolVersion, "0.4.0");
    assert.ok(hello.hostVersion.length > 0);
    assert.ok(hello.capabilities.includes("READ_HELLO"));
    assert.ok(hello.capabilities.includes("READ_LANE_CATALOG"));
    assert.ok(hello.capabilities.includes("READ_PLAYBACK_HEAD"));
    assert.ok(hello.capabilities.includes("READ_FRAME"));
    assert.ok(hello.capabilities.includes("READ_RECEIPTS"));
    assert.ok(hello.capabilities.includes("CONTROL_STEP_FORWARD"));
  } finally {
    await fixture.cleanup();
  }
});

test("lane catalog exposes the live worldline", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const catalog = await adapter.laneCatalog();

    assert.ok(catalog.lanes.length >= 1);

    const worldline = catalog.lanes.find((l) => l.kind === "WORLDLINE");

    if (worldline === undefined) {
      assert.fail("Expected at least one worldline lane");
    }

    assert.equal(worldline.writable, false, "Live worldline is read-only for TTD");
    assert.equal(worldline.worldlineId, worldline.id, "Worldline lane should name itself as its worldline");
    assert.ok(worldline.id.startsWith("wl:"), "Worldline ID should be prefixed with wl:");
  } finally {
    await fixture.cleanup();
  }
});

test("initial playback head is at frame zero with all receipts behind it", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const catalog = await adapter.laneCatalog();
    const headId = "head:default";

    const head = await adapter.playbackHead(headId);
    assert.equal(head.headId, headId);
    assert.equal(head.currentFrameIndex, 0);
    assert.equal(head.paused, true);

    // Head tracks at least the worldline lane
    assert.ok(head.trackedLaneIds.length >= 1);
    assert.ok(
      head.trackedLaneIds.some((id) =>
        catalog.lanes.some((l) => l.id === id && l.kind === "WORLDLINE")
      ),
      "Head should track the worldline"
    );
  } finally {
    await fixture.cleanup();
  }
});

test("frame zero represents the empty initial state", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const frame = await adapter.frame("head:default", 0);

    assert.equal(frame.frameIndex, 0);
    assert.equal(frame.headId, "head:default");

    // At frame 0, all lanes are at tick 0 with no changes
    for (const lane of frame.lanes) {
      assert.equal(lane.coordinate.tick, 0);
      assert.equal(lane.coordinate.worldlineId, lane.worldlineId);
      assert.equal(lane.changed, false);
    }

    // No receipts at frame 0
    const receipts = await adapter.receipts("head:default", 0);
    assert.deepEqual(receipts, []);
  } finally {
    await fixture.cleanup();
  }
});

test("stepping forward advances through tick receipts", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    // Linear history: 2 patches → 2 frames after frame 0
    const frame1 = await adapter.stepForward("head:default");
    assert.equal(frame1.frameIndex, 1);

    const head = await adapter.playbackHead("head:default");
    assert.equal(head.currentFrameIndex, 1);

    // Frame 1 should have receipts from the first tick
    const receipts1 = await adapter.receipts("head:default", 1);
    assert.ok(receipts1.length >= 1, "Frame 1 should have at least one receipt");
    assert.ok(
      receipts1.some((r) => r.admittedRewriteCount > 0),
      "At least one receipt should have admitted operations"
    );
  } finally {
    await fixture.cleanup();
  }
});

test("stepping to the last frame and beyond clamps at the end", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    // Step through all frames
    await adapter.stepForward("head:default"); // frame 1
    const frame2 = await adapter.stepForward("head:default"); // frame 2
    const frame3 = await adapter.stepForward("head:default"); // should clamp at frame 2

    assert.equal(frame2.frameIndex, 2);
    assert.equal(frame3.frameIndex, 2, "Should clamp at the last frame");
  } finally {
    await fixture.cleanup();
  }
});

test("explicit frame lookup returns the correct frame without advancing the head", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    // Look at frame 2 without stepping
    const frame2 = await adapter.frame("head:default", 2);
    assert.equal(frame2.frameIndex, 2);

    // Head should still be at 0
    const head = await adapter.playbackHead("head:default");
    assert.equal(head.currentFrameIndex, 0);
  } finally {
    await fixture.cleanup();
  }
});

test("receipts contain operation counts that match tick receipt data", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    // Frame 1: first patch added user:alice with name prop → 2 ops (NodeAdd + PropSet)
    const receipts1 = await adapter.receipts("head:default", 1);
    assert.equal(receipts1.length, 1, "Frame 1 has one receipt (one patch at tick 1)");

    const r1 = receipts1[0];
    assert.ok(r1 !== undefined, "Expected receipt at index 0");
    assert.ok(r1.writer !== undefined, "Expected receipt writer at index 0");
    assert.equal(r1.frameIndex, 1);
    assert.equal(r1.worldlineId, "wl:live");
    assert.equal(r1.writer.writerId, "alice");
    assert.equal(r1.writer.worldlineId, "wl:live");
    assert.equal(r1.admittedRewriteCount, 2, "Tick 1: NodeAdd + PropSet = 2 admitted");
    assert.equal(r1.rejectedRewriteCount, 0);
    assert.equal(r1.counterfactualCount, 0);

    // Frame 2: second patch added user:bob + prop + edge → 3 ops
    const receipts2 = await adapter.receipts("head:default", 2);
    assert.equal(receipts2.length, 1, "Frame 2 has one receipt (one patch at tick 2)");

    const r2 = receipts2[0];
    assert.ok(r2 !== undefined, "Expected receipt at index 0");
    assert.equal(r2.frameIndex, 2);
    assert.equal(r2.admittedRewriteCount, 3, "Tick 2: NodeAdd + PropSet + EdgeAdd = 3 admitted");
  } finally {
    await fixture.cleanup();
  }
});

test("multi-writer scenario produces frames for each unique lamport tick", async () => {
  const fixture = await scenarioMultiWriter();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    // 3 receipts across 2 unique lamport ticks:
    //   tick 1: alice (NodeAdd+PropSet), bob (NodeAdd+PropSet) — same tick, two patches
    //   tick 2: alice (EdgeAdd)
    // Frame indexing: frame 0 = empty, then one frame per unique lamport tick
    // Frame 1 = tick 1 (both alice and bob patches), Frame 2 = tick 2

    const frame1 = await adapter.stepForward("head:default");
    assert.equal(frame1.frameIndex, 1);

    const receipts1 = await adapter.receipts("head:default", 1);
    assert.equal(receipts1.length, 2, "Tick 1 has two receipts (one per writer)");

    const frame2 = await adapter.stepForward("head:default");
    assert.equal(frame2.frameIndex, 2);

    const receipts2 = await adapter.receipts("head:default", 2);
    assert.equal(receipts2.length, 1, "Tick 2 has one receipt");
  } finally {
    await fixture.cleanup();
  }
});

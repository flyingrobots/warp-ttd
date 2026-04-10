/**
 * ScenarioFixtureAdapter tests.
 *
 * Verifies that declarative scenarios produce correct TtdHostAdapter
 * behavior across the full protocol surface.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScenario,
  scenarioLiveWithEffects,
  scenarioReplayWithSuppression,
  scenarioMultiWriterWithConflicts
} from "./helpers/scenarioFixture.ts";

// --- Builder basics ---

test("buildScenario returns a valid TtdHostAdapter", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [{ id: "wl:main", kind: "WORLDLINE", writable: false }],
    frames: []
  });

  assert.equal(typeof adapter.adapterName, "string");

  const hello = await adapter.hello();
  assert.equal(hello.hostKind, "GIT_WARP");
  assert.equal(hello.protocolVersion, "0.3.0");
});

test("buildScenario exposes lanes from scenario", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [
      { id: "wl:live", kind: "WORLDLINE", writable: false },
      { id: "strand:exp-1", kind: "STRAND", writable: true, parentId: "wl:live" }
    ],
    frames: []
  });

  const catalog = await adapter.laneCatalog();
  assert.equal(catalog.lanes.length, 2);
  const strand = catalog.lanes[1];
  assert.ok(strand !== undefined);
  assert.equal(strand.kind, "STRAND");
  assert.equal(strand.parentId, "wl:live");
});

test("buildScenario produces frames with correct tick indexing", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [{ id: "wl:main", kind: "WORLDLINE", writable: false }],
    frames: [
      { tick: 1, receipts: [], emissions: [] },
      { tick: 2, receipts: [], emissions: [] }
    ]
  });

  const frame0 = await adapter.frame("head:default", 0);
  assert.equal(frame0.frameIndex, 0);

  const frame1 = await adapter.frame("head:default", 1);
  assert.equal(frame1.frameIndex, 1);

  const frame2 = await adapter.frame("head:default", 2);
  assert.equal(frame2.frameIndex, 2);
});

test("buildScenario maps receipts into ReceiptSummary", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [{ id: "wl:main", kind: "WORLDLINE", writable: false }],
    frames: [{
      tick: 1,
      receipts: [{
        laneId: "wl:main",
        writerId: "alice",
        admitted: 3,
        rejected: 1,
        counterfactual: 0
      }],
      emissions: []
    }]
  });

  const receipts = await adapter.receipts("head:default", 1);
  assert.equal(receipts.length, 1);
  const r = receipts[0];
  assert.ok(r !== undefined);
  assert.equal(r.admittedRewriteCount, 3);
  assert.equal(r.rejectedRewriteCount, 1);
  assert.equal(r.writerId, "alice", "writerId should flow from ScenarioReceipt to ReceiptSummary");
});

test("buildScenario maps emissions and deliveries", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "REPLAY",
    lanes: [{ id: "wl:main", kind: "WORLDLINE", writable: false }],
    frames: [{
      tick: 1,
      receipts: [],
      emissions: [{
        effectKind: "notification",
        laneId: "wl:main",
        deliveries: [
          { sinkId: "sink:network", outcome: "SUPPRESSED", reason: "replay mode" },
          { sinkId: "sink:tui-log", outcome: "DELIVERED", reason: "local safe" }
        ]
      }]
    }]
  });

  const emissions = await adapter.effectEmissions("head:default", 1);
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0]?.effectKind, "notification");

  const observations = await adapter.deliveryObservations("head:default", 1);
  assert.equal(observations.length, 2);

  const suppressed = observations.find((o) => o.outcome === "SUPPRESSED");
  const delivered = observations.find((o) => o.outcome === "DELIVERED");
  assert.ok(suppressed !== undefined);
  assert.ok(delivered !== undefined);
  assert.equal(suppressed.sinkId, "sink:network");
  assert.equal(suppressed.executionMode, "REPLAY");
  assert.equal(delivered.sinkId, "sink:tui-log");
});

test("buildScenario executionContext reflects scenario mode", async () => {
  const adapter = buildScenario({
    hostKind: "ECHO",
    executionMode: "DEBUG",
    lanes: [],
    frames: []
  });

  const ctx = await adapter.executionContext();
  assert.equal(ctx.mode, "DEBUG");
});

test("buildScenario stepForward advances the head", async () => {
  const adapter = buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [{ id: "wl:main", kind: "WORLDLINE", writable: false }],
    frames: [
      { tick: 1, receipts: [], emissions: [] },
      { tick: 2, receipts: [], emissions: [] }
    ]
  });

  const frame1 = await adapter.stepForward("head:default");
  assert.equal(frame1.frameIndex, 1);

  const head = await adapter.playbackHead("head:default");
  assert.equal(head.currentFrameIndex, 1);
});

// --- Built-in scenarios ---

test("scenarioLiveWithEffects produces delivered effects in live mode", async () => {
  const adapter = scenarioLiveWithEffects();
  const ctx = await adapter.executionContext();
  assert.equal(ctx.mode, "LIVE");

  const emissions = await adapter.effectEmissions("head:default", 1);
  assert.ok(emissions.length > 0);

  const observations = await adapter.deliveryObservations("head:default", 1);
  assert.ok(observations.every((o) => o.outcome === "DELIVERED"));
});

test("scenarioReplayWithSuppression shows suppressed and delivered for same emission", async () => {
  const adapter = scenarioReplayWithSuppression();
  const ctx = await adapter.executionContext();
  assert.equal(ctx.mode, "REPLAY");

  // Step to frame with effects
  await adapter.stepForward("head:default");
  const observations = await adapter.deliveryObservations("head:default", 1);
  const outcomes = new Set(observations.map((o) => o.outcome));
  assert.ok(outcomes.has("SUPPRESSED"), "Expected suppressed delivery");
  assert.ok(outcomes.has("DELIVERED"), "Expected delivered (local sink)");
});

test("scenarioMultiWriterWithConflicts has rejected rewrites and effect emissions", async () => {
  const adapter = scenarioMultiWriterWithConflicts();

  // Verify scenario has the expected frame count
  const head = await adapter.playbackHead("head:default");
  const maxFrames = 3;
  assert.equal(head.currentFrameIndex, 0, "Head starts at frame 0");

  // Step to verify frame count matches expectation
  for (let step = 0; step < maxFrames; step++) {
    await adapter.stepForward("head:default");
  }
  const afterSteps = await adapter.playbackHead("head:default");
  assert.equal(afterSteps.currentFrameIndex, maxFrames, `Expected head at frame ${maxFrames.toString()} after ${maxFrames.toString()} steps`);

  // Find a frame with rejected rewrites
  let foundRejected = false;
  let foundEmissions = false;

  for (let i = 1; i <= maxFrames; i++) {
    const receipts = await adapter.receipts("head:default", i);
    if (receipts.some((r) => r.rejectedRewriteCount > 0)) {
      foundRejected = true;
    }
    const emissions = await adapter.effectEmissions("head:default", i);
    if (emissions.length > 0) {
      foundEmissions = true;
    }
  }

  assert.ok(foundRejected, "Expected at least one frame with rejected rewrites");
  assert.ok(foundEmissions, "Expected at least one frame with effect emissions");
});

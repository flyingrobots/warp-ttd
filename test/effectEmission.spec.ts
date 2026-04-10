/**
 * Effect emission and delivery observation protocol tests.
 *
 * These tests pin the behavior of the new effect/delivery protocol
 * surface using the echo fixture adapter's contrived data.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { DiagnosticEffectKind, NotificationEffectKind } from "../src/EffectKind.ts";
import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";

const HEAD_ID = "head:main";

function createAdapter(): EchoFixtureAdapter {
  return new EchoFixtureAdapter();
}

// --- Capability declarations ---

test("hello declares effect-emission and delivery-observation capabilities", async () => {
  const hello = await createAdapter().hello();
  assert.ok(
    hello.capabilities.includes("READ_EFFECT_EMISSIONS"),
    "Should declare READ_EFFECT_EMISSIONS capability"
  );
  assert.ok(
    hello.capabilities.includes("READ_DELIVERY_OBSERVATIONS"),
    "Should declare READ_DELIVERY_OBSERVATIONS capability"
  );
  assert.ok(
    hello.capabilities.includes("READ_EXECUTION_CONTEXT"),
    "Should declare READ_EXECUTION_CONTEXT capability"
  );
});

// --- Effect emissions ---

test("effectEmissions returns empty array at frame 0", async () => {
  const emissions = await createAdapter().effectEmissions(HEAD_ID, 0);
  assert.deepEqual(emissions, []);
});

test("effectEmissions returns emission records at frame 1", async () => {
  const emissions = await createAdapter().effectEmissions(HEAD_ID, 1);
  assert.ok(emissions.length > 0, "Expected at least one emission at frame 1");

  const emission = emissions[0];
  assert.ok(emission !== undefined);

  // Shape check
  assert.equal(typeof emission.emissionId, "string");
  assert.equal(typeof emission.headId, "string");
  assert.equal(typeof emission.frameIndex, "number");
  assert.equal(typeof emission.laneId, "string");
  assert.equal(typeof emission.coordinate.laneId, "string");
  assert.equal(typeof emission.coordinate.tick, "number");
  assert.ok(emission.effectKind instanceof DiagnosticEffectKind);
  assert.equal(typeof emission.producerWriter.writerId, "string");
  assert.equal(typeof emission.producerWriter.worldlineId, "string");
  assert.equal(typeof emission.producerWriter.headId, "string");
  assert.equal(typeof emission.summary, "string");

  assert.equal(emission.frameIndex, 1);
  assert.equal(emission.headId, HEAD_ID);
});

// --- Delivery observations ---

test("deliveryObservations returns empty array at frame 0", async () => {
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 0);
  assert.deepEqual(observations, []);
});

test("deliveryObservations returns observations at frame 1 with correct outcomes", async () => {
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 1);
  assert.ok(observations.length > 0, "Expected at least one observation at frame 1");

  const obs = observations[0];
  assert.ok(obs !== undefined);

  // Shape check
  assert.equal(typeof obs.observationId, "string");
  assert.equal(typeof obs.emissionId, "string");
  assert.equal(typeof obs.headId, "string");
  assert.equal(typeof obs.frameIndex, "number");
  assert.equal(typeof obs.sinkId, "string");
  assert.equal(typeof obs.outcome, "string");
  assert.equal(typeof obs.reason, "string");
  assert.equal(typeof obs.executionMode, "string");
  assert.equal(typeof obs.summary, "string");

  // Outcome must be one of the closed enum values
  const validOutcomes = ["DELIVERED", "SUPPRESSED", "FAILED", "SKIPPED"];
  assert.ok(
    validOutcomes.includes(obs.outcome),
    `Outcome must be one of ${validOutcomes.join(", ")}, got: ${obs.outcome}`
  );

  // Execution mode must be valid
  const validModes = ["LIVE", "REPLAY", "DEBUG"];
  assert.ok(
    validModes.includes(obs.executionMode),
    `Execution mode must be one of ${validModes.join(", ")}, got: ${obs.executionMode}`
  );
});

test("delivery observations link back to effect emissions by emissionId", async () => {
  const emissions = await createAdapter().effectEmissions(HEAD_ID, 1);
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 1);

  assert.ok(emissions.length > 0);
  assert.ok(observations.length > 0);

  // Every observation's emissionId must reference a known emission
  const emissionIds = new Set(emissions.map((e) => e.emissionId));
  for (const obs of observations) {
    assert.ok(
      emissionIds.has(obs.emissionId),
      `Observation ${obs.observationId} references unknown emission ${obs.emissionId}`
    );
  }
});

test("same emission fans out to multiple sinks with different outcomes", async () => {
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 1);

  // Frame 1 diagnostic should have two delivery observations (tui-log + chunk-file)
  const forEmission1 = observations.filter((o) => o.emissionId === "emit:echo:0001");
  assert.equal(forEmission1.length, 2, "Expected 2 sinks for the diagnostic emission");

  const sinks = forEmission1.map((o) => o.sinkId).sort();
  assert.deepEqual(sinks, ["sink:chunk-file", "sink:tui-log"]);

  // Both delivered in live mode
  for (const obs of forEmission1) {
    assert.equal(obs.outcome, "DELIVERED");
    assert.equal(obs.executionMode, "LIVE");
  }
});

test("replay suppresses network sink but delivers to local sink for same emission", async () => {
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 2);
  const forEmission2 = observations.filter((o) => o.emissionId === "emit:echo:0002");

  assert.equal(forEmission2.length, 2, "Expected 2 sinks for the notification emission");

  const network = forEmission2.find((o) => o.sinkId === "sink:network");
  const tuiLog = forEmission2.find((o) => o.sinkId === "sink:tui-log");

  assert.ok(network !== undefined);
  assert.ok(tuiLog !== undefined);

  assert.equal(network.outcome, "SUPPRESSED");
  assert.equal(network.executionMode, "REPLAY");

  assert.equal(tuiLog.outcome, "DELIVERED");
  assert.equal(tuiLog.executionMode, "REPLAY");
});

test("suppressed delivery is distinguishable from absence", async () => {
  // Frame 2 should have a suppressed delivery observation in the fixture
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 2);
  const suppressed = observations.filter((o) => o.outcome === "SUPPRESSED");

  assert.ok(
    suppressed.length > 0,
    "Expected at least one suppressed delivery observation at frame 2"
  );

  const s = suppressed[0];
  assert.ok(s !== undefined);
  assert.equal(s.outcome, "SUPPRESSED");
  assert.ok(s.reason.length > 0, "Suppression must have a reason");
});

// --- Execution context ---

test("executionContext returns session-level metadata", async () => {
  const ctx = await createAdapter().executionContext();

  assert.equal(typeof ctx.mode, "string");
  const validModes = ["LIVE", "REPLAY", "DEBUG"];
  assert.ok(
    validModes.includes(ctx.mode),
    `Mode must be one of ${validModes.join(", ")}, got: ${ctx.mode}`
  );
});

// --- Protocol contract: envelope key sets ---

test("EffectEmissionSummary v0.5.0 shape", async () => {
  const emissions = await createAdapter().effectEmissions(HEAD_ID, 1);
  const emission = emissions[0];
  assert.ok(emission !== undefined);

  const keys = Object.keys(emission).sort();
  assert.deepEqual(keys, [
    "coordinate", "effectKind", "emissionId", "frameIndex",
    "headId", "laneId", "producerWriter", "summary", "worldlineId"
  ]);

  // Nested Coordinate shape
  assert.deepEqual(Object.keys(emission.coordinate).sort(), ["laneId", "tick", "worldlineId"]);
  assert.deepEqual(Object.keys(emission.producerWriter).sort(), ["headId", "worldlineId", "writerId"]);
});

test("effectEmissions preserves runtime effect kind classes after adapter cloning", async () => {
  const emissions = await createAdapter().effectEmissions(HEAD_ID, 2);
  const emission = emissions[0];
  assert.ok(emission !== undefined);
  assert.ok(emission.effectKind instanceof NotificationEffectKind);
});

test("DeliveryObservationSummary shape", async () => {
  const observations = await createAdapter().deliveryObservations(HEAD_ID, 1);
  const obs = observations[0];
  assert.ok(obs !== undefined);

  const keys = Object.keys(obs).sort();
  // observerId is optional — may or may not be present
  const requiredKeys = [
    "emissionId", "executionMode", "frameIndex", "headId",
    "observationId", "outcome", "reason", "sinkId", "summary"
  ];
  for (const key of requiredKeys) {
    assert.ok(keys.includes(key), `Missing required key: ${key}`);
  }
});

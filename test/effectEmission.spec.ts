/**
 * Effect emission and delivery observation protocol tests.
 *
 * These tests pin the behavior of the new effect/delivery protocol
 * surface using the echo fixture adapter's contrived data.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";

const adapter = new EchoFixtureAdapter();
const HEAD_ID = "head:main";

// --- Capability declarations ---

test("hello declares effect-emission and delivery-observation capabilities", async () => {
  const hello = await adapter.hello();
  assert.ok(
    hello.capabilities.includes("read:effect-emissions"),
    "Should declare read:effect-emissions capability"
  );
  assert.ok(
    hello.capabilities.includes("read:delivery-observations"),
    "Should declare read:delivery-observations capability"
  );
  assert.ok(
    hello.capabilities.includes("read:execution-context"),
    "Should declare read:execution-context capability"
  );
});

// --- Effect emissions ---

test("effectEmissions returns empty array at frame 0", async () => {
  const emissions = await adapter.effectEmissions(HEAD_ID, 0);
  assert.deepEqual(emissions, []);
});

test("effectEmissions returns emission records at frame 1", async () => {
  const emissions = await adapter.effectEmissions(HEAD_ID, 1);
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
  assert.equal(typeof emission.effectKind, "string");
  assert.equal(typeof emission.producerWriterId, "string");
  assert.equal(typeof emission.summary, "string");

  assert.equal(emission.frameIndex, 1);
  assert.equal(emission.headId, HEAD_ID);
});

// --- Delivery observations ---

test("deliveryObservations returns empty array at frame 0", async () => {
  const observations = await adapter.deliveryObservations(HEAD_ID, 0);
  assert.deepEqual(observations, []);
});

test("deliveryObservations returns observations at frame 1 with correct outcomes", async () => {
  const observations = await adapter.deliveryObservations(HEAD_ID, 1);
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
  const validOutcomes = ["delivered", "suppressed", "failed", "skipped"];
  assert.ok(
    validOutcomes.includes(obs.outcome),
    `Outcome must be one of ${validOutcomes.join(", ")}, got: ${obs.outcome}`
  );

  // Execution mode must be valid
  const validModes = ["live", "replay", "debug"];
  assert.ok(
    validModes.includes(obs.executionMode),
    `Execution mode must be one of ${validModes.join(", ")}, got: ${obs.executionMode}`
  );
});

test("delivery observations link back to effect emissions by emissionId", async () => {
  const emissions = await adapter.effectEmissions(HEAD_ID, 1);
  const observations = await adapter.deliveryObservations(HEAD_ID, 1);

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

test("suppressed delivery is distinguishable from absence", async () => {
  // Frame 2 should have a suppressed delivery observation in the fixture
  const observations = await adapter.deliveryObservations(HEAD_ID, 2);
  const suppressed = observations.filter((o) => o.outcome === "suppressed");

  assert.ok(
    suppressed.length > 0,
    "Expected at least one suppressed delivery observation at frame 2"
  );

  const s = suppressed[0];
  assert.ok(s !== undefined);
  assert.equal(s.outcome, "suppressed");
  assert.ok(s.reason.length > 0, "Suppression must have a reason");
});

// --- Execution context ---

test("executionContext returns session-level metadata", async () => {
  const ctx = await adapter.executionContext();

  assert.equal(typeof ctx.mode, "string");
  const validModes = ["live", "replay", "debug"];
  assert.ok(
    validModes.includes(ctx.mode),
    `Mode must be one of ${validModes.join(", ")}, got: ${ctx.mode}`
  );
});

// --- Protocol contract: envelope key sets ---

test("EffectEmissionSummary v0.2.0 shape", async () => {
  const emissions = await adapter.effectEmissions(HEAD_ID, 1);
  const emission = emissions[0];
  assert.ok(emission !== undefined);

  const keys = Object.keys(emission).sort();
  assert.deepEqual(keys, [
    "coordinate", "effectKind", "emissionId", "frameIndex",
    "headId", "laneId", "producerWriterId", "summary"
  ]);

  // Nested Coordinate shape
  assert.deepEqual(Object.keys(emission.coordinate).sort(), ["laneId", "tick"]);
});

test("DeliveryObservationSummary v0.2.0 shape", async () => {
  const observations = await adapter.deliveryObservations(HEAD_ID, 1);
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

/**
 * DebuggerSession tests — pin the session domain concept.
 *
 * Uses the EchoFixtureAdapter as the backing adapter since session
 * behavior is adapter-independent.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { DebuggerSession } from "../src/app/debuggerSession.ts";
import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";

const HEAD_ID = "head:main";

function createAdapter(): EchoFixtureAdapter {
  return new EchoFixtureAdapter();
}

// --- Creation ---

test("create() produces a valid initial snapshot at frame 0", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);

  assert.equal(typeof session.sessionId, "string");
  assert.ok(session.sessionId.length > 0);
  assert.equal(session.activeHeadId, HEAD_ID);

  const snap = session.snapshot;
  assert.equal(snap.head.headId, HEAD_ID);
  assert.equal(snap.head.currentFrameIndex, 0);
  assert.equal(snap.frame.frameIndex, 0);
  assert.ok(Array.isArray(snap.receipts));
  assert.ok(Array.isArray(snap.emissions));
  assert.ok(Array.isArray(snap.observations));
  assert.equal(typeof snap.execCtx.mode, "string");
});

test("create() starts with no pins", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  assert.deepEqual(session.pins, []);
});

// --- Navigation ---

test("stepForward() advances frame and updates snapshot", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  const snap = await session.stepForward();

  assert.equal(snap.frame.frameIndex, 1);
  assert.equal(snap.head.currentFrameIndex, 1);
  assert.equal(session.snapshot, snap);
});

test("stepBackward() retreats frame and updates snapshot", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  await session.stepForward();
  const snap = await session.stepBackward();

  assert.equal(snap.frame.frameIndex, 0);
  assert.equal(snap.head.currentFrameIndex, 0);
});

test("seekToFrame() jumps to target frame", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  const snap = await session.seekToFrame(2);

  assert.equal(snap.frame.frameIndex, 2);
  assert.equal(snap.head.currentFrameIndex, 2);
});

test("navigation fetches receipts and emissions for the new frame", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);

  // Frame 0 has no receipts/emissions
  assert.equal(session.snapshot.receipts.length, 0);
  assert.equal(session.snapshot.emissions.length, 0);

  // Frame 1 has receipts and emissions
  const snap = await session.stepForward();
  assert.ok(snap.receipts.length > 0);
  assert.ok(snap.emissions.length > 0);
});

// --- Pinning ---

test("pin() captures observation and emission at current frame", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  await session.stepForward();

  const obs = session.snapshot.observations[0];
  assert.ok(obs !== undefined);

  const pinned = session.pin(obs.observationId);
  assert.ok(pinned !== null);
  assert.equal(pinned.pinnedAt, 1);
  assert.equal(pinned.observation.observationId, obs.observationId);
  assert.equal(typeof pinned.emission.emissionId, "string");
});

test("pin() returns null for unknown observationId", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  const result = session.pin("nonexistent-id");
  assert.equal(result, null);
});

test("pins survive stepping", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  await session.stepForward();

  const obs = session.snapshot.observations[0];
  assert.ok(obs !== undefined);
  session.pin(obs.observationId);

  assert.equal(session.pins.length, 1);

  // Step to a different frame — pin persists
  await session.stepForward();
  assert.equal(session.pins.length, 1);
  assert.equal(session.pins[0]?.pinnedAt, 1);
});

test("unpin() removes a pin by observationId", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  await session.stepForward();

  const obs = session.snapshot.observations[0];
  assert.ok(obs !== undefined);
  session.pin(obs.observationId);
  assert.equal(session.pins.length, 1);

  const removed = session.unpin(obs.observationId);
  assert.equal(removed, true);
  assert.equal(session.pins.length, 0);
});

test("unpin() returns false for unknown observationId", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  assert.equal(session.unpin("nonexistent"), false);
});

// --- Serialization ---

test("toJSON() returns a serializable representation", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  await session.stepForward();

  const obs = session.snapshot.observations[0];
  assert.ok(obs !== undefined);
  session.pin(obs.observationId);

  const json = session.toJSON();

  assert.equal(json.sessionId, session.sessionId);
  assert.equal(json.activeHeadId, HEAD_ID);
  assert.equal(json.snapshot.frame.frameIndex, 1);
  assert.equal(json.pins.length, 1);

  // Must be JSON-serializable (no circular refs, no class instances)
  const roundTripped = JSON.parse(JSON.stringify(json));
  assert.deepEqual(roundTripped, json);
});

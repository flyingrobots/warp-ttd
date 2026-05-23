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
import type { SessionFamilyFact } from "../src/app/sessionFamilyFacts.ts";
import type {
  DeliveryObservationSummary,
  ExecutionContext,
  HostHello
} from "../src/protocol.ts";

const HEAD_ID = "head:main";

function createAdapter(): EchoFixtureAdapter {
  return new EchoFixtureAdapter();
}

class UnsupportedAdapterMethodError extends Error {
  public constructor(methodName: string) {
    super(`Unsupported adapter method was called: ${methodName}`);
    this.name = "UnsupportedAdapterMethodError";
  }
}

class TransientHelloUnavailableError extends Error {
  public constructor() {
    super("Host hello unavailable after initial handshake");
    this.name = "TransientHelloUnavailableError";
  }
}

class SparseCapabilityAdapter extends EchoFixtureAdapter {
  public override async hello(): Promise<HostHello> {
    const hello = await super.hello();
    return {
      ...hello,
      capabilities: hello.capabilities.filter(
        (cap) =>
          cap !== "READ_DELIVERY_OBSERVATIONS"
          && cap !== "READ_EXECUTION_CONTEXT"
          && cap !== "READ_SESSION_FAMILY_FACTS"
      )
    };
  }

  public override deliveryObservations(): Promise<DeliveryObservationSummary[]> {
    throw new UnsupportedAdapterMethodError("deliveryObservations");
  }

  public override executionContext(): Promise<ExecutionContext> {
    throw new UnsupportedAdapterMethodError("executionContext");
  }

  public override sessionFamilyFacts(): Promise<SessionFamilyFact[]> {
    throw new UnsupportedAdapterMethodError("sessionFamilyFacts");
  }
}

class TransientHelloAdapter extends EchoFixtureAdapter {
  #helloCalls = 0;

  public get helloCalls(): number {
    return this.#helloCalls;
  }

  public override async hello(): Promise<HostHello> {
    this.#helloCalls += 1;
    if (this.#helloCalls > 1) {
      throw new TransientHelloUnavailableError();
    }
    return super.hello();
  }
}

function sessionFamilyFact(
  facts: readonly SessionFamilyFact[],
  field: SessionFamilyFact["field"]
): SessionFamilyFact {
  const fact = facts.find((candidate) => candidate.field === field);
  assert.ok(fact !== undefined, `Expected session family fact for ${field}`);
  return fact;
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
  assert.equal(snap.neighborhoodCore.headId, HEAD_ID);
  assert.equal(snap.neighborhoodCore.frameIndex, 0);
  assert.deepEqual(snap.neighborhoodCore.participatingLaneIds, ["wl:main"]);
  assert.equal(snap.neighborhoodSites.activeSiteId, snap.neighborhoodCore.siteId);
  assert.equal(snap.neighborhoodSites.sites.length, 1);
  assert.equal(snap.reintegrationDetail.siteId, snap.neighborhoodCore.siteId);
  assert.equal(snap.receiptShell.siteId, snap.neighborhoodCore.siteId);
  assert.deepEqual(
    snap.sessionFamilyFacts.map((fact) => fact.field),
    ["neighborhoodCore", "reintegrationDetail", "receiptShell"]
  );
});

test("create() starts with no pins", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  assert.deepEqual(session.pins, []);
});

test("create() skips adapter methods when capabilities are absent", async () => {
  const session = await DebuggerSession.create(new SparseCapabilityAdapter(), HEAD_ID);

  assert.deepEqual(session.snapshot.observations, []);
  assert.deepEqual(session.snapshot.execCtx, { mode: "DEBUG" });
  assert.equal(
    sessionFamilyFact(session.snapshot.sessionFamilyFacts, "neighborhoodCore").origin,
    "LOCAL_FALLBACK"
  );
});

test("create() prefers host-published session family facts when available", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  const coreFact = sessionFamilyFact(
    session.snapshot.sessionFamilyFacts,
    "neighborhoodCore"
  );

  assert.equal(coreFact.posture, "PRESENT");
  assert.equal(coreFact.origin, "HOST_PUBLISHED");
  assert.equal(coreFact.source.family, "continuum");
  assert.equal(coreFact.source.artifact, "NeighborhoodCoreSummary");
  assert.equal(session.snapshot.neighborhoodCore.summary, "Host-published neighborhood core");
});

// --- Navigation ---

test("stepForward() advances frame and updates snapshot", async () => {
  const session = await DebuggerSession.create(createAdapter(), HEAD_ID);
  const snap = await session.stepForward();

  assert.equal(snap.frame.frameIndex, 1);
  assert.equal(snap.head.currentFrameIndex, 1);
  assert.equal(session.snapshot, snap);
});

test("navigation reuses capabilities from the initial hello handshake", async () => {
  const adapter = new TransientHelloAdapter();
  const session = await DebuggerSession.create(adapter, HEAD_ID);

  const snap = await session.stepForward();

  assert.equal(snap.frame.frameIndex, 1);
  assert.equal(adapter.helloCalls, 1);
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
  assert.deepEqual(snap.neighborhoodCore.participatingLaneIds, ["wl:main"]);
  assert.equal(snap.neighborhoodCore.outcome, "LAWFUL");
  assert.equal(snap.reintegrationDetail.obligations.length, 1);
  assert.equal(snap.receiptShell.rejectedCount, 0);
});

test("neighborhood core tracks obstruction and alternatives at the active frame", async () => {
  const adapter = createAdapter();
  const session = await DebuggerSession.create(adapter, HEAD_ID);
  await session.seekToFrame(2);

  assert.deepEqual(session.snapshot.neighborhoodCore.participatingLaneIds, ["ws:sandbox"]);
  assert.equal(session.snapshot.neighborhoodCore.outcome, "OBSTRUCTED");
  assert.equal(session.snapshot.neighborhoodCore.alternatives.length, 1);
  assert.equal(session.snapshot.neighborhoodSites.sites.length, 2);
  assert.equal(session.snapshot.reintegrationDetail.obligations.length, 2);
  assert.equal(session.snapshot.receiptShell.hasBlockingRelation, true);
  const { lanes } = await adapter.laneCatalog();
  assert.equal(
    session.snapshot.neighborhoodCore.buildDisplayCatalog(lanes).map((lane) => lane.id).join(","),
    "wl:main,ws:sandbox"
  );
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
  assert.equal(json.snapshot.neighborhoodCore.headId, HEAD_ID);
  assert.equal(typeof json.snapshot.neighborhoodCore.summary, "string");
  assert.equal(typeof json.snapshot.neighborhoodSites.activeSiteId, "string");
  assert.equal(Array.isArray(json.snapshot.neighborhoodSites.sites), true);
  assert.equal(typeof json.snapshot.reintegrationDetail.summary, "string");
  assert.equal(typeof json.snapshot.receiptShell.summary, "string");
  assert.equal(json.snapshot.sessionFamilyFacts.length, 3);
  assert.equal(json.snapshot.sessionFamilyFacts[0]?.origin, "HOST_PUBLISHED");

  // Must survive a full JSON round-trip as stable plain data
  const serialized = JSON.stringify(json);
  const roundTripped = JSON.parse(serialized) as typeof json;
  assert.deepEqual(roundTripped, json, "toJSON output must survive JSON round-trip without loss");

  // effectKind must be a plain string, not a class instance
  assert.ok(json.snapshot.emissions.length > 0, "test precondition: emissions must be present at frame 1");
  for (const emission of json.snapshot.emissions) {
    assert.equal(typeof emission.effectKind, "string", "effectKind must serialize as plain string");
  }
  for (const pin of json.pins) {
    assert.equal(typeof pin.emission.effectKind, "string", "pinned effectKind must serialize as plain string");
  }
});

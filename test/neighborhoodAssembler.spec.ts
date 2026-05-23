import test from "node:test";
import assert from "node:assert/strict";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import { buildNeighborhoodState } from "../src/app/neighborhoodAssembler.ts";
import {
  hostPublishedSessionFamilyFact,
  sessionFamilyPayload,
  sessionFamilyTarget,
  type SessionFamilyFact
} from "../src/app/sessionFamilyFacts.ts";
import type { PlaybackFrame, ReceiptSummary, EffectEmissionSummary } from "../src/protocol.ts";

interface NeighborhoodInputs {
  readonly emissions: EffectEmissionSummary[];
  readonly frame: PlaybackFrame;
  readonly receipts: ReceiptSummary[];
}

function makeNeighborhoodInputs(): NeighborhoodInputs {
  const frame: PlaybackFrame = {
    headId: "head:test",
    frameIndex: 1,
    lanes: [{
      laneId: "wl:main",
      worldlineId: "wl:main",
      coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
      changed: true
    }]
  };

  const receipts: ReceiptSummary[] = [{
    receiptId: "receipt:1",
    headId: "head:test",
    frameIndex: 1,
    laneId: "wl:main",
    worldlineId: "wl:main",
    inputTick: 0,
    outputTick: 1,
    admittedRewriteCount: 1,
    rejectedRewriteCount: 0,
    counterfactualCount: 0,
    digest: "d1",
    summary: "test receipt"
  }];

  const emissions: EffectEmissionSummary[] = [];

  return { emissions, frame, receipts };
}

function staleNeighborhoodCoreFact(inputs: NeighborhoodInputs): SessionFamilyFact {
  const core = NeighborhoodCoreSummary.fromFrame(
    inputs.frame,
    inputs.receipts,
    inputs.emissions
  );

  return hostPublishedSessionFamilyFact({
    field: "neighborhoodCore",
    target: "head:test@frame:999",
    payload: sessionFamilyPayload({
      ...core.toJSON(),
      summary: "stale host payload"
    })
  });
}

function malformedNeighborhoodCoreFact(inputs: NeighborhoodInputs): SessionFamilyFact {
  return hostPublishedSessionFamilyFact({
    field: "neighborhoodCore",
    target: sessionFamilyTarget(inputs.frame.headId, inputs.frame.frameIndex),
    payload: { summary: "malformed host payload" }
  });
}

test("buildNeighborhoodState produces all four neighborhood summaries from protocol data", () => {
  const { emissions, frame, receipts } = makeNeighborhoodInputs();
  const state = buildNeighborhoodState({ frame, receipts, emissions });

  assert.equal(state.neighborhoodCore.outcome, "LAWFUL");
  assert.ok(state.neighborhoodSites.activeSiteId.startsWith("site:"));
  assert.ok(state.reintegrationDetail.summary.length > 0);
  assert.ok(state.receiptShell.summary.length > 0);
  assert.deepEqual(
    state.sessionFamilyFacts.map((fact) => [fact.field, fact.origin]),
    [
      ["neighborhoodCore", "LOCAL_FALLBACK"],
      ["reintegrationDetail", "LOCAL_FALLBACK"],
      ["receiptShell", "LOCAL_FALLBACK"]
    ]
  );
});

test("buildNeighborhoodState ignores host facts for another target", () => {
  const inputs = makeNeighborhoodInputs();
  const state = buildNeighborhoodState({
    ...inputs,
    hostFacts: [staleNeighborhoodCoreFact(inputs)]
  });

  assert.equal(state.neighborhoodCore.summary, "1 lane(s), 0 alternative(s), lawful");
  assert.equal(state.reintegrationDetail.summary.length > 0, true);
  const firstFact = state.sessionFamilyFacts[0];
  assert.ok(firstFact !== undefined);
  assert.equal(firstFact.field, "neighborhoodCore");
  assert.equal(firstFact.origin, "LOCAL_FALLBACK");
});

test("buildNeighborhoodState obstructs malformed host facts and uses local fallback", () => {
  const inputs = makeNeighborhoodInputs();
  const state = buildNeighborhoodState({
    ...inputs,
    hostFacts: [malformedNeighborhoodCoreFact(inputs)]
  });

  assert.equal(state.neighborhoodCore.summary, "1 lane(s), 0 alternative(s), lawful");
  assert.equal(state.reintegrationDetail.summary.length > 0, true);
  const firstFact = state.sessionFamilyFacts[0];
  assert.ok(firstFact !== undefined);
  assert.equal(firstFact.field, "neighborhoodCore");
  assert.equal(firstFact.origin, "HOST_PUBLISHED");

  if (firstFact.posture !== "OBSTRUCTED") {
    assert.fail("expected malformed host fact to be obstructed");
  }

  assert.match(firstFact.reason, /failed hydration/);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  NeighborhoodCoreSummary
} from "../src/app/NeighborhoodCoreSummary.ts";
import type { EffectEmissionSummary, LaneRef, PlaybackFrame, ReceiptSummary } from "../src/protocol.ts";

function makeCatalog(): LaneRef[] {
  return [
    {
      id: "wl:main",
      kind: "WORLDLINE",
      worldlineId: "wl:main",
      writable: false,
      description: "main"
    },
    {
      id: "ws:sandbox",
      kind: "STRAND",
      worldlineId: "wl:main",
      parentId: "wl:main",
      writable: true,
      description: "sandbox"
    },
    {
      id: "ws:ignored",
      kind: "STRAND",
      worldlineId: "wl:main",
      parentId: "wl:main",
      writable: true,
      description: "ignored"
    }
  ];
}

function makeFrame(): PlaybackFrame {
  return {
    headId: "head:test",
    frameIndex: 2,
    lanes: [
      {
        laneId: "wl:main",
        worldlineId: "wl:main",
        coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 },
        changed: false
      },
      {
        laneId: "ws:sandbox",
        worldlineId: "wl:main",
        coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 },
        changed: true
      },
      {
        laneId: "ws:ignored",
        worldlineId: "wl:main",
        coordinate: { laneId: "ws:ignored", worldlineId: "wl:main", tick: 0 },
        changed: false
      }
    ]
  };
}

function makeReceipt(): ReceiptSummary {
  return {
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
  };
}

function makeEmission(): EffectEmissionSummary {
  return {
    emissionId: "emit:test:1",
    headId: "head:test",
    frameIndex: 2,
    laneId: "ws:sandbox",
    worldlineId: "wl:main",
    coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 },
    effectKind: "diagnostic",
    producerWriter: { writerId: "bob", worldlineId: "wl:main", headId: "head:writer:bob" },
    summary: "sandbox emission"
  };
}

test("fromFrame derives participating lanes from changed lanes, receipts, and emissions", () => {
  const core = NeighborhoodCoreSummary.fromFrame(
    makeFrame(),
    [makeReceipt()],
    [makeEmission()]
  );

  assert.equal(core.headId, "head:test");
  assert.equal(core.frameIndex, 2);
  assert.equal(core.primaryLaneId, "wl:main");
  assert.deepEqual(core.participatingLaneIds, ["ws:sandbox"]);
  assert.equal(core.outcome, "OBSTRUCTED");
  assert.equal(core.alternatives.length, 1);
  const firstAlternative = core.alternatives[0];
  assert.ok(firstAlternative);
  assert.equal(firstAlternative.laneId, "ws:sandbox");
  assert.equal(firstAlternative.worldlineId, "wl:main");
  assert.match(core.summary, /1 lane\(s\), 1 alternative\(s\), obstructed/);
});

test("fromFrame falls back to the primary lane when nothing changed", () => {
  const frame: PlaybackFrame = {
    headId: "head:test",
    frameIndex: 0,
    lanes: [
      {
        laneId: "wl:main",
        worldlineId: "wl:main",
        coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 0 },
        changed: false
      }
    ]
  };

  const core = NeighborhoodCoreSummary.fromFrame(frame, [], []);

  assert.deepEqual(core.participatingLaneIds, ["wl:main"]);
  assert.equal(core.outcome, "LAWFUL");
  assert.deepEqual(core.alternatives, []);
});

test("fromFrame derives PENDING outcome when counterfactuals exist but no rejections", () => {
  const receipt: ReceiptSummary = {
    ...makeReceipt(),
    rejectedRewriteCount: 0,
    counterfactualCount: 2,
    admittedRewriteCount: 1,
  };

  const core = NeighborhoodCoreSummary.fromFrame(makeFrame(), [receipt], []);

  assert.equal(core.outcome, "PENDING");
  assert.equal(core.alternatives.length, 1);
  const alt = core.alternatives[0];
  assert.ok(alt);
  assert.equal(alt.outcome, "PENDING");
  assert.match(alt.summary, /2 counterfactual/);
});

test("buildDisplayCatalog preserves ancestor context for participating strands", () => {
  const core = NeighborhoodCoreSummary.fromFrame(
    makeFrame(),
    [makeReceipt()],
    [makeEmission()]
  );

  const scoped = core.buildDisplayCatalog(makeCatalog());

  assert.deepEqual(
    scoped.map((lane) => lane.id),
    ["wl:main", "ws:sandbox"]
  );
});

test("constructor rejects invalid outcome strings", () => {
  assert.throws(
    () => Reflect.construct(NeighborhoodCoreSummary, [JSON.parse(JSON.stringify({
      siteId: "site:test",
      headId: "head:test",
      frameIndex: 0,
      coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 0 },
      primaryLaneId: "wl:main",
      primaryWorldlineId: "wl:main",
      participatingLaneIds: ["wl:main"],
      outcome: "BROKEN",
      alternatives: [],
      summary: "broken"
    }))]),
    /Invalid neighborhood outcome/
  );
});

test("toJSON returns a stable plain-data representation", () => {
  const core = NeighborhoodCoreSummary.fromFrame(
    makeFrame(),
    [makeReceipt()],
    [makeEmission()]
  );

  const json = core.toJSON();
  const serialized = JSON.stringify(json);

  assert.equal(json.siteId, core.siteId);
  assert.deepEqual(json.participatingLaneIds, ["ws:sandbox"]);
  assert.deepEqual(JSON.parse(serialized), json);
});

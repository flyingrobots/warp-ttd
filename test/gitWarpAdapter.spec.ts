import test from "node:test";
import assert from "node:assert/strict";

import type { StrandDescriptor } from "@git-stunts/git-warp";
import { GitWarpAdapter } from "../src/adapters/gitWarpAdapter.ts";
import { scenarioEffectHistory } from "./helpers/gitWarpEffectFixture.ts";
import { scenarioLinearHistory, scenarioMultiWriter } from "./helpers/gitWarpFixture.ts";

interface StubReceipt {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly {
    readonly op: string;
    readonly target: string;
    readonly result: string;
    readonly reason?: string;
  }[];
}

type StubStrand = StrandDescriptor;

interface StubGraph {
  readonly materialize: {
    (options: { receipts: true; ceiling?: number | null }): Promise<{
      state: null;
      receipts: StubReceipt[];
    }>;
    (options?: { receipts?: false; ceiling?: number | null }): Promise<null>;
  };
  readonly discoverWriters: () => Promise<string[]>;
  readonly listStrands: () => Promise<StubStrand[]>;
  readonly getNodes: () => Promise<[]>;
  readonly getEdges: () => Promise<[]>;
  readonly getNodeProps: (nodeId: string) => Promise<Record<string, string> | null>;
}

function createStubMaterialize(
  receipts: StubReceipt[],
  materializeCeilings: number[]
): StubGraph["materialize"] {
  function recordCeiling(ceiling: number | null | undefined): void {
    if (ceiling !== undefined && ceiling !== null) {
      materializeCeilings.push(ceiling);
    }
  }

  function materialize(
    options: { receipts: true; ceiling?: number | null }
  ): Promise<{ state: null; receipts: StubReceipt[] }>;
  function materialize(
    options?: { receipts?: false; ceiling?: number | null }
  ): Promise<null>;
  function materialize(
    options?: { receipts?: boolean; ceiling?: number | null }
  ): Promise<{ state: null; receipts: StubReceipt[] } | null> {
    if (options?.receipts === true) {
      return Promise.resolve({ state: null, receipts });
    }

    recordCeiling(options?.ceiling);
    return Promise.resolve(null);
  }

  return materialize;
}

interface StubRuntimeOptions {
  readonly receipts: StubReceipt[];
  readonly propsByNodeId: Map<string, Record<string, string> | null>;
  readonly materializeCeilings: number[];
  readonly strands?: StubStrand[];
}

function createStubRuntime({
  receipts,
  propsByNodeId,
  materializeCeilings,
  strands = []
}: StubRuntimeOptions): StubGraph {
  return {
    materialize: createStubMaterialize(receipts, materializeCeilings),
    discoverWriters(): Promise<string[]> {
      return Promise.resolve([]);
    },
    listStrands(): Promise<StubStrand[]> {
      return Promise.resolve(strands);
    },
    getNodes(): Promise<[]> {
      return Promise.resolve([]);
    },
    getEdges(): Promise<[]> {
      return Promise.resolve([]);
    },
    getNodeProps(nodeId: string): Promise<Record<string, string> | null> {
      return Promise.resolve(propsByNodeId.get(nodeId) ?? null);
    }
  };
}

function createStubGraph(
  receipts: StubReceipt[],
  propsByNodeId: Map<string, Record<string, string> | null>,
  strands: StubStrand[] = []
): {
  readonly graph: StubGraph;
  readonly materializeCeilings: number[];
} {
  const materializeCeilings: number[] = [];

  return {
    graph: createStubRuntime({
      receipts,
      propsByNodeId,
      materializeCeilings,
      strands
    }),
    materializeCeilings
  };
}

function createStubStrand(
  strandId: string,
  scope: string | null,
  writable: boolean
): StubStrand {
  return {
    schemaVersion: 1,
    strandId,
    graphName: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    owner: null,
    scope,
    lease: {
      expiresAt: null
    },
    baseObservation: {
      coordinateVersion: "v1",
      frontier: {},
      frontierDigest: "digest",
      lamportCeiling: null
    },
    overlay: {
      overlayId: `${strandId}:overlay`,
      kind: "patch-log",
      headPatchSha: null,
      patchCount: 0,
      writable
    },
    braid: {
      readOverlays: []
    },
    materialization: {
      cacheAuthority: "derived"
    }
  };
}

test("hello identifies the host as git-warp", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const hello = await adapter.hello();

    assert.equal(hello.hostKind, "GIT_WARP");
    assert.equal(hello.protocolVersion, "0.5.0");
    assert.ok(hello.hostVersion.length > 0);
    assert.ok(hello.capabilities.includes("READ_HELLO"));
    assert.ok(hello.capabilities.includes("READ_LANE_CATALOG"));
    assert.ok(hello.capabilities.includes("READ_PLAYBACK_HEAD"));
    assert.ok(hello.capabilities.includes("READ_FRAME"));
    assert.ok(hello.capabilities.includes("READ_RECEIPTS"));
    assert.ok(hello.capabilities.includes("READ_EFFECT_EMISSIONS"));
    assert.ok(hello.capabilities.includes("CONTROL_STEP_FORWARD"));
    assert.ok(!hello.capabilities.includes("READ_DELIVERY_OBSERVATIONS"));
    assert.ok(!hello.capabilities.includes("READ_EXECUTION_CONTEXT"));
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

test("lane catalog includes strand lanes with honest scope descriptions", async () => {
  const { graph } = createStubGraph([], new Map(), [
    createStubStrand("experiment", "draft", true),
    createStubStrand("scratch", "", false)
  ]);

  const adapter = await GitWarpAdapter.create(graph);
  const catalog = await adapter.laneCatalog();
  const experiment = catalog.lanes.find((lane) => lane.id === "ws:experiment");
  const scratch = catalog.lanes.find((lane) => lane.id === "ws:scratch");

  assert.ok(experiment);
  assert.equal(experiment.kind, "STRAND");
  assert.equal(experiment.worldlineId, "wl:live");
  assert.equal(experiment.parentId, "wl:live");
  assert.equal(experiment.writable, true);
  assert.equal(experiment.description, "Strand experiment (draft)");

  assert.ok(scratch);
  assert.equal(scratch.kind, "STRAND");
  assert.equal(scratch.writable, false);
  assert.equal(scratch.description, "Strand scratch");
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

test("stepBackward moves the playback head backward and clamps at frame zero", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    await adapter.stepForward("head:default");
    const rewound = await adapter.stepBackward("head:default");
    const clamped = await adapter.stepBackward("head:default");

    assert.equal(rewound.frameIndex, 0);
    assert.equal(clamped.frameIndex, 0);

    const head = await adapter.playbackHead("head:default");
    assert.equal(head.currentFrameIndex, 0);
  } finally {
    await fixture.cleanup();
  }
});

test("seekToFrame clamps the playback head to the available frame range", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const clamped = await adapter.seekToFrame("head:default", 99);

    assert.equal(clamped.frameIndex, 2);

    const head = await adapter.playbackHead("head:default");
    assert.equal(head.currentFrameIndex, 2);
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
    assert.equal(r1.writer.headId, undefined, "git-warp should not invent writer head identity");
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

test("receipts count rejected and counterfactual operations from tick receipts", async () => {
  const { graph } = createStubGraph(
    [
      {
        patchSha: "patch-1",
        writer: "alice",
        lamport: 1,
        ops: [
          { op: "NodeAdd", target: "node:1", result: "applied" },
          { op: "NodePropSet", target: "node:1", result: "superseded" },
          { op: "NodePropSet", target: "node:1", result: "redundant" }
        ]
      }
    ],
    new Map()
  );

  const adapter = await GitWarpAdapter.create(graph);
  const receipts = await adapter.receipts("head:default", 1);
  const receipt = receipts[0];

  assert.equal(receipts.length, 1);
  assert.ok(receipt);
  assert.equal(receipt.admittedRewriteCount, 1);
  assert.equal(receipt.rejectedRewriteCount, 1);
  assert.equal(receipt.counterfactualCount, 1);
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

test("git-warp adapter returns no effect emissions for frames without effect nodes", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    assert.deepEqual(await adapter.effectEmissions("head:default", 1), []);
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter returns no effect emissions at frame zero", async () => {
  const fixture = await scenarioEffectHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    assert.deepEqual(await adapter.effectEmissions("head:default", 0), []);
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter surfaces substrate effect nodes as effect emissions", async () => {
  const fixture = await scenarioEffectHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    const emissions = await adapter.effectEmissions("head:default", 1);

    assert.equal(emissions.length, 1);

    const emission = emissions[0];
    assert.ok(emission !== undefined);
    assert.equal(emission.emissionId, fixture.effectId);
    assert.equal(emission.headId, "head:default");
    assert.equal(emission.frameIndex, 1);
    assert.equal(emission.laneId, "wl:live");
    assert.equal(emission.worldlineId, "wl:live");
    assert.deepEqual(emission.coordinate, {
      laneId: "wl:live",
      worldlineId: "wl:live",
      tick: 1
    });
    assert.equal(emission.effectKind, "notification");
    assert.equal(emission.producerWriter.writerId, "alice");
    assert.equal(emission.producerWriter.worldlineId, "wl:live");
    assert.equal(emission.producerWriter.headId, undefined);
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter materializes effect-node props at the requested historical ceiling", async () => {
  const fixture = await scenarioEffectHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    const frame1Emissions = await adapter.effectEmissions("head:default", 1);
    const frame2Emissions = await adapter.effectEmissions("head:default", 2);

    assert.equal(frame1Emissions.length, 1, "Frame 1 should still see the historical effect node");
    assert.deepEqual(frame2Emissions, [], "Frame 2 should not invent a new emission for the tombstone tick");
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter skips malformed effect nodes with no kind", async () => {
  const { graph } = createStubGraph(
    [{
      patchSha: "sha-1",
      writer: "alice",
      lamport: 1,
      ops: [
        {
          op: "NodeAdd",
          target: "@warp/effect:alice-1-0",
          result: "applied"
        }
      ]
    }],
    new Map([
      ["@warp/effect:alice-1-0", { writer: "alice" }]
    ])
  );

  const adapter = await GitWarpAdapter.create(graph);
  const emissions = await adapter.effectEmissions("head:default", 1);

  assert.deepEqual(emissions, [], "malformed effect node without kind should be silently skipped");
});

test("git-warp adapter skips effect nodes whose kind is an empty string", async () => {
  const { graph } = createStubGraph(
    [{
      patchSha: "sha-1",
      writer: "alice",
      lamport: 1,
      ops: [
        {
          op: "NodeAdd",
          target: "@warp/effect:empty-kind",
          result: "applied"
        }
      ]
    }],
    new Map([
      ["@warp/effect:empty-kind", { kind: "" }]
    ])
  );

  const adapter = await GitWarpAdapter.create(graph);
  const emissions = await adapter.effectEmissions("head:default", 1);

  assert.deepEqual(emissions, [], "effect node with empty kind should be silently skipped");
});

test("git-warp adapter rejects unknown heads for effect emissions", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    await assert.rejects(
      async () => await adapter.effectEmissions("head:missing", 1),
      /Unknown playback head/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter rejects out-of-range effect-emission frame lookups", async () => {
  const fixture = await scenarioEffectHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    await assert.rejects(
      async () => await adapter.effectEmissions("head:default", 99),
      /Frame index/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter deduplicates repeated effect-node adds in one frame", async () => {
  const { graph, materializeCeilings } = createStubGraph(
    [
      {
        patchSha: "sha-1",
        writer: "alice",
        lamport: 1,
        ops: [
          {
            op: "NodeAdd",
            target: "@warp/effect:alice-1-0",
            result: "applied"
          }
        ]
      },
      {
        patchSha: "sha-2",
        writer: "bob",
        lamport: 1,
        ops: [
          {
            op: "NodeAdd",
            target: "@warp/effect:alice-1-0",
            result: "applied"
          }
        ]
      }
    ],
    new Map([
      ["@warp/effect:alice-1-0", { kind: "diagnostic", writer: "alice" }]
    ])
  );

  const adapter = await GitWarpAdapter.create(graph);
  const emissions = await adapter.effectEmissions("head:default", 1);

  assert.equal(emissions.length, 1);
  assert.deepEqual(materializeCeilings, [1]);
});

test("git-warp adapter caches effect emissions per frame to avoid redundant materialization", async () => {
  const { graph, materializeCeilings } = createStubGraph(
    [{
      patchSha: "sha-1",
      writer: "alice",
      lamport: 1,
      ops: [{ op: "NodeAdd", target: "@warp/effect:alice-1-0", result: "applied" }]
    }],
    new Map([["@warp/effect:alice-1-0", { kind: "diagnostic", writer: "alice" }]])
  );

  const adapter = await GitWarpAdapter.create(graph);
  const first = await adapter.effectEmissions("head:default", 1);
  const second = await adapter.effectEmissions("head:default", 1);

  assert.equal(first.length, 1);
  assert.deepEqual(first, second, "cached result should be structurally equal");
  assert.notEqual(first[0], second[0], "cached result should be a clone, not the same reference");
  assert.equal(materializeCeilings.length, 1, "should materialize only once, not per-call");
});

test("git-warp adapter still returns no delivery observations", async () => {
  const fixture = await scenarioEffectHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    assert.deepEqual(await adapter.deliveryObservations("head:default", 1), []);
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter rejects unknown heads for delivery observations", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);

    await assert.rejects(
      async () => await adapter.deliveryObservations("head:missing", 1),
      /Unknown playback head/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("git-warp adapter execution context is debug-mode fallback", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const adapter = await GitWarpAdapter.create(fixture.graph);
    assert.deepEqual(await adapter.executionContext(), { mode: "DEBUG" });
  } finally {
    await fixture.cleanup();
  }
});

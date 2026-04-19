/**
 * Navigator layout unit tests — fixture matrix from design doc 0013.
 *
 * Tests the pure layout helpers and the rendered Surface output
 * against the design doc's behavioral spec.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import { surfaceToString } from "@flyingrobots/bijou";
import {
  buildLaneTree,
  buildPositionBar,
  buildLaneLines,
  buildReceiptRows,
  buildEffectRows,
  buildPinLines,
  hasCap,
  pluralize,
  truncateRows,
  renderNavigator,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- available for future threshold tests
  HORIZONTAL_THRESHOLD
} from "../src/tui/navigatorLayout.ts";
import type { SessionSnapshot } from "../src/app/debuggerSession.ts";
import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import { NeighborhoodSiteCatalog } from "../src/app/NeighborhoodSiteCatalog.ts";
import { ReintegrationDetailSummary } from "../src/app/ReintegrationDetailSummary.ts";
import { ReceiptShellSummary } from "../src/app/ReceiptShellSummary.ts";
import type {
  Capability,
  DeliveryObservationSummary,
  EffectEmissionSummary,
  LaneRef,
  ReceiptSummary
} from "../src/protocol.ts";

const bijouCtx = initDefaultContext();

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const ALL_CAPS: Capability[] = [
  "READ_HELLO", "READ_LANE_CATALOG", "READ_PLAYBACK_HEAD",
  "READ_FRAME", "READ_RECEIPTS", "READ_EFFECT_EMISSIONS",
  "READ_DELIVERY_OBSERVATIONS", "READ_EXECUTION_CONTEXT",
  "CONTROL_STEP_FORWARD", "CONTROL_STEP_BACKWARD", "CONTROL_SEEK"
];

function capsWithout(...exclude: Capability[]): Capability[] {
  return ALL_CAPS.filter((c) => !exclude.includes(c));
}

function makeLane(id: string, kind: "WORLDLINE" | "STRAND", parentId?: string): LaneRef {
  const displayKind = kind.toLowerCase();
  const ref: LaneRef = {
    id,
    kind,
    worldlineId: kind === "WORLDLINE" ? id : (parentId ?? "wl:main"),
    writable: kind === "STRAND",
    description: `${displayKind} ${id}`
  };
  if (parentId !== undefined) {
    ref.parentId = parentId;
  }
  return ref;
}

interface ReceiptArgs {
  laneId: string;
  worldlineId?: string;
  writerId: string;
  frameIndex: number;
  headId?: string;
}

function makeReceipt(args: ReceiptArgs): ReceiptSummary {
  const wlId = args.worldlineId ?? args.laneId;
  return {
    receiptId: `receipt:test:${args.laneId}:${args.writerId}`,
    headId: "head:default",
    frameIndex: args.frameIndex,
    laneId: args.laneId,
    worldlineId: wlId,
    writer: args.headId === undefined
      ? { writerId: args.writerId, worldlineId: wlId }
      : { writerId: args.writerId, worldlineId: wlId, headId: args.headId },
    inputTick: args.frameIndex - 1, outputTick: args.frameIndex,
    admittedRewriteCount: 2, rejectedRewriteCount: 0, counterfactualCount: 0,
    digest: "digest:test", summary: `${args.writerId} wrote to ${args.laneId}`
  };
}

function makeEmission(laneId: string, kind: string, frameIndex: number): EffectEmissionSummary {
  return {
    emissionId: `emit:test:${kind}:${laneId}`,
    headId: "head:default", frameIndex, laneId, worldlineId: laneId,
    coordinate: { laneId, worldlineId: laneId, tick: frameIndex },
    effectKind: kind, producerWriter: { writerId: "test-writer", worldlineId: laneId, headId: "head:writer:test" },
    summary: `${kind} at ${laneId}`
  };
}

interface ObsArgs { emissionId: string; sinkId: string; outcome: "DELIVERED" | "SUPPRESSED"; frameIndex: number }
function makeObservation(args: ObsArgs): DeliveryObservationSummary {
  return {
    observationId: `obs:test:${args.sinkId}`,
    emissionId: args.emissionId, headId: "head:default", frameIndex: args.frameIndex,
    sinkId: args.sinkId, outcome: args.outcome, reason: "test", executionMode: "LIVE",
    summary: `${args.outcome.toLowerCase()} to ${args.sinkId}`
  };
}

function makeSnap(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  const neighborhoodCore = makeNeighborhoodCore();
  const neighborhoodSites = NeighborhoodSiteCatalog.fromCore(neighborhoodCore);
  const reintegrationDetail = makeReintegrationDetail(neighborhoodCore.siteId);
  const receiptShell = makeReceiptShell(neighborhoodCore.siteId);

  return {
    head: { headId: "head:default", label: "Test Head", currentFrameIndex: 1, trackedLaneIds: ["wl:main"], writableLaneIds: [], paused: true },
    frame: { headId: "head:default", frameIndex: 1, lanes: [{ laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 }, changed: true }] },
    receipts: [makeReceipt({ laneId: "wl:main", writerId: "alice", frameIndex: 1 })],
    emissions: [makeEmission("wl:main", "diagnostic", 1)],
    observations: [makeObservation({ emissionId: "emit:test:diagnostic:wl:main", sinkId: "sink:tui-log", outcome: "DELIVERED", frameIndex: 1 })],
    execCtx: { mode: "LIVE" },
    neighborhoodCore,
    neighborhoodSites,
    reintegrationDetail,
    receiptShell,
    ...overrides
  };
}

function makeNeighborhoodCore(): NeighborhoodCoreSummary {
  return new NeighborhoodCoreSummary({
    siteId: "site:head:default:1:wl:main",
    headId: "head:default",
    frameIndex: 1,
    coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
    primaryLaneId: "wl:main",
    primaryWorldlineId: "wl:main",
    participatingLaneIds: ["wl:main"],
    outcome: "LAWFUL",
    alternatives: [],
    summary: "1 lane(s), 0 alternative(s), lawful"
  });
}

function makeReintegrationDetail(siteId: string): ReintegrationDetailSummary {
  return new ReintegrationDetailSummary({
    siteId,
    anchors: [{
      anchorId: "anchor:wl:main:primary",
      kind: "PRIMARY_LANE",
      laneId: "wl:main",
      worldlineId: "wl:main",
      summary: "Primary lane wl:main"
    }],
    obligations: [{
      obligationId: "obligation:receipt:test:wl:main:alice:admission",
      kind: "REWRITE_ADMISSION",
      status: "SATISFIED",
      summary: "wl:main rewrite admission satisfied"
    }],
    evidence: [{
      evidenceId: "evidence:receipt:test:wl:main:alice",
      obligationId: "obligation:receipt:test:wl:main:alice:admission",
      visibility: "RECEIPT_DIGEST",
      summary: "receipt:test:wl:main:alice (digest:test)"
    }],
    summary: "1 anchor(s), 1 obligation(s), 1 evidence handle(s)"
  });
}

function makeReceiptShell(siteId: string): ReceiptShellSummary {
  return new ReceiptShellSummary({
    siteId,
    receiptIds: ["receipt:test:wl:main:alice"],
    candidateCount: 2,
    rejectedCount: 0,
    hasBlockingRelation: false,
    summary: "2 candidate(s), 0 rejected, non-blocking"
  });
}

function renderToString(surface: ReturnType<typeof renderNavigator>): string {
  return surfaceToString(surface, bijouCtx.style);
}

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

test("hasCap returns true for present capability", () => {
  assert.equal(hasCap(ALL_CAPS, "READ_RECEIPTS"), true);
});

test("hasCap returns false for absent capability", () => {
  assert.equal(hasCap(capsWithout("READ_RECEIPTS"), "READ_RECEIPTS"), false);
});

test("pluralize: singular and plural", () => {
  assert.equal(pluralize(1, "receipt"), "1 receipt");
  assert.equal(pluralize(0, "effect"), "0 effects");
  assert.equal(pluralize(5, "lane"), "5 lanes");
});

test("truncateRows: within budget", () => {
  const { visible, total } = truncateRows([1, 2, 3], 5);
  assert.deepEqual(visible, [1, 2, 3]);
  assert.equal(total, 3);
});

test("truncateRows: over budget", () => {
  const { visible, total } = truncateRows([1, 2, 3, 4, 5], 3);
  assert.deepEqual(visible, [1, 2, 3]);
  assert.equal(total, 5);
});

// ---------------------------------------------------------------------------
// Lane tree tests
// ---------------------------------------------------------------------------

test("buildLaneTree: depth-first pre-order with strands under parents", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("ws:alpha", "STRAND", "wl:main"),
    makeLane("wl:secondary", "WORLDLINE"),
    makeLane("ws:beta", "STRAND", "wl:main"),
    makeLane("ws:gamma", "STRAND", "ws:alpha")
  ];
  const tree = buildLaneTree(catalog);
  const ids = tree.map((l) => l.id);
  assert.deepEqual(ids, ["wl:main", "ws:alpha", "ws:gamma", "ws:beta", "wl:secondary"]);
});

test("buildLaneTree: roots only (no strands)", () => {
  const catalog = [makeLane("wl:a", "WORLDLINE"), makeLane("wl:b", "WORLDLINE")];
  const tree = buildLaneTree(catalog);
  assert.deepEqual(tree.map((l) => l.id), ["wl:a", "wl:b"]);
});

// ---------------------------------------------------------------------------
// Position bar tests
// ---------------------------------------------------------------------------

test("position bar: wide format with all capabilities", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: ALL_CAPS, catalog: [makeLane("wl:main", "WORLDLINE")], wide: true });
  assert.ok(bar.includes("Frame 1"));
  assert.ok(bar.includes("wl:main"));
  assert.ok(bar.includes("live"));
  assert.ok(bar.includes("1 receipt"));
  assert.ok(bar.includes("1 effect"));
});

test("position bar: narrow format", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: ALL_CAPS, catalog: [makeLane("wl:main", "WORLDLINE")], wide: false });
  assert.ok(bar.includes("1r"));
  assert.ok(bar.includes("1e"));
});

test("position bar: receipts unsupported", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: capsWithout("READ_RECEIPTS"), catalog: [makeLane("wl:main", "WORLDLINE")], wide: true });
  assert.ok(bar.includes("receipts: unsupported"));
});

test("position bar: effects unsupported", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: capsWithout("READ_EFFECT_EMISSIONS"), catalog: [makeLane("wl:main", "WORLDLINE")], wide: true });
  assert.ok(bar.includes("effects: unsupported"));
});

// ---------------------------------------------------------------------------
// Lane lines tests
// ---------------------------------------------------------------------------

test("buildLaneLines: shows changed marker from receipts", () => {
  const catalog = [makeLane("wl:main", "WORLDLINE"), makeLane("wl:other", "WORLDLINE")];
  const snap = makeSnap();
  const { lines } = buildLaneLines(catalog, snap, true);
  const mainLine = lines.find((l) => l.includes("wl:main"));
  const otherLine = lines.find((l) => l.includes("wl:other"));
  assert.ok(mainLine !== undefined);
  assert.ok(mainLine.includes("*"), "wl:main should be marked changed (has receipt)");
  assert.ok(otherLine !== undefined);
  assert.ok(!otherLine.includes("*"), "wl:other should not be marked changed");
});

test("buildLaneLines: omits Chg column when receipts unsupported", () => {
  const catalog = [makeLane("wl:main", "WORLDLINE")];
  const { header } = buildLaneLines(catalog, makeSnap(), false);
  assert.ok(!header.includes("Chg"));
});

test("buildLaneLines: shows tree connectors for strands", () => {
  const catalog = [makeLane("wl:main", "WORLDLINE"), makeLane("ws:child", "STRAND", "wl:main")];
  const { lines } = buildLaneLines(catalog, makeSnap(), true);
  const childLine = lines.find((l) => l.includes("ws:child"));
  assert.ok(childLine !== undefined);
  assert.ok(childLine.includes("\u2514"), "Child strand should have tree connector");
});

test("buildLaneLines: truncation with overflow message", () => {
  const catalog = Array.from({ length: 12 }, (...[, i]) => makeLane(`wl:lane${i.toString()}`, "WORLDLINE"));
  const { lines, total } = buildLaneLines(catalog, makeSnap(), true);
  assert.equal(total, 12);
  assert.ok(lines.length <= 9); // 8 visible + overflow message
  assert.ok(lines.some((l) => l.includes("+4 more lanes")));
});

// ---------------------------------------------------------------------------
// Receipt/effect row tests
// ---------------------------------------------------------------------------

test("buildReceiptRows: sorted by lane then writer", () => {
  const snap = makeSnap({
    receipts: [
      makeReceipt({ laneId: "wl:b", writerId: "bob", frameIndex: 1 }),
      makeReceipt({ laneId: "wl:a", writerId: "alice", frameIndex: 1, headId: "head:writer:2" }),
      makeReceipt({ laneId: "wl:a", writerId: "alice", frameIndex: 1, headId: "head:writer:1" }),
      makeReceipt({ laneId: "wl:a", writerId: "carol", frameIndex: 1 })
    ]
  });
  const { rows } = buildReceiptRows(snap, 10);
  assert.ok(rows[0] !== undefined);
  assert.equal(rows[0][0], "wl:a");
  assert.equal(rows[0][1], "alice@wl:a#head:writer:1");
  assert.ok(rows[1] !== undefined);
  assert.equal(rows[1][0], "wl:a");
  assert.equal(rows[1][1], "alice@wl:a#head:writer:2");
  assert.ok(rows[2] !== undefined);
  assert.equal(rows[2][0], "wl:a");
  assert.equal(rows[2][1], "carol@wl:a");
  assert.ok(rows[3] !== undefined);
  assert.equal(rows[3][0], "wl:b");
});

test("buildEffectRows: delivery unsupported shows placeholder", () => {
  const caps = capsWithout("READ_DELIVERY_OBSERVATIONS");
  const snap = makeSnap();
  const { rows } = buildEffectRows(snap, caps, 10);
  assert.equal(rows.length, 1);
  assert.ok(rows[0] !== undefined);
  assert.ok(rows[0][3]?.includes("delivery unsupported") === true);
});

test("buildEffectRows: emission with no deliveries shows emitted", () => {
  const snap = makeSnap({ observations: [] });
  const { rows } = buildEffectRows(snap, ALL_CAPS, 10);
  assert.ok(rows[0] !== undefined);
  assert.equal(rows[0][3], "emitted");
});

test("buildEffectRows: truncation", () => {
  const emissions = Array.from({ length: 10 }, (...[, i]) => makeEmission("wl:main", `kind${i.toString()}`, 1));
  const snap = makeSnap({ emissions, observations: [] });
  const { rows, total } = buildEffectRows(snap, ALL_CAPS, 6);
  assert.equal(rows.length, 6);
  assert.equal(total, 10);
});

// ---------------------------------------------------------------------------
// Pin lines tests
// ---------------------------------------------------------------------------

test("buildPinLines: within budget", () => {
  const pins = [
    { pinnedAt: 1, observation: makeObservation({ emissionId: "e1", sinkId: "sink:a", outcome: "DELIVERED", frameIndex: 1 }), emission: makeEmission("wl:main", "diag", 1) },
    { pinnedAt: 2, observation: makeObservation({ emissionId: "e2", sinkId: "sink:b", outcome: "SUPPRESSED", frameIndex: 2 }), emission: makeEmission("wl:main", "notif", 2) }
  ];
  const { lines, total } = buildPinLines(pins);
  assert.equal(total, 2);
  assert.equal(lines.length, 2);
});

test("buildPinLines: over budget shows overflow", () => {
  const pins = Array.from({ length: 5 }, (...[, i]) => ({
    pinnedAt: i,
    observation: makeObservation({ emissionId: `e${i.toString()}`, sinkId: `sink:${i.toString()}`, outcome: "DELIVERED", frameIndex: i }),
    emission: makeEmission("wl:main", "diag", i)
  }));
  const { lines, total } = buildPinLines(pins);
  assert.equal(total, 5);
  assert.ok(lines.some((l) => l.includes("+2 older pins")));
});

// ---------------------------------------------------------------------------
// Full render tests (Surface → string)
// ---------------------------------------------------------------------------

test("renderNavigator: wide terminal renders position bar with full counts", () => {
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 120, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Frame 1"));
  assert.ok(output.includes("1 receipt"));
  assert.ok(output.includes("1 effect"));
});

test("renderNavigator: narrow terminal renders compact counts", () => {
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 80, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("1r"));
  assert.ok(output.includes("1e"));
});

test("renderNavigator: frame 0 shows no activity", () => {
  const snap = makeSnap({
    head: { headId: "head:default", label: "Test", currentFrameIndex: 0, trackedLaneIds: ["wl:main"], writableLaneIds: [], paused: true },
    frame: { headId: "head:default", frameIndex: 0, lanes: [{ laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 0 }, changed: false }] },
    receipts: [], emissions: [], observations: []
  });
  const output = renderToString(renderNavigator({
    snap, caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Frame 0"));
  assert.ok(output.includes("0 receipts"));
});

test("renderNavigator: no receipts capability omits receipt section", () => {
  const caps = capsWithout("READ_RECEIPTS");
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("receipts: unsupported"));
  assert.ok(!output.includes("Receipts"));
});

test("renderNavigator: no effects capability omits effects section", () => {
  const caps = capsWithout("READ_EFFECT_EMISSIONS");
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("effects: unsupported"));
  assert.ok(!output.includes("Effects"));
});

test("renderNavigator: multi-strand tree shows connectors", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("ws:alpha", "STRAND", "wl:main"),
    makeLane("ws:beta", "STRAND", "wl:main")
  ];
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps: ALL_CAPS, catalog,
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("\u2514"));
});

test("renderNavigator: keybinding hints always visible", () => {
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Fwd"));
  assert.ok(output.includes("Back"));
  assert.ok(output.includes("Pin"));
});

test("renderNavigator: jump prompt replaces keybinding hints", () => {
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "WORLDLINE")],
    pins: [], error: null, jumpInput: "42",
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Jump to frame: 42"));
});

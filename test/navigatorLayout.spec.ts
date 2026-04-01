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
  "read:hello", "read:lane-catalog", "read:playback-head",
  "read:frame", "read:receipts", "read:effect-emissions",
  "read:delivery-observations", "read:execution-context",
  "control:step-forward", "control:step-backward", "control:seek"
];

function capsWithout(...exclude: Capability[]): Capability[] {
  return ALL_CAPS.filter((c) => !exclude.includes(c));
}

function makeLane(id: string, kind: "worldline" | "strand", parentId?: string): LaneRef {
  const ref: LaneRef = { id, kind, writable: kind === "strand", description: `${kind} ${id}` };
  if (parentId !== undefined) {
    ref.parentId = parentId;
  }
  return ref;
}

function makeReceipt(laneId: string, writerId: string, frameIndex: number): ReceiptSummary {
  return {
    receiptId: `receipt:test:${laneId}:${writerId}`,
    headId: "head:default", frameIndex, laneId, writerId,
    inputTick: frameIndex - 1, outputTick: frameIndex,
    admittedRewriteCount: 2, rejectedRewriteCount: 0, counterfactualCount: 0,
    digest: "digest:test", summary: `${writerId} wrote to ${laneId}`
  };
}

function makeEmission(laneId: string, kind: string, frameIndex: number): EffectEmissionSummary {
  return {
    emissionId: `emit:test:${kind}:${laneId}`,
    headId: "head:default", frameIndex, laneId,
    coordinate: { laneId, tick: frameIndex },
    effectKind: kind, producerWriterId: "test-writer",
    summary: `${kind} at ${laneId}`
  };
}

interface ObsArgs { emissionId: string; sinkId: string; outcome: "delivered" | "suppressed"; frameIndex: number }
function makeObservation(args: ObsArgs): DeliveryObservationSummary {
  return {
    observationId: `obs:test:${args.sinkId}`,
    emissionId: args.emissionId, headId: "head:default", frameIndex: args.frameIndex,
    sinkId: args.sinkId, outcome: args.outcome, reason: "test", executionMode: "live",
    summary: `${args.outcome} to ${args.sinkId}`
  };
}

function makeSnap(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    head: { headId: "head:default", label: "Test Head", currentFrameIndex: 1, trackedLaneIds: ["wl:main"], writableLaneIds: [], paused: true },
    frame: { headId: "head:default", frameIndex: 1, lanes: [{ laneId: "wl:main", coordinate: { laneId: "wl:main", tick: 1 }, changed: true }] },
    receipts: [makeReceipt("wl:main", "alice", 1)],
    emissions: [makeEmission("wl:main", "diagnostic", 1)],
    observations: [makeObservation({ emissionId: "emit:test:diagnostic:wl:main", sinkId: "sink:tui-log", outcome: "delivered", frameIndex: 1 })],
    execCtx: { mode: "live" },
    ...overrides
  };
}

function renderToString(surface: ReturnType<typeof renderNavigator>): string {
  return surfaceToString(surface, bijouCtx.style);
}

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

test("hasCap returns true for present capability", () => {
  assert.equal(hasCap(ALL_CAPS, "read:receipts"), true);
});

test("hasCap returns false for absent capability", () => {
  assert.equal(hasCap(capsWithout("read:receipts"), "read:receipts"), false);
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
    makeLane("wl:main", "worldline"),
    makeLane("ws:alpha", "strand", "wl:main"),
    makeLane("wl:secondary", "worldline"),
    makeLane("ws:beta", "strand", "wl:main"),
    makeLane("ws:gamma", "strand", "ws:alpha")
  ];
  const tree = buildLaneTree(catalog);
  const ids = tree.map((l) => l.id);
  assert.deepEqual(ids, ["wl:main", "ws:alpha", "ws:gamma", "ws:beta", "wl:secondary"]);
});

test("buildLaneTree: roots only (no strands)", () => {
  const catalog = [makeLane("wl:a", "worldline"), makeLane("wl:b", "worldline")];
  const tree = buildLaneTree(catalog);
  assert.deepEqual(tree.map((l) => l.id), ["wl:a", "wl:b"]);
});

// ---------------------------------------------------------------------------
// Position bar tests
// ---------------------------------------------------------------------------

test("position bar: wide format with all capabilities", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: ALL_CAPS, catalog: [makeLane("wl:main", "worldline")], wide: true });
  assert.ok(bar.includes("Frame 1"));
  assert.ok(bar.includes("wl:main"));
  assert.ok(bar.includes("live"));
  assert.ok(bar.includes("1 receipt"));
  assert.ok(bar.includes("1 effect"));
});

test("position bar: narrow format", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: ALL_CAPS, catalog: [makeLane("wl:main", "worldline")], wide: false });
  assert.ok(bar.includes("1r"));
  assert.ok(bar.includes("1e"));
});

test("position bar: receipts unsupported", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: capsWithout("read:receipts"), catalog: [makeLane("wl:main", "worldline")], wide: true });
  assert.ok(bar.includes("receipts: unsupported"));
});

test("position bar: effects unsupported", () => {
  const bar = buildPositionBar({ snap: makeSnap(), caps: capsWithout("read:effect-emissions"), catalog: [makeLane("wl:main", "worldline")], wide: true });
  assert.ok(bar.includes("effects: unsupported"));
});

// ---------------------------------------------------------------------------
// Lane lines tests
// ---------------------------------------------------------------------------

test("buildLaneLines: shows changed marker from receipts", () => {
  const catalog = [makeLane("wl:main", "worldline"), makeLane("wl:other", "worldline")];
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
  const catalog = [makeLane("wl:main", "worldline")];
  const { header } = buildLaneLines(catalog, makeSnap(), false);
  assert.ok(!header.includes("Chg"));
});

test("buildLaneLines: shows tree connectors for strands", () => {
  const catalog = [makeLane("wl:main", "worldline"), makeLane("ws:child", "strand", "wl:main")];
  const { lines } = buildLaneLines(catalog, makeSnap(), true);
  const childLine = lines.find((l) => l.includes("ws:child"));
  assert.ok(childLine !== undefined);
  assert.ok(childLine.includes("\u2514"), "Child strand should have tree connector");
});

test("buildLaneLines: truncation with overflow message", () => {
  const catalog = Array.from({ length: 12 }, (...[, i]) => makeLane(`wl:lane${i.toString()}`, "worldline"));
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
      makeReceipt("wl:b", "bob", 1),
      makeReceipt("wl:a", "alice", 1),
      makeReceipt("wl:a", "carol", 1)
    ]
  });
  const { rows } = buildReceiptRows(snap, 10);
  assert.ok(rows[0] !== undefined);
  assert.equal(rows[0][0], "wl:a");
  assert.equal(rows[0][1], "alice");
  assert.ok(rows[1] !== undefined);
  assert.equal(rows[1][0], "wl:a");
  assert.equal(rows[1][1], "carol");
  assert.ok(rows[2] !== undefined);
  assert.equal(rows[2][0], "wl:b");
});

test("buildEffectRows: delivery unsupported shows placeholder", () => {
  const caps = capsWithout("read:delivery-observations");
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
    { pinnedAt: 1, observation: makeObservation({ emissionId: "e1", sinkId: "sink:a", outcome: "delivered", frameIndex: 1 }), emission: makeEmission("wl:main", "diag", 1) },
    { pinnedAt: 2, observation: makeObservation({ emissionId: "e2", sinkId: "sink:b", outcome: "suppressed", frameIndex: 2 }), emission: makeEmission("wl:main", "notif", 2) }
  ];
  const { lines, total } = buildPinLines(pins);
  assert.equal(total, 2);
  assert.equal(lines.length, 2);
});

test("buildPinLines: over budget shows overflow", () => {
  const pins = Array.from({ length: 5 }, (...[, i]) => ({
    pinnedAt: i,
    observation: makeObservation({ emissionId: `e${i.toString()}`, sinkId: `sink:${i.toString()}`, outcome: "delivered", frameIndex: i }),
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
    catalog: [makeLane("wl:main", "worldline")],
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
    catalog: [makeLane("wl:main", "worldline")],
    pins: [], error: null, jumpInput: null,
    w: 80, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("1r"));
  assert.ok(output.includes("1e"));
});

test("renderNavigator: frame 0 shows no activity", () => {
  const snap = makeSnap({
    head: { headId: "head:default", label: "Test", currentFrameIndex: 0, trackedLaneIds: ["wl:main"], writableLaneIds: [], paused: true },
    frame: { headId: "head:default", frameIndex: 0, lanes: [{ laneId: "wl:main", coordinate: { laneId: "wl:main", tick: 0 }, changed: false }] },
    receipts: [], emissions: [], observations: []
  });
  const output = renderToString(renderNavigator({
    snap, caps: ALL_CAPS,
    catalog: [makeLane("wl:main", "worldline")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Frame 0"));
  assert.ok(output.includes("0 receipts"));
});

test("renderNavigator: no receipts capability omits receipt section", () => {
  const caps = capsWithout("read:receipts");
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps,
    catalog: [makeLane("wl:main", "worldline")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("receipts: unsupported"));
  assert.ok(!output.includes("Receipts"));
});

test("renderNavigator: no effects capability omits effects section", () => {
  const caps = capsWithout("read:effect-emissions");
  const output = renderToString(renderNavigator({
    snap: makeSnap(), caps,
    catalog: [makeLane("wl:main", "worldline")],
    pins: [], error: null, jumpInput: null,
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("effects: unsupported"));
  assert.ok(!output.includes("Effects"));
});

test("renderNavigator: multi-strand tree shows connectors", () => {
  const catalog = [
    makeLane("wl:main", "worldline"),
    makeLane("ws:alpha", "strand", "wl:main"),
    makeLane("ws:beta", "strand", "wl:main")
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
    catalog: [makeLane("wl:main", "worldline")],
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
    catalog: [makeLane("wl:main", "worldline")],
    pins: [], error: null, jumpInput: "42",
    w: 100, h: 40, ctx: bijouCtx
  }));
  assert.ok(output.includes("Jump to frame: 42"));
});

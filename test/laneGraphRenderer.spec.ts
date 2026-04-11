/**
 * Lane graph renderer tests — cycle 0012.
 *
 * Pure function tests for column assignment and graph gutter rendering.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { LaneRef } from "../src/protocol.ts";
import {
  assignColumns,
  buildGraphGutter,
  type LaneActivity,
} from "../src/tui/laneGraph.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLane(
  id: string,
  kind: "WORLDLINE" | "STRAND",
  parentId?: string,
): LaneRef {
  return {
    id,
    kind,
    worldlineId: kind === "WORLDLINE" ? id : (parentId ?? "wl:main"),
    ...(parentId !== undefined ? { parentId } : {}),
    writable: kind === "STRAND",
    description: `${kind.toLowerCase()} ${id}`,
  };
}

// ---------------------------------------------------------------------------
// assignColumns
// ---------------------------------------------------------------------------

test("assignColumns gives each lane a unique column", () => {
  const catalog = [
    makeLane("wl:alpha", "WORLDLINE"),
    makeLane("wl:beta", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:alpha"),
  ];
  const columns = assignColumns(catalog);
  const values = [...columns.values()];
  assert.equal(new Set(values).size, 3, "All columns should be unique");
});

test("assignColumns puts worldlines before strands", () => {
  const catalog = [
    makeLane("wl:alpha", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:alpha"),
    makeLane("wl:beta", "WORLDLINE"),
  ];
  const columns = assignColumns(catalog);
  const alphaCol = columns.get("wl:alpha");
  const betaCol = columns.get("wl:beta");
  const featureCol = columns.get("strand:feature");
  assert.ok(alphaCol !== undefined);
  assert.ok(betaCol !== undefined);
  assert.ok(featureCol !== undefined);
  assert.ok(
    featureCol > alphaCol && featureCol > betaCol,
    "Strand column should be after all worldline columns",
  );
});

test("assignColumns handles single worldline", () => {
  const catalog = [makeLane("wl:main", "WORLDLINE")];
  const columns = assignColumns(catalog);
  assert.equal(columns.get("wl:main"), 0);
});

test("assignColumns handles empty catalog", () => {
  const columns = assignColumns([]);
  assert.equal(columns.size, 0);
});

// ---------------------------------------------------------------------------
// buildGraphGutter
// ---------------------------------------------------------------------------

test("buildGraphGutter shows active dot for lane with activity", () => {
  const catalog = [makeLane("wl:main", "WORLDLINE")];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([["wl:main", "active"]]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  assert.ok(gutter.includes("●"), "Active lane should show dot");
});

test("buildGraphGutter shows pass-through for alive but inactive worldline", () => {
  const catalog = [
    makeLane("wl:alpha", "WORLDLINE"),
    makeLane("wl:beta", "WORLDLINE"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([
    ["wl:alpha", "active"],
    ["wl:beta", "pass"],
  ]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  assert.ok(gutter.includes("│"), "Worldline pass-through should show solid vertical line");
});

test("buildGraphGutter shows fork connector with horizontal line", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:main"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([
    ["wl:main", "active"],
    ["strand:feature", "active"],
  ]);
  const gutter = buildGraphGutter({
    columns,
    catalog,
    activity,
    forks: ["strand:feature"],
  });
  assert.ok(gutter.includes("├"), "Fork should show branch connector");
  assert.ok(gutter.includes("─"), "Fork should show horizontal connector to parent");
});

test("buildGraphGutter uses dashed rail for strands", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:main"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([
    ["wl:main", "pass"],
    ["strand:feature", "pass"],
  ]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  assert.ok(gutter.includes("┆"), "Strand pass-through should use dashed line");
});

test("buildGraphGutter shows quiet marker for alive but quiet lane", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:main"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([
    ["wl:main", "active"],
    ["strand:feature", "quiet"],
  ]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  assert.ok(gutter.includes("·"), "Quiet lane should show dim dot");
});

test("buildGraphGutter empty column for unborn lane", () => {
  const catalog = [
    makeLane("wl:main", "WORLDLINE"),
    makeLane("strand:feature", "STRAND", "wl:main"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([["wl:main", "active"]]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  // The strand column should be a space (not born yet)
  assert.ok(!gutter.includes("┆"), "Unborn strand should not show dashed line");
  assert.ok(
    gutter.split("●").length === 2,
    "Only one active dot for wl:main",
  );
});

test("buildGraphGutter width matches column count", () => {
  const catalog = [
    makeLane("wl:alpha", "WORLDLINE"),
    makeLane("wl:beta", "WORLDLINE"),
    makeLane("strand:long-lived", "STRAND", "wl:alpha"),
    makeLane("strand:feature-a", "STRAND", "wl:alpha"),
    makeLane("strand:hotfix", "STRAND", "wl:alpha"),
  ];
  const columns = assignColumns(catalog);
  const activity: LaneActivity = new Map([["wl:alpha", "active"]]);
  const gutter = buildGraphGutter({ columns, catalog, activity, forks: [] });
  const expectedWidth = catalog.length * 2;
  assert.equal(
    gutter.length,
    expectedWidth,
    `Gutter should be ${String(expectedWidth)} chars for ${String(catalog.length)} lanes`,
  );
});

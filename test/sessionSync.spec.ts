import test from "node:test";
import assert from "node:assert/strict";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import { NeighborhoodSiteCatalog } from "../src/app/NeighborhoodSiteCatalog.ts";
import { siteDrivenWorldlineFocus, shouldResyncWorldlineFocus } from "../src/tui/sessionSync.ts";
import type { FrameData } from "../src/tui/worldlineLayout.ts";
import type { LaneRef, PlaybackFrame } from "../src/protocol.ts";

function makeCatalog(): LaneRef[] {
  return [
    { id: "wl:main", kind: "WORLDLINE", worldlineId: "wl:main", writable: false, description: "main" },
    { id: "ws:sandbox", kind: "STRAND", worldlineId: "wl:main", parentId: "wl:main", writable: false, description: "sandbox" },
  ];
}

function makeFrames(): FrameData[] {
  return [
    { frameIndex: 0, lanes: [
      { laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 0 }, changed: false },
      { laneId: "ws:sandbox", worldlineId: "wl:main", coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 0 }, changed: false },
    ], receipts: [] },
    { frameIndex: 1, lanes: [
      { laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 }, changed: true },
      { laneId: "ws:sandbox", worldlineId: "wl:main", coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 0 }, changed: false },
    ], receipts: [{
      receiptId: "r:1", headId: "head:test", frameIndex: 1, laneId: "wl:main", worldlineId: "wl:main",
      inputTick: 0, outputTick: 1, admittedRewriteCount: 1, rejectedRewriteCount: 0, counterfactualCount: 0,
      digest: "d1", summary: "r1"
    }] },
    { frameIndex: 2, lanes: [
      { laneId: "wl:main", worldlineId: "wl:main", coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 }, changed: true },
      { laneId: "ws:sandbox", worldlineId: "wl:main", coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 }, changed: true },
    ], receipts: [{
      receiptId: "r:2", headId: "head:test", frameIndex: 2, laneId: "ws:sandbox", worldlineId: "wl:main",
      inputTick: 0, outputTick: 1, admittedRewriteCount: 1, rejectedRewriteCount: 0, counterfactualCount: 1,
      digest: "d2", summary: "r2"
    }] },
  ];
}

function requireAltSiteId(sites: NeighborhoodSiteCatalog): string {
  const alt = sites.sites[1]?.siteId;
  if (alt === undefined) {
    throw new TypeError("Expected an alternative site");
  }
  return alt;
}

function makeHarness(): {
  frames: FrameData[];
  catalog: LaneRef[];
  displayCatalog: LaneRef[];
  neighborhoodSites: NeighborhoodSiteCatalog;
  currentFrameIndex: number;
  alternativeSiteId: string;
} {
  const catalog = makeCatalog();
  const frames = makeFrames();
  const lastFrame = frames[2];
  const frame: PlaybackFrame = { headId: "head:test", frameIndex: 2, lanes: lastFrame?.lanes ?? [] };
  const core = NeighborhoodCoreSummary.fromFrame(frame, lastFrame?.receipts ?? [], []);
  const sites = NeighborhoodSiteCatalog.fromCore(core);

  return {
    frames, catalog, displayCatalog: core.buildDisplayCatalog(catalog),
    neighborhoodSites: sites, currentFrameIndex: 2, alternativeSiteId: requireAltSiteId(sites)
  };
}

test("siteDrivenWorldlineFocus recomputes lane and cursor from the selected site", () => {
  const h = makeHarness();

  const focus = siteDrivenWorldlineFocus({
    catalog: h.catalog,
    displayCatalog: h.displayCatalog,
    neighborhoodSites: h.neighborhoodSites,
    selectedSiteId: h.alternativeSiteId,
    frames: h.frames,
    currentFrameIndex: h.currentFrameIndex
  });

  assert.equal(focus.selectedLaneId, "ws:sandbox");
  assert.equal(focus.laneCursor, 1);
  assert.equal(focus.cursor, 0);
});

test("siteDrivenWorldlineFocus keeps the primary site on its lane-local tick row when no site is selected", () => {
  const h = makeHarness();

  const focus = siteDrivenWorldlineFocus({
    catalog: h.catalog,
    displayCatalog: h.displayCatalog,
    neighborhoodSites: h.neighborhoodSites,
    selectedSiteId: null,
    frames: h.frames,
    currentFrameIndex: h.currentFrameIndex
  });

  assert.equal(focus.selectedLaneId, "wl:main");
  assert.equal(focus.laneCursor, 0);
  assert.equal(focus.cursor, 0);
});

test("shouldResyncWorldlineFocus returns false when frame index and site selection are unchanged", () => {
  assert.equal(
    shouldResyncWorldlineFocus(
      { frameIndex: 3, selectedSiteId: "site:alpha" },
      { frameIndex: 3, selectedSiteId: "site:alpha" }
    ),
    false,
    "identical frame and site should NOT trigger resync"
  );
});

test("shouldResyncWorldlineFocus returns true when frame index changes", () => {
  assert.equal(
    shouldResyncWorldlineFocus(
      { frameIndex: 3, selectedSiteId: "site:alpha" },
      { frameIndex: 4, selectedSiteId: "site:alpha" }
    ),
    true,
    "frame index change should trigger resync"
  );
});

test("shouldResyncWorldlineFocus returns true when selected site changes", () => {
  assert.equal(
    shouldResyncWorldlineFocus(
      { frameIndex: 3, selectedSiteId: "site:alpha" },
      { frameIndex: 3, selectedSiteId: "site:beta" }
    ),
    true,
    "site selection change should trigger resync"
  );
});

test("shouldResyncWorldlineFocus returns true when previous state is null", () => {
  assert.equal(
    shouldResyncWorldlineFocus(
      null,
      { frameIndex: 0, selectedSiteId: null }
    ),
    true,
    "null previous state should trigger initial sync"
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import {
  NeighborhoodSiteCatalog,
  NeighborhoodSiteSummary
} from "../src/app/NeighborhoodSiteCatalog.ts";

function makeCore(): NeighborhoodCoreSummary {
  return new NeighborhoodCoreSummary({
    siteId: "site:head:test:2:wl:main",
    headId: "head:test",
    frameIndex: 2,
    coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 2 },
    primaryLaneId: "wl:main",
    primaryWorldlineId: "wl:main",
    participatingLaneIds: ["wl:main", "ws:sandbox"],
    outcome: "PENDING",
    alternatives: [{
      alternativeId: "alt:receipt:test:1",
      kind: "COUNTERFACTUAL",
      laneId: "ws:sandbox",
      worldlineId: "wl:main",
      outcome: "PENDING",
      summary: "2 counterfactual(s) on ws:sandbox"
    }],
    summary: "2 lane(s), 1 alternative(s), pending"
  });
}

test("fromCore creates one primary site plus nearby alternatives", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());

  assert.equal(catalog.activeSiteId, "site:head:test:2:wl:main");
  assert.deepEqual(
    catalog.sites.map((site) => site.kind),
    ["PRIMARY", "ALTERNATIVE"]
  );
  const primarySite = catalog.sites[0];
  const alternativeSite = catalog.sites[1];
  assert.ok(primarySite);
  assert.ok(alternativeSite);
  assert.equal(primarySite.label, "wl:main@2");
  assert.equal(primarySite.laneId, "wl:main");
  assert.equal(alternativeSite.laneId, "ws:sandbox");
  assert.equal(alternativeSite.parentSiteId, "site:head:test:2:wl:main");
});

test("normalizeSelection falls back to the active site for stale ids", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());

  assert.equal(catalog.normalizeSelection(null), catalog.activeSiteId);
  assert.equal(catalog.normalizeSelection("missing"), catalog.activeSiteId);
});

test("moveSelection clamps to the catalog boundaries", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());

  const first = catalog.moveSelection(null, -1);
  const second = catalog.moveSelection(first, 1);
  const stillSecond = catalog.moveSelection(second, 1);

  assert.equal(first, catalog.activeSiteId);
  assert.equal(second, catalog.sites[1]?.siteId);
  assert.equal(stillSecond, catalog.sites[1]?.siteId);
});

test("selectedSite returns the normalized active item", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());

  const site = catalog.selectedSite("missing");

  assert.ok(site instanceof NeighborhoodSiteSummary);
  assert.equal(site.siteId, catalog.activeSiteId);
});

test("selectedLaneId returns the lane identity for the chosen site", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());

  assert.equal(catalog.selectedLaneId(null), "wl:main");
  assert.equal(catalog.selectedLaneId(catalog.sites[1]?.siteId ?? null), "ws:sandbox");
});

test("siteIdForLaneId prefers the current matching site and otherwise finds the lane site", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());
  const alternativeSiteId = catalog.sites[1]?.siteId ?? null;

  assert.equal(catalog.siteIdForLaneId("ws:sandbox", null), alternativeSiteId);
  assert.equal(catalog.siteIdForLaneId("ws:sandbox", alternativeSiteId), alternativeSiteId);
  assert.equal(catalog.siteIdForLaneId("missing", alternativeSiteId), catalog.activeSiteId);
});

test("toJSON returns stable plain data", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());
  const json = catalog.toJSON();
  const serialized = JSON.stringify(json);

  assert.equal(json.activeSiteId, catalog.activeSiteId);
  assert.equal(json.sites.length, 2);
  assert.deepEqual(JSON.parse(serialized), json);
});

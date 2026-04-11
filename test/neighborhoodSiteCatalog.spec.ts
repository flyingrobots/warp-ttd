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
  assert.equal(catalog.sites[0]?.label, "wl:main@2");
  assert.equal(catalog.sites[1]?.parentSiteId, "site:head:test:2:wl:main");
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

test("toJSON returns stable plain data", () => {
  const catalog = NeighborhoodSiteCatalog.fromCore(makeCore());
  const json = catalog.toJSON();
  const serialized = JSON.stringify(json);

  assert.equal(json.activeSiteId, catalog.activeSiteId);
  assert.equal(json.sites.length, 2);
  assert.equal(JSON.stringify(JSON.parse(serialized)), serialized);
});

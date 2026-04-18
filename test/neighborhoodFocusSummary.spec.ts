import test from "node:test";
import assert from "node:assert/strict";

import { NeighborhoodCoreSummary } from "../src/app/NeighborhoodCoreSummary.ts";
import { NeighborhoodFocusSummary } from "../src/app/NeighborhoodFocusSummary.ts";
import { NeighborhoodSiteCatalog } from "../src/app/NeighborhoodSiteCatalog.ts";

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

test("fromSelection reflects the primary site when no explicit site is selected", () => {
  const core = makeCore();
  const focus = NeighborhoodFocusSummary.fromSelection(
    core,
    NeighborhoodSiteCatalog.fromCore(core),
    null
  );

  assert.equal(focus.siteId, core.siteId);
  assert.equal(focus.kind, "PRIMARY");
  assert.equal(focus.selectedLaneId, "wl:main");
  assert.equal(focus.selectedWorldlineId, "wl:main");
  assert.equal(focus.parentSiteId, undefined);
  assert.deepEqual(focus.participatingLaneIds, ["wl:main", "ws:sandbox"]);
});

test("fromSelection reflects the selected alternative site and its lane identity", () => {
  const core = makeCore();
  const catalog = NeighborhoodSiteCatalog.fromCore(core);
  const alternative = catalog.sites[1];

  assert.ok(alternative !== undefined);

  const focus = NeighborhoodFocusSummary.fromSelection(core, catalog, alternative.siteId);

  assert.equal(focus.siteId, alternative.siteId);
  assert.equal(focus.kind, "ALTERNATIVE");
  assert.equal(focus.selectedLaneId, "ws:sandbox");
  assert.equal(focus.selectedWorldlineId, "wl:main");
  assert.equal(focus.parentSiteId, core.siteId);
});

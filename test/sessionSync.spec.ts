import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";
import { DebuggerSession } from "../src/app/debuggerSession.ts";
import { siteDrivenWorldlineFocus } from "../src/tui/sessionSync.ts";
import type { FrameData } from "../src/tui/worldlineLayout.ts";

const HEAD_ID = "head:main";

async function createHarness(): Promise<{
  frames: FrameData[];
  catalog: Awaited<ReturnType<EchoFixtureAdapter["laneCatalog"]>>["lanes"];
  currentFrameIndex: number;
  neighborhoodSites: DebuggerSession["snapshot"]["neighborhoodSites"];
  displayCatalog: Awaited<ReturnType<EchoFixtureAdapter["laneCatalog"]>>["lanes"];
  alternativeSiteId: string;
}> {
  const adapter = new EchoFixtureAdapter();
  const session = await DebuggerSession.create(adapter, HEAD_ID);
  await session.seekToFrame(2);
  const laneCatalog = await adapter.laneCatalog();
  const frames: FrameData[] = [];

  for (let index = 0; index <= 2; index += 1) {
    const frame = await adapter.frame(HEAD_ID, index);
    const receipts = await adapter.receipts(HEAD_ID, index);
    frames.push({ frameIndex: frame.frameIndex, lanes: frame.lanes, receipts });
  }

  const alternativeSiteId = session.snapshot.neighborhoodSites.sites[1]?.siteId;
  if (alternativeSiteId === undefined) {
    throw new TypeError("Expected an alternative site in the neighborhood catalog");
  }

  return {
    frames,
    catalog: laneCatalog.lanes,
    currentFrameIndex: session.snapshot.head.currentFrameIndex,
    neighborhoodSites: session.snapshot.neighborhoodSites,
    displayCatalog: session.snapshot.neighborhoodCore.buildDisplayCatalog(laneCatalog.lanes),
    alternativeSiteId
  };
}

test("siteDrivenWorldlineFocus recomputes lane and cursor from the selected site", async () => {
  const harness = await createHarness();

  const focus = siteDrivenWorldlineFocus({
    catalog: harness.catalog,
    displayCatalog: harness.displayCatalog,
    neighborhoodSites: harness.neighborhoodSites,
    selectedSiteId: harness.alternativeSiteId,
    frames: harness.frames,
    currentFrameIndex: harness.currentFrameIndex
  });

  assert.equal(focus.selectedLaneId, "ws:sandbox");
  assert.equal(focus.laneCursor, 1);
  assert.equal(focus.cursor, 0);
});

test("siteDrivenWorldlineFocus keeps the primary site on its lane-local tick row when no site is selected", async () => {
  const harness = await createHarness();

  const focus = siteDrivenWorldlineFocus({
    catalog: harness.catalog,
    displayCatalog: harness.displayCatalog,
    neighborhoodSites: harness.neighborhoodSites,
    selectedSiteId: null,
    frames: harness.frames,
    currentFrameIndex: harness.currentFrameIndex
  });

  assert.equal(focus.selectedLaneId, "wl:main");
  assert.equal(focus.laneCursor, 0);
  assert.equal(focus.cursor, 0);
});

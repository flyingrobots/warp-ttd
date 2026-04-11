import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";
import { DebuggerSession } from "../src/app/debuggerSession.ts";
import {
  laneCursorForLaneId,
  scopeCatalogToNeighborhood
} from "../src/tui/pages/worldlinePage.ts";
import { buildLaneTreeLines } from "../src/tui/worldlineLayout.ts";

const HEAD_ID = "head:main";

test("scopeCatalogToNeighborhood keeps only participating lanes and their ancestors", async () => {
  const adapter = new EchoFixtureAdapter();
  const session = await DebuggerSession.create(adapter, HEAD_ID);
  await session.seekToFrame(2);
  const catalog = await adapter.laneCatalog();

  const scoped = scopeCatalogToNeighborhood(
    catalog.lanes,
    session.snapshot.neighborhoodCore
  );

  assert.deepEqual(
    scoped.map((lane) => lane.id),
    ["wl:main", "ws:sandbox"]
  );
});

test("laneCursorForLaneId follows the scoped lane tree ordering", async () => {
  const adapter = new EchoFixtureAdapter();
  const session = await DebuggerSession.create(adapter, HEAD_ID);
  await session.seekToFrame(2);
  const catalog = await adapter.laneCatalog();

  const scoped = scopeCatalogToNeighborhood(
    catalog.lanes,
    session.snapshot.neighborhoodCore
  );
  const tree = buildLaneTreeLines(scoped);

  assert.deepEqual(tree.map((line) => line.laneId), ["wl:main", "ws:sandbox"]);
  assert.equal(laneCursorForLaneId(scoped, "wl:main"), 0);
  assert.equal(laneCursorForLaneId(scoped, "ws:sandbox"), 1);
});

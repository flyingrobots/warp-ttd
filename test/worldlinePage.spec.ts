import test from "node:test";
import assert from "node:assert/strict";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";
import { DebuggerSession } from "../src/app/debuggerSession.ts";
import { scopeCatalogToNeighborhood } from "../src/tui/pages/worldlinePage.ts";

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

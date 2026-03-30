import test from "node:test";
import assert from "node:assert/strict";

import { resolveAdapter } from "../src/app/adapterRegistry.ts";
import type { AdapterConfig } from "../src/app/adapterRegistry.ts";
import { scenarioLinearHistory } from "./helpers/gitWarpFixture.ts";

test("resolveAdapter returns a git-warp adapter for git-warp config", async () => {
  const fixture = await scenarioLinearHistory();

  try {
    const config: AdapterConfig = {
      kind: "git-warp",
      repoPath: fixture.tempDir,
      graphName: fixture.graphName
    };
    const { adapter, defaultHeadId } = await resolveAdapter(config);

    assert.equal(adapter.adapterName, "git-warp");
    assert.equal(defaultHeadId, "head:default");

    const hello = await adapter.hello();
    assert.equal(hello.hostKind, "git-warp");
  } finally {
    await fixture.cleanup();
  }
});

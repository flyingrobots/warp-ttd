import test from "node:test";
import assert from "node:assert/strict";

import { resolveAdapter } from "../src/app/adapterRegistry.ts";
import type { AdapterConfig } from "../src/app/adapterRegistry.ts";
import { inspectLiveTargetSessions } from "../src/app/liveTargetSessionInspection.ts";
import type { ContinuumDebugTargetDescriptor } from "../src/app/liveTargetInspection.ts";
import { createFixture, scenarioLinearHistory } from "./helpers/gitWarpFixture.ts";
import type { GitWarpFixture } from "./helpers/gitWarpFixture.ts";

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
    assert.equal(hello.hostKind, "GIT_WARP");
  } finally {
    await fixture.cleanup();
  }
});

async function createGraftAstFixture(): Promise<GitWarpFixture> {
  const fixture = await createFixture("graft-live-target", "graft-ast", "alice");
  const patch = await fixture.graph.createPatch();

  await patch
    .addNode("graft:root")
    .setProperty("graft:root", "name", "Graft")
    .commit();
  await fixture.graph.materialize();
  return fixture;
}

test("inspectLiveTargetSessions opens graft through a read-only git-warp session", async () => {
  const fixture = await createGraftAstFixture();

  try {
    const [jeditInspection, inspection] = await inspectLiveTargetSessions({
      jeditRoot: `${fixture.tempDir}/missing-jedit`,
      graftRoot: fixture.tempDir
    });

    assert.ok(jeditInspection !== undefined);
    assert.equal(jeditInspection.target, "jedit");
    assert.equal(jeditInspection.readOnly, true);
    assert.equal(jeditInspection.sessionPosture, "OBSTRUCTED");

    assert.ok(inspection !== undefined);
    assert.equal(inspection.target, "graft");
    assert.equal(inspection.readOnly, true);
    assert.equal(inspection.sessionPosture, "PRESENT");
    assert.equal(inspection.defaultHeadId, "head:default");
    assert.ok(inspection.hostHello !== undefined);
    assert.equal(inspection.hostHello.hostKind, "GIT_WARP");
    assert.ok(inspection.session !== undefined);
    assert.equal(inspection.session.activeHeadId, "head:default");
    assert.equal(inspection.session.snapshot.frame.frameIndex, 0);
    assert.equal(inspection.session.snapshot.frame.lanes[0]?.laneId, "wl:live");
  } finally {
    await fixture.cleanup();
  }
});

test("inspectLiveTargetSessions obstructs git-warp descriptors missing graphName", async () => {
  const descriptors = [
    {
      id: "vendor-git-warp",
      appKind: "live git-warp app",
      connection: {
        mode: "git-warp",
        rootPath: "/missing/vendor-git-warp"
      }
    }
  ] as unknown as readonly ContinuumDebugTargetDescriptor[];

  const [inspection] = await inspectLiveTargetSessions(descriptors);

  assert.ok(inspection !== undefined);
  assert.equal(inspection.target, "vendor-git-warp");
  assert.equal(inspection.connectionMode, "git-warp");
  assert.equal(inspection.hostKind, "GIT_WARP");
  assert.equal(inspection.sessionPosture, "OBSTRUCTED");
  assert.equal("graphName" in inspection, false);
  assert.equal("session" in inspection, false);
  assert.match(inspection.reason, /graphName/);
});

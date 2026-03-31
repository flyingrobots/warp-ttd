/**
 * Test fixture library for git-warp integration tests.
 *
 * Creates temporary git repos with contrived graph scenarios
 * for testing the GitWarpAdapter against known state.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Plumbing from "@git-stunts/plumbing";
import {
  GitGraphAdapter,
  WarpCore,
  WebCryptoAdapter
} from "@git-stunts/git-warp";

type WarpCoreInstance = InstanceType<typeof WarpCore>;

export interface GitWarpFixture {
  /** The WarpCore instance (plumbing surface with materialize + receipts). */
  readonly graph: WarpCoreInstance;
  /** Absolute path to the temporary git repo. */
  readonly tempDir: string;
  /** Graph name used when opening. */
  readonly graphName: string;
  /** Writer ID used when opening. */
  readonly writerId: string;
  /** Tears down the temp directory. Call in afterEach. */
  cleanup(): Promise<void>;
}

/**
 * Creates a temporary git repo and opens a WarpCore graph.
 *
 * @param label  - Prefix for the temp directory name.
 * @param graphName - Name of the graph to create.
 * @param writerId  - Writer identity for patches.
 */
export async function createFixture(
  label = "ttd-test",
  graphName = "test",
  writerId = "alice"
): Promise<GitWarpFixture> {
  const tempDir = await mkdtemp(join(tmpdir(), `warp-${label}-`));

  try {
    const plumbing = Plumbing.createDefault({ cwd: tempDir });
    await plumbing.execute({ args: ["init"] });
    await plumbing.execute({ args: ["config", "user.email", "test@test.com"] });
    await plumbing.execute({ args: ["config", "user.name", "Test"] });

    const persistence = new GitGraphAdapter({ plumbing });
    const crypto = new WebCryptoAdapter();

    // blobStorage is auto-constructed by WarpRuntime when persistence has plumbing.
    const graph = await WarpCore.open({
      persistence,
      graphName,
      writerId,
      crypto
    });

    return {
      graph,
      tempDir,
      graphName,
      writerId,
      async cleanup(): Promise<void> {
        await rm(tempDir, { recursive: true, force: true });
      }
    };
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * Scenario: a simple linear history with two patches.
 *
 * Patch 1 (lamport 1): adds node "user:alice" with name="Alice"
 * Patch 2 (lamport 2): adds node "user:bob", edge alice→bob "follows"
 *
 * Returns the fixture with materialized state.
 */
export async function scenarioLinearHistory(): Promise<GitWarpFixture> {
  const fixture = await createFixture("linear", "social", "alice");
  const { graph } = fixture;

  const p1 = await graph.createPatch();
  await p1
    .addNode("user:alice")
    .setProperty("user:alice", "name", "Alice")
    .commit();

  const p2 = await graph.createPatch();
  await p2
    .addNode("user:bob")
    .setProperty("user:bob", "name", "Bob")
    .addEdge("user:alice", "user:bob", "follows")
    .commit();

  await graph.materialize();
  return fixture;
}

/**
 * Scenario: multi-writer with concurrent patches.
 *
 * Writer "alice" adds user:alice (lamport 1)
 * Writer "bob" adds user:bob (lamport 1) — concurrent with alice's patch
 * Writer "alice" adds edge alice→bob (lamport 2) — after both are visible
 *
 * This creates a scenario where two patches share the same lamport tick,
 * which is important for testing frame indexing.
 */
export async function scenarioMultiWriter(): Promise<
  GitWarpFixture & { bobGraph: WarpCoreInstance }
> {
  const tempDir = await mkdtemp(join(tmpdir(), "warp-multiwriter-"));

  try {
    const plumbing = Plumbing.createDefault({ cwd: tempDir });
    await plumbing.execute({ args: ["init"] });
    await plumbing.execute({ args: ["config", "user.email", "test@test.com"] });
    await plumbing.execute({ args: ["config", "user.name", "Test"] });

    const persistence = new GitGraphAdapter({ plumbing });
    const crypto = new WebCryptoAdapter();

    const aliceGraph = await WarpCore.open({
      persistence,
      graphName: "collab",
      writerId: "alice",
      crypto
    });

    const bobGraph = await WarpCore.open({
      persistence,
      graphName: "collab",
      writerId: "bob",
      crypto
    });

    // Alice writes first
    const pa1 = await aliceGraph.createPatch();
    await pa1
      .addNode("user:alice")
      .setProperty("user:alice", "name", "Alice")
      .commit();

    // Bob writes concurrently (same lamport epoch from bob's perspective)
    const pb1 = await bobGraph.createPatch();
    await pb1
      .addNode("user:bob")
      .setProperty("user:bob", "name", "Bob")
      .commit();

    // Alice discovers bob's patches and writes a follow-up
    await aliceGraph.materialize();
    const pa2 = await aliceGraph.createPatch();
    await pa2
      .addEdge("user:alice", "user:bob", "follows")
      .commit();

    await aliceGraph.materialize();

    return {
      graph: aliceGraph,
      bobGraph,
      tempDir,
      graphName: "collab",
      writerId: "alice",
      async cleanup(): Promise<void> {
        await rm(tempDir, { recursive: true, force: true });
      }
    };
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}

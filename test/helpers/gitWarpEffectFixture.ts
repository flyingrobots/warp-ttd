import { GIT_WARP_EFFECT_NODE_PREFIX } from "../../src/adapters/gitWarpEffectEmissionExtractor.ts";
import { createFixture, type GitWarpFixture } from "./gitWarpFixture.ts";

export async function scenarioEffectHistory(): Promise<
  GitWarpFixture & { effectId: string }
> {
  const fixture = await createFixture("effects", "effects", "alice");
  const { graph } = fixture;
  const effectId = `${GIT_WARP_EFFECT_NODE_PREFIX}alice-history-effect`;

  const p1 = await graph.createPatch();
  await p1
    .addNode(effectId)
    .setProperty(effectId, "kind", "notification")
    .setProperty(effectId, "writer", "alice")
    .setProperty(effectId, "payload", "{\"text\":\"hello\"}")
    .commit();

  const p2 = await graph.createPatch();
  await p2
    .removeNode(effectId)
    .commit();

  await graph.materialize();

  return {
    ...fixture,
    effectId
  };
}

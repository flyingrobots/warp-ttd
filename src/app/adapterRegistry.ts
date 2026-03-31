/**
 * Adapter registry — application-layer seam for resolving adapter configs
 * into ready TtdHostAdapter instances.
 *
 * This is the only module that imports concrete adapter classes and host
 * infrastructure. The TUI and CLI should import only this module (plus
 * the port type) to construct adapters.
 */
import type { TtdHostAdapter } from "../adapter.ts";

export type ScenarioName = "live-with-effects" | "replay-with-suppression" | "multi-writer-conflicts";

export type AdapterKind = "echo-fixture" | "git-warp" | "scenario";

export type AdapterConfig =
  | { kind: "echo-fixture" }
  | { kind: "git-warp"; repoPath: string; graphName: string }
  | { kind: "scenario"; scenario: ScenarioName };

export interface ResolvedAdapter {
  adapter: TtdHostAdapter;
  defaultHeadId: string;
}

export async function resolveAdapter(config: AdapterConfig): Promise<ResolvedAdapter> {
  switch (config.kind) {
    case "echo-fixture": {
      const { EchoFixtureAdapter } = await import("../adapters/echoFixtureAdapter.ts");
      return {
        adapter: new EchoFixtureAdapter(),
        defaultHeadId: "head:main"
      };
    }

    case "git-warp": {
      const { GitWarpAdapter } = await import("../adapters/gitWarpAdapter.ts");
      const { GitGraphAdapter, WarpCore, WebCryptoAdapter } = await import("@git-stunts/git-warp");
      const Plumbing = (await import("@git-stunts/plumbing")).default;

      const plumbing = Plumbing.createDefault({ cwd: config.repoPath });
      const persistence = new GitGraphAdapter({ plumbing });
      const crypto = new WebCryptoAdapter();
      const graph = await WarpCore.open({
        persistence,
        graphName: config.graphName,
        writerId: "ttd-observer",
        crypto
      });

      return {
        adapter: await GitWarpAdapter.create(graph),
        defaultHeadId: "head:default"
      };
    }

    case "scenario": {
      const {
        scenarioLiveWithEffects,
        scenarioReplayWithSuppression,
        scenarioMultiWriterWithConflicts
      } = await import("../../test/helpers/scenarioFixture.ts");

      const scenarios: Record<ScenarioName, () => TtdHostAdapter> = {
        "live-with-effects": scenarioLiveWithEffects,
        "replay-with-suppression": scenarioReplayWithSuppression,
        "multi-writer-conflicts": scenarioMultiWriterWithConflicts
      };

      const factory = scenarios[config.scenario];
      return {
        adapter: factory(),
        defaultHeadId: "head:default"
      };
    }

    default: {
      const exhaustive: never = config;
      throw new Error(`Unknown adapter kind: ${(exhaustive as { kind: string }).kind}`);
    }
  }
}

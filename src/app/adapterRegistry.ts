/**
 * Adapter registry — application-layer seam for resolving adapter configs
 * into ready TtdHostAdapter instances.
 *
 * This is the only module that imports concrete adapter classes and host
 * infrastructure. The TUI and CLI should import only this module (plus
 * the port type) to construct adapters.
 */
import type { TtdHostAdapter } from "../adapter.ts";
import { UnknownAdapterKindError } from "../errors.ts";

export type ScenarioName = "live-with-effects" | "replay-with-suppression" | "multi-writer-conflicts" | "complex-worldline";

export type AdapterKind = "echo-fixture" | "git-warp" | "scenario";

export type AdapterConfig =
  | { kind: "echo-fixture" }
  | { kind: "git-warp"; repoPath: string; graphName: string }
  | { kind: "scenario"; scenario: ScenarioName };

export interface ResolvedAdapter {
  adapter: TtdHostAdapter;
  defaultHeadId: string;
}

async function resolveEchoFixture(): Promise<ResolvedAdapter> {
  const { EchoFixtureAdapter } = await import("../adapters/echoFixtureAdapter.ts");

  return {
    adapter: new EchoFixtureAdapter(),
    defaultHeadId: "head:main"
  };
}

async function resolveGitWarp(
  config: Extract<AdapterConfig, { kind: "git-warp" }>
): Promise<ResolvedAdapter> {
  const { GitWarpAdapter } = await import("../adapters/gitWarpAdapter.ts");
  const { GitGraphAdapter, WarpCore, WebCryptoAdapter } = await import("@git-stunts/git-warp");
  const Plumbing = (await import("@git-stunts/plumbing")).default;
  const plumbing = Plumbing.createDefault({ cwd: config.repoPath });
  const graph = await WarpCore.open({
    persistence: new GitGraphAdapter({ plumbing }),
    graphName: config.graphName,
    writerId: "ttd-observer",
    crypto: new WebCryptoAdapter()
  });

  return {
    adapter: await GitWarpAdapter.create(graph),
    defaultHeadId: "head:default"
  };
}

async function scenarioFactories(): Promise<Partial<Record<string, () => TtdHostAdapter>>> {
  const {
    scenarioLiveWithEffects,
    scenarioReplayWithSuppression,
    scenarioMultiWriterWithConflicts
  } = await import("../adapters/scenarioFixtureAdapter.ts");
  const { scenarioComplexWorldline } = await import("../adapters/scenarioComplex.ts");

  return {
    "live-with-effects": scenarioLiveWithEffects,
    "replay-with-suppression": scenarioReplayWithSuppression,
    "multi-writer-conflicts": scenarioMultiWriterWithConflicts,
    "complex-worldline": scenarioComplexWorldline
  };
}

async function resolveScenario(
  config: Extract<AdapterConfig, { kind: "scenario" }>
): Promise<ResolvedAdapter> {
  const scenarios = await scenarioFactories();
  const factory = scenarios[config.scenario];

  if (factory === undefined) {
    throw new UnknownAdapterKindError(`scenario:${config.scenario}`);
  }

  return {
    adapter: factory(),
    defaultHeadId: "head:default"
  };
}

export async function resolveAdapter(config: AdapterConfig): Promise<ResolvedAdapter> {
  switch (config.kind) {
    case "echo-fixture":
      return resolveEchoFixture();

    case "git-warp":
      return resolveGitWarp(config);

    case "scenario":
      return resolveScenario(config);

    default: {
      const exhaustive: never = config;
      throw new UnknownAdapterKindError((exhaustive as { kind: string }).kind);
    }
  }
}

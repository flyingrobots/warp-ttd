import type { WarpCore } from "@git-stunts/git-warp";
import type { EffectEmissionSummary } from "../protocol.ts";

export const GIT_WARP_EFFECT_NODE_PREFIX = "@warp/effect:";

type GitWarpNodeProps = NonNullable<Awaited<ReturnType<WarpCore["getNodeProps"]>>>;

interface TickOp {
  readonly op: string;
  readonly target: string;
  readonly result: string;
  readonly reason?: string;
}

interface TickReceipt {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly TickOp[];
}

interface IndexedFrame {
  readonly tick: number;
  readonly receipts: TickReceipt[];
}

interface WarpCoreEffectReader<TMaterializedState, TNodeProps extends GitWarpNodeProps> {
  materialize(options?: { receipts?: false; ceiling?: number | null }): Promise<TMaterializedState>;
  getNodeProps(nodeId: string): Promise<TNodeProps | null>;
}

interface EffectNodeCandidate {
  readonly effectNodeId: string;
  readonly receiptWriterId: string;
}

interface ExtractEffectEmissionsArgs<TMaterializedState, TNodeProps extends GitWarpNodeProps> {
  readonly graph: WarpCoreEffectReader<TMaterializedState, TNodeProps>;
  readonly headId: string;
  readonly frameIndex: number;
  readonly indexedFrame: IndexedFrame;
  readonly laneId: string;
  readonly worldlineId: string;
}

function isAppliedEffectNodeAdd(op: TickOp): boolean {
  return op.op === "NodeAdd"
    && op.result === "applied"
    && op.target.startsWith(GIT_WARP_EFFECT_NODE_PREFIX);
}

function collectEffectNodeCandidates(receipts: readonly TickReceipt[]): EffectNodeCandidate[] {
  const seen = new Set<string>();
  const candidates: EffectNodeCandidate[] = [];

  for (const receipt of receipts) {
    for (const op of receipt.ops) {
      if (!isAppliedEffectNodeAdd(op) || seen.has(op.target)) {
        continue;
      }

      seen.add(op.target);
      candidates.push({
        effectNodeId: op.target,
        receiptWriterId: receipt.writer
      });
    }
  }

  return candidates;
}

function readNonEmptyStringProperty(
  props: GitWarpNodeProps | null,
  propertyName: string
): string | null {
  const propertyEntry = props === null
    ? undefined
    : Object.entries(props).find(([key]) => key === propertyName);
  const propertyValue = propertyEntry?.[1];

  return typeof propertyValue === "string" && propertyValue.length > 0
    ? propertyValue
    : null;
}

function readEffectKind(
  props: GitWarpNodeProps | null,
): string | null {
  return readNonEmptyStringProperty(props, "kind");
}

async function buildEffectEmissionSummary<TMaterializedState, TNodeProps extends GitWarpNodeProps>(
  args: ExtractEffectEmissionsArgs<TMaterializedState, TNodeProps>,
  candidate: EffectNodeCandidate
): Promise<EffectEmissionSummary | null> {
  const effectKind = readEffectKind(
    await args.graph.getNodeProps(candidate.effectNodeId),
  );

  if (effectKind === null) {
    return null;
  }

  const { laneId, worldlineId } = args;
  return {
    emissionId: candidate.effectNodeId,
    headId: args.headId,
    frameIndex: args.frameIndex,
    laneId, worldlineId,
    coordinate: { laneId, worldlineId, tick: args.indexedFrame.tick },
    effectKind,
    producerWriter: { writerId: candidate.receiptWriterId, worldlineId },
    summary: `${effectKind} effect node admitted at tick ${args.indexedFrame.tick.toString()}`
  };
}

export async function extractGitWarpEffectEmissions<TMaterializedState, TNodeProps extends GitWarpNodeProps>(
  args: ExtractEffectEmissionsArgs<TMaterializedState, TNodeProps>
): Promise<EffectEmissionSummary[]> {
  const candidates = collectEffectNodeCandidates(args.indexedFrame.receipts);

  if (candidates.length === 0) {
    return [];
  }

  // Re-materialize at the requested ceiling so effect-node props reflect
  // that historical frame rather than the current live frontier.
  await args.graph.materialize({ ceiling: args.indexedFrame.tick });

  const results = await Promise.all(
    candidates.map(async (candidate) => await buildEffectEmissionSummary(args, candidate))
  );

  return results.filter((r): r is EffectEmissionSummary => r !== null);
}

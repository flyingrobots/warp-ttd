import type { EffectEmissionSummary, LaneRef, PlaybackFrame, ReceiptSummary } from "../protocol.ts";
import { requireNonEmpty, uniqueStrings } from "./validate.ts";

export type NeighborhoodOutcome = "LAWFUL" | "OBSTRUCTED" | "PENDING";

export interface NeighborhoodAlternativeSummary {
  alternativeId: string;
  kind: string;
  laneId: string;
  worldlineId: string;
  outcome: NeighborhoodOutcome;
  summary: string;
}

export interface SerializedNeighborhoodCoreSummary {
  siteId: string;
  headId: string;
  frameIndex: number;
  coordinate: {
    laneId: string;
    worldlineId: string;
    tick: number;
  };
  primaryLaneId: string;
  primaryWorldlineId: string;
  participatingLaneIds: string[];
  outcome: NeighborhoodOutcome;
  alternatives: NeighborhoodAlternativeSummary[];
  summary: string;
}

const VALID_OUTCOMES = new Set<NeighborhoodOutcome>(["LAWFUL", "OBSTRUCTED", "PENDING"]);



function sortByCatalogOrder(
  catalog: readonly LaneRef[],
  ids: ReadonlySet<string>
): string[] {
  return catalog.filter((lane) => ids.has(lane.id)).map((lane) => lane.id);
}

function collectAncestorLaneIds(
  catalog: readonly LaneRef[],
  participatingLaneIds: readonly string[]
): Set<string> {
  const ancestors = new Set<string>(participatingLaneIds);
  const laneById = new Map(catalog.map((lane) => [lane.id, lane]));

  for (const laneId of participatingLaneIds) {
    let current = laneById.get(laneId);

    while (current?.parentId !== undefined) {
      ancestors.add(current.parentId);
      current = laneById.get(current.parentId);
    }
  }

  return ancestors;
}

function deriveParticipatingLaneIds(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): string[] {
  const changedLaneIds = frame.lanes.filter((lane) => lane.changed).map((lane) => lane.laneId);
  const receiptLaneIds = receipts.map((receipt) => receipt.laneId);
  const emissionLaneIds = emissions.map((emission) => emission.laneId);
  const candidateLaneIds = uniqueStrings([
    ...changedLaneIds,
    ...receiptLaneIds,
    ...emissionLaneIds
  ]);

  if (candidateLaneIds.length > 0) {
    return candidateLaneIds;
  }

  const primaryLaneId = frame.lanes[0]?.laneId;

  if (primaryLaneId === undefined) {
    return [];
  }

  return [primaryLaneId];
}

function deriveAlternatives(
  receipts: readonly ReceiptSummary[]
): NeighborhoodAlternativeSummary[] {
  return receipts
    .filter((receipt) => receipt.counterfactualCount > 0)
    .map((receipt) => ({
      alternativeId: `alt:${receipt.receiptId}`,
      kind: "COUNTERFACTUAL",
      laneId: receipt.laneId,
      worldlineId: receipt.worldlineId,
      outcome: "PENDING" as const,
      summary: `${receipt.counterfactualCount.toString()} counterfactual(s) on ${receipt.laneId}`
    }));
}

function deriveOutcome(
  receipts: readonly ReceiptSummary[],
  alternatives: readonly NeighborhoodAlternativeSummary[]
): NeighborhoodOutcome {
  if (receipts.some((receipt) => receipt.rejectedRewriteCount > 0)) {
    return "OBSTRUCTED";
  }

  if (alternatives.length > 0) {
    return "PENDING";
  }

  return "LAWFUL";
}

function buildSummary(
  participatingLaneIds: readonly string[],
  outcome: NeighborhoodOutcome,
  alternatives: readonly NeighborhoodAlternativeSummary[]
): string {
  return `${participatingLaneIds.length.toString()} lane(s), ${alternatives.length.toString()} alternative(s), ${outcome.toLowerCase()}`;
}

function normalizeAlternative(
  alternative: NeighborhoodAlternativeSummary
): NeighborhoodAlternativeSummary {
  return {
    ...alternative,
    alternativeId: requireNonEmpty(alternative.alternativeId, "alternatives.alternativeId"),
    kind: requireNonEmpty(alternative.kind, "alternatives.kind"),
    laneId: requireNonEmpty(alternative.laneId, "alternatives.laneId"),
    worldlineId: requireNonEmpty(alternative.worldlineId, "alternatives.worldlineId"),
    summary: requireNonEmpty(alternative.summary, "alternatives.summary")
  };
}

function normalizeArgs(
  args: SerializedNeighborhoodCoreSummary
): SerializedNeighborhoodCoreSummary {
  if (!Number.isInteger(args.frameIndex) || args.frameIndex < 0) {
    throw new TypeError("frameIndex must be a non-negative integer");
  }

  if (!VALID_OUTCOMES.has(args.outcome)) {
    throw new TypeError(`Invalid neighborhood outcome: ${args.outcome}`);
  }

  return {
    ...args,
    siteId: requireNonEmpty(args.siteId, "siteId"),
    headId: requireNonEmpty(args.headId, "headId"),
    primaryLaneId: requireNonEmpty(args.primaryLaneId, "primaryLaneId"),
    primaryWorldlineId: requireNonEmpty(args.primaryWorldlineId, "primaryWorldlineId"),
    coordinate: {
      laneId: requireNonEmpty(args.coordinate.laneId, "coordinate.laneId"),
      worldlineId: requireNonEmpty(args.coordinate.worldlineId, "coordinate.worldlineId"),
      tick: args.coordinate.tick
    },
    participatingLaneIds: uniqueStrings(args.participatingLaneIds),
    alternatives: args.alternatives.map(normalizeAlternative),
    summary: requireNonEmpty(args.summary, "summary")
  };
}

function requirePrimaryLane(frame: PlaybackFrame): PlaybackFrame["lanes"][number] {
  const primaryLane = frame.lanes[0];

  if (primaryLane === undefined) {
    throw new TypeError("Cannot build neighborhood core from a frame with no lanes");
  }

  return primaryLane;
}

function deriveCoreState(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): {
  participatingLaneIds: string[];
  alternatives: NeighborhoodAlternativeSummary[];
  outcome: NeighborhoodOutcome;
} {
  const participatingLaneIds = deriveParticipatingLaneIds(frame, receipts, emissions);
  const alternatives = deriveAlternatives(receipts);
  return {
    participatingLaneIds,
    alternatives,
    outcome: deriveOutcome(receipts, alternatives)
  };
}

function createCoreArgsFromFrame(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): SerializedNeighborhoodCoreSummary {
  const primaryLane = requirePrimaryLane(frame);
  const { participatingLaneIds, alternatives, outcome } = deriveCoreState(
    frame,
    receipts,
    emissions
  );

  return {
    siteId: `site:${frame.headId}:${frame.frameIndex.toString()}:${primaryLane.laneId}`,
    headId: frame.headId,
    frameIndex: frame.frameIndex,
    coordinate: {
      laneId: primaryLane.coordinate.laneId,
      worldlineId: primaryLane.coordinate.worldlineId,
      tick: primaryLane.coordinate.tick
    },
    primaryLaneId: primaryLane.laneId,
    primaryWorldlineId: primaryLane.worldlineId,
    participatingLaneIds,
    outcome,
    alternatives,
    summary: buildSummary(participatingLaneIds, outcome, alternatives)
  };
}

export class NeighborhoodCoreSummary {
  public readonly siteId: string;
  public readonly headId: string;
  public readonly frameIndex: number;
  public readonly coordinate: {
    laneId: string;
    worldlineId: string;
    tick: number;
  };
  public readonly primaryLaneId: string;
  public readonly primaryWorldlineId: string;
  public readonly participatingLaneIds: readonly string[];
  public readonly outcome: NeighborhoodOutcome;
  public readonly alternatives: readonly NeighborhoodAlternativeSummary[];
  public readonly summary: string;

  public constructor(args: SerializedNeighborhoodCoreSummary) {
    const normalized = normalizeArgs(args);

    this.siteId = normalized.siteId;
    this.headId = normalized.headId;
    this.frameIndex = normalized.frameIndex;
    this.coordinate = {
      ...normalized.coordinate
    };
    this.primaryLaneId = normalized.primaryLaneId;
    this.primaryWorldlineId = normalized.primaryWorldlineId;
    this.participatingLaneIds = Object.freeze(normalized.participatingLaneIds);
    this.outcome = normalized.outcome;
    this.alternatives = Object.freeze(
      normalized.alternatives.map((alternative) => Object.freeze({ ...alternative }))
    );
    this.summary = normalized.summary;
    Object.freeze(this.coordinate);
    Object.freeze(this);
  }

  public static fromFrame(
    frame: PlaybackFrame,
    receipts: readonly ReceiptSummary[],
    emissions: readonly EffectEmissionSummary[]
  ): NeighborhoodCoreSummary {
    return new NeighborhoodCoreSummary(
      createCoreArgsFromFrame(frame, receipts, emissions)
    );
  }

  public buildDisplayCatalog(catalog: readonly LaneRef[]): LaneRef[] {
    const displayLaneIds = collectAncestorLaneIds(catalog, this.participatingLaneIds);
    const orderedIds = sortByCatalogOrder(catalog, displayLaneIds);
    const displaySet = new Set(orderedIds);
    return catalog.filter((lane) => displaySet.has(lane.id));
  }

  public toJSON(): SerializedNeighborhoodCoreSummary {
    return {
      siteId: this.siteId,
      headId: this.headId,
      frameIndex: this.frameIndex,
      coordinate: { ...this.coordinate },
      primaryLaneId: this.primaryLaneId,
      primaryWorldlineId: this.primaryWorldlineId,
      participatingLaneIds: [...this.participatingLaneIds],
      outcome: this.outcome,
      alternatives: this.alternatives.map((alternative) => ({ ...alternative })),
      summary: this.summary
    };
  }
}

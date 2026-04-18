import type { PlaybackFrame, ReceiptSummary } from "../protocol.ts";
import type { NeighborhoodCoreSummary } from "./NeighborhoodCoreSummary.ts";
import { requireNonEmpty } from "./validate.ts";

export type ObligationStatus = "SATISFIED" | "VIOLATED" | "UNKNOWN";

export interface SerializedSeamAnchorSummary {
  anchorId: string;
  kind: string;
  laneId?: string;
  worldlineId?: string;
  summary: string;
}

export interface SerializedCompatibilityObligationSummary {
  obligationId: string;
  kind: string;
  status: ObligationStatus;
  summary: string;
}

export interface SerializedCompatibilityEvidenceSummary {
  evidenceId: string;
  obligationId?: string;
  visibility: string;
  summary: string;
}

export interface SerializedReintegrationDetailSummary {
  siteId: string;
  anchors: SerializedSeamAnchorSummary[];
  obligations: SerializedCompatibilityObligationSummary[];
  evidence: SerializedCompatibilityEvidenceSummary[];
  summary: string;
}

const VALID_STATUSES = new Set<ObligationStatus>(["SATISFIED", "VIOLATED", "UNKNOWN"]);

function validateStatus(status: ObligationStatus): ObligationStatus {
  if (!VALID_STATUSES.has(status)) {
    throw new TypeError(`Invalid obligation status: ${status}`);
  }

  return status;
}

export class SeamAnchorSummary {
  public readonly anchorId: string;
  public readonly kind: string;
  public readonly laneId: string | undefined;
  public readonly worldlineId: string | undefined;
  public readonly summary: string;

  public constructor(args: SerializedSeamAnchorSummary) {
    this.anchorId = requireNonEmpty(args.anchorId, "anchorId");
    this.kind = requireNonEmpty(args.kind, "kind");
    this.laneId = args.laneId;
    this.worldlineId = args.worldlineId;
    this.summary = requireNonEmpty(args.summary, "summary");
    Object.freeze(this);
  }

  public toJSON(): SerializedSeamAnchorSummary {
    const json: SerializedSeamAnchorSummary = {
      anchorId: this.anchorId,
      kind: this.kind,
      summary: this.summary
    };

    if (this.laneId !== undefined) {
      json.laneId = this.laneId;
    }

    if (this.worldlineId !== undefined) {
      json.worldlineId = this.worldlineId;
    }

    return json;
  }
}

export class CompatibilityObligationSummary {
  public readonly obligationId: string;
  public readonly kind: string;
  public readonly status: ObligationStatus;
  public readonly summary: string;

  public constructor(args: SerializedCompatibilityObligationSummary) {
    this.obligationId = requireNonEmpty(args.obligationId, "obligationId");
    this.kind = requireNonEmpty(args.kind, "kind");
    this.status = validateStatus(args.status);
    this.summary = requireNonEmpty(args.summary, "summary");
    Object.freeze(this);
  }

  public toJSON(): SerializedCompatibilityObligationSummary {
    return {
      obligationId: this.obligationId,
      kind: this.kind,
      status: this.status,
      summary: this.summary
    };
  }
}

export class CompatibilityEvidenceSummary {
  public readonly evidenceId: string;
  public readonly obligationId: string | undefined;
  public readonly visibility: string;
  public readonly summary: string;

  public constructor(args: SerializedCompatibilityEvidenceSummary) {
    this.evidenceId = requireNonEmpty(args.evidenceId, "evidenceId");
    this.obligationId = args.obligationId;
    this.visibility = requireNonEmpty(args.visibility, "visibility");
    this.summary = requireNonEmpty(args.summary, "summary");
    Object.freeze(this);
  }

  public toJSON(): SerializedCompatibilityEvidenceSummary {
    const json: SerializedCompatibilityEvidenceSummary = {
      evidenceId: this.evidenceId,
      visibility: this.visibility,
      summary: this.summary
    };

    if (this.obligationId !== undefined) {
      json.obligationId = this.obligationId;
    }

    return json;
  }
}

function buildAnchors(
  frame: PlaybackFrame,
  neighborhoodCore: NeighborhoodCoreSummary
): SerializedSeamAnchorSummary[] {
  const anchors: SerializedSeamAnchorSummary[] = [];
  const primaryLane = frame.lanes.find((lane) => lane.laneId === neighborhoodCore.primaryLaneId);

  if (primaryLane !== undefined) {
    anchors.push({
      anchorId: `anchor:${primaryLane.laneId}:primary`,
      kind: "PRIMARY_LANE",
      laneId: primaryLane.laneId,
      worldlineId: primaryLane.worldlineId,
      summary: `Primary lane ${primaryLane.laneId} on ${primaryLane.worldlineId}`
    });
  }

  for (const lane of participatingLanes(frame, neighborhoodCore).filter((l) => l.laneId !== neighborhoodCore.primaryLaneId)) {
    anchors.push({
      anchorId: `anchor:${lane.laneId}:participant`,
      kind: "PARTICIPATING_LANE",
      laneId: lane.laneId,
      worldlineId: lane.worldlineId,
      summary: `Participating lane ${lane.laneId}`
    });
  }

  return anchors;
}

function participatingLanes(
  frame: PlaybackFrame,
  neighborhoodCore: NeighborhoodCoreSummary
): PlaybackFrame["lanes"] {
  return frame.lanes.filter((lane) =>
    neighborhoodCore.participatingLaneIds.includes(lane.laneId)
  );
}

function obligationStatus(receipt: ReceiptSummary): ObligationStatus {
  if (receipt.rejectedRewriteCount > 0) {
    return "VIOLATED";
  }

  return "SATISFIED";
}

function buildAdmissionObligation(
  receipt: ReceiptSummary
): SerializedCompatibilityObligationSummary {
  const status = obligationStatus(receipt);
  return {
    obligationId: `obligation:${receipt.receiptId}:admission`,
    kind: "REWRITE_ADMISSION",
    status,
    summary: `${receipt.laneId} rewrite admission ${status.toLowerCase()}`
  };
}

function buildCounterfactualObligation(
  receipt: ReceiptSummary
): SerializedCompatibilityObligationSummary | null {
  if (receipt.counterfactualCount === 0) {
    return null;
  }

  return {
    obligationId: `obligation:${receipt.receiptId}:counterfactual`,
    kind: "COUNTERFACTUAL_REVIEW",
    status: "UNKNOWN",
    summary: `${receipt.counterfactualCount.toString()} counterfactual(s) remain for ${receipt.laneId}`
  };
}

function buildObligations(
  receipts: readonly ReceiptSummary[]
): SerializedCompatibilityObligationSummary[] {
  const obligations: SerializedCompatibilityObligationSummary[] = [];

  for (const receipt of receipts) {
    obligations.push(buildAdmissionObligation(receipt));
    const counterfactual = buildCounterfactualObligation(receipt);

    if (counterfactual !== null) {
      obligations.push(counterfactual);
    }
  }

  return obligations;
}

function buildEvidence(
  receipts: readonly ReceiptSummary[]
): SerializedCompatibilityEvidenceSummary[] {
  return receipts.map((receipt) => ({
    evidenceId: `evidence:${receipt.receiptId}`,
    obligationId: `obligation:${receipt.receiptId}:admission`,
    visibility: "RECEIPT_DIGEST",
    summary: `${receipt.receiptId} (${receipt.digest})`
  }));
}

function buildSummary(
  anchors: readonly SerializedSeamAnchorSummary[],
  obligations: readonly SerializedCompatibilityObligationSummary[],
  evidence: readonly SerializedCompatibilityEvidenceSummary[]
): string {
  return `${anchors.length.toString()} anchor(s), ${obligations.length.toString()} obligation(s), ${evidence.length.toString()} evidence handle(s)`;
}

export class ReintegrationDetailSummary {
  public readonly siteId: string;
  public readonly anchors: readonly SeamAnchorSummary[];
  public readonly obligations: readonly CompatibilityObligationSummary[];
  public readonly evidence: readonly CompatibilityEvidenceSummary[];
  public readonly summary: string;

  public constructor(args: SerializedReintegrationDetailSummary) {
    this.siteId = requireNonEmpty(args.siteId, "siteId");
    this.anchors = Object.freeze(args.anchors.map((anchor) => new SeamAnchorSummary(anchor)));
    this.obligations = Object.freeze(
      args.obligations.map((obligation) => new CompatibilityObligationSummary(obligation))
    );
    this.evidence = Object.freeze(
      args.evidence.map((entry) => new CompatibilityEvidenceSummary(entry))
    );
    this.summary = requireNonEmpty(args.summary, "summary");
    Object.freeze(this);
  }

  public static fromSnapshot(
    frame: PlaybackFrame,
    neighborhoodCore: NeighborhoodCoreSummary,
    receipts: readonly ReceiptSummary[]
  ): ReintegrationDetailSummary {
    const anchors = buildAnchors(frame, neighborhoodCore);
    const obligations = buildObligations(receipts);
    const evidence = buildEvidence(receipts);

    return new ReintegrationDetailSummary({
      siteId: neighborhoodCore.siteId,
      anchors,
      obligations,
      evidence,
      summary: buildSummary(anchors, obligations, evidence)
    });
  }

  public toJSON(): SerializedReintegrationDetailSummary {
    return {
      siteId: this.siteId,
      anchors: this.anchors.map((anchor) => anchor.toJSON()),
      obligations: this.obligations.map((obligation) => obligation.toJSON()),
      evidence: this.evidence.map((entry) => entry.toJSON()),
      summary: this.summary
    };
  }
}

import type { ReceiptSummary } from "../protocol.ts";
import type { NeighborhoodCoreSummary } from "./NeighborhoodCoreSummary.ts";

export interface SerializedReceiptShellSummary {
  siteId: string;
  receiptIds: string[];
  candidateCount: number;
  rejectedCount: number;
  hasBlockingRelation: boolean;
  summary: string;
}

function requireNonEmpty(value: string, field: string): string {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }

  return value;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function buildSummary(
  candidateCount: number,
  rejectedCount: number,
  hasBlockingRelation: boolean
): string {
  const blocking = hasBlockingRelation ? "blocking" : "non-blocking";
  return `${candidateCount.toString()} candidate(s), ${rejectedCount.toString()} rejected, ${blocking}`;
}

export class ReceiptShellSummary {
  public readonly siteId: string;
  public readonly receiptIds: readonly string[];
  public readonly candidateCount: number;
  public readonly rejectedCount: number;
  public readonly hasBlockingRelation: boolean;
  public readonly summary: string;

  public constructor(args: SerializedReceiptShellSummary) {
    this.siteId = requireNonEmpty(args.siteId, "siteId");
    this.receiptIds = Object.freeze([...new Set(args.receiptIds)]);
    this.candidateCount = args.candidateCount;
    this.rejectedCount = args.rejectedCount;
    this.hasBlockingRelation = args.hasBlockingRelation;
    this.summary = requireNonEmpty(args.summary, "summary");
    Object.freeze(this);
  }

  public static fromReceipts(
    neighborhoodCore: NeighborhoodCoreSummary,
    receipts: readonly ReceiptSummary[]
  ): ReceiptShellSummary {
    const receiptIds = receipts.map((receipt) => receipt.receiptId);
    const candidateCount = sum(
      receipts.map((receipt) =>
        receipt.admittedRewriteCount + receipt.rejectedRewriteCount + receipt.counterfactualCount
      )
    );
    const rejectedCount = sum(receipts.map((receipt) => receipt.rejectedRewriteCount));
    const hasBlockingRelation = rejectedCount > 0 || receipts.some((receipt) => receipt.counterfactualCount > 0);

    return new ReceiptShellSummary({
      siteId: neighborhoodCore.siteId,
      receiptIds,
      candidateCount,
      rejectedCount,
      hasBlockingRelation,
      summary: buildSummary(candidateCount, rejectedCount, hasBlockingRelation)
    });
  }

  public toJSON(): SerializedReceiptShellSummary {
    return {
      siteId: this.siteId,
      receiptIds: [...this.receiptIds],
      candidateCount: this.candidateCount,
      rejectedCount: this.rejectedCount,
      hasBlockingRelation: this.hasBlockingRelation,
      summary: this.summary
    };
  }
}

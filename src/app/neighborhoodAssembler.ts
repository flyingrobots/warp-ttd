/**
 * Neighborhood read-model assembler.
 *
 * Pure function that derives all neighborhood state from protocol data.
 * Extracted from DebuggerSession to maintain SRP: the session manages
 * investigation lifecycle, the assembler projects display state.
 */
import { NeighborhoodCoreSummary } from "./NeighborhoodCoreSummary.ts";
import { NeighborhoodSiteCatalog } from "./NeighborhoodSiteCatalog.ts";
import { ReintegrationDetailSummary } from "./ReintegrationDetailSummary.ts";
import { ReceiptShellSummary } from "./ReceiptShellSummary.ts";
import type {
  EffectEmissionSummary,
  PlaybackFrame,
  ReceiptSummary
} from "../protocol.ts";

export interface NeighborhoodState {
  neighborhoodCore: NeighborhoodCoreSummary;
  neighborhoodSites: NeighborhoodSiteCatalog;
  reintegrationDetail: ReintegrationDetailSummary;
  receiptShell: ReceiptShellSummary;
}

export function buildNeighborhoodState(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): NeighborhoodState {
  const neighborhoodCore = NeighborhoodCoreSummary.fromFrame(frame, receipts, emissions);

  return {
    neighborhoodCore,
    neighborhoodSites: NeighborhoodSiteCatalog.fromCore(neighborhoodCore),
    reintegrationDetail: ReintegrationDetailSummary.fromSnapshot(
      frame,
      neighborhoodCore,
      receipts
    ),
    receiptShell: ReceiptShellSummary.fromReceipts(neighborhoodCore, receipts)
  };
}

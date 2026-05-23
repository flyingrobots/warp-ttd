/**
 * Neighborhood read-model assembler.
 *
 * Pure function that derives all neighborhood state from protocol data.
 * Extracted from DebuggerSession to maintain SRP: the session manages
 * investigation lifecycle, the assembler projects display state.
 */
import {
  NeighborhoodCoreSummary,
} from "./NeighborhoodCoreSummary.ts";
import { NeighborhoodSiteCatalog } from "./NeighborhoodSiteCatalog.ts";
import {
  ReintegrationDetailSummary,
} from "./ReintegrationDetailSummary.ts";
import {
  ReceiptShellSummary,
} from "./ReceiptShellSummary.ts";
import {
  hydrateNeighborhoodCoreSummary,
  hydrateReceiptShellSummary,
  hydrateReintegrationDetailSummary
} from "./sharedFamilyHydration.ts";
import {
  localFallbackSessionFamilyFact,
  obstructedSessionFamilyFact,
  sessionFamilyPayload,
  sessionFamilyTarget,
  type SessionFamilyFact,
  type SessionFamilyFactKey
} from "./sessionFamilyFacts.ts";
import type { JsonObject } from "./generatedFamilyIngress.ts";
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
  sessionFamilyFacts: readonly SessionFamilyFact[];
}

export interface BuildNeighborhoodStateArgs {
  readonly frame: PlaybackFrame;
  readonly receipts: readonly ReceiptSummary[];
  readonly emissions: readonly EffectEmissionSummary[];
  readonly hostFacts?: readonly SessionFamilyFact[];
}

interface MaterializedSummary<TSummary> {
  readonly value: TSummary;
  readonly fact: SessionFamilyFact;
}

interface MaterializedNeighborhoodSummaries {
  readonly core: MaterializedSummary<NeighborhoodCoreSummary>;
  readonly detail: MaterializedSummary<ReintegrationDetailSummary>;
  readonly shell: MaterializedSummary<ReceiptShellSummary>;
}

interface MaterializeSummaryArgs<TSummary> {
  readonly field: SessionFamilyFactKey;
  readonly hostFacts: readonly SessionFamilyFact[];
  readonly hydrate: (payload: JsonObject) => TSummary;
  readonly localFactory: () => TSummary;
  readonly serialize: (summary: TSummary) => JsonObject;
  readonly target: string;
}

function isPayloadObject(payload: JsonObject[keyof JsonObject] | undefined): payload is JsonObject {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

function isHostPublishedFact(
  fact: SessionFamilyFact,
  field: SessionFamilyFactKey,
  target: string
): fact is SessionFamilyFact & { readonly posture: "PRESENT"; readonly payload: JsonObject } {
  if (fact.field !== field || fact.posture !== "PRESENT") return false;
  if (fact.target !== target) return false;
  if (fact.origin !== "HOST_PUBLISHED") return false;
  return isPayloadObject(fact.payload);
}

function findHostPublishedFact(
  field: SessionFamilyFactKey,
  facts: readonly SessionFamilyFact[],
  target: string
): (SessionFamilyFact & { readonly posture: "PRESENT"; readonly payload: JsonObject }) | undefined {
  return facts.find((fact) => isHostPublishedFact(fact, field, target));
}

function hostHydrationFailureReason(
  field: SessionFamilyFactKey,
  error: Error | undefined
): string {
  const detail = error !== undefined && error.message.length > 0
    ? `: ${error.message}`
    : "";

  return `Host-published ${field} payload failed hydration; using local fallback${detail}`;
}

function materializeLocalSummary<TSummary>(
  args: MaterializeSummaryArgs<TSummary>
): MaterializedSummary<TSummary> {
  const local = args.localFactory();

  return {
    value: local,
    fact: localFallbackSessionFamilyFact({
      field: args.field,
      target: args.target,
      payload: args.serialize(local)
    })
  };
}

function materializeObstructedHostSummary<TSummary>(
  args: MaterializeSummaryArgs<TSummary>,
  error: Error | undefined
): MaterializedSummary<TSummary> {
  const local = args.localFactory();

  return {
    value: local,
    fact: obstructedSessionFamilyFact({
      field: args.field,
      target: args.target,
      reason: hostHydrationFailureReason(args.field, error)
    })
  };
}

function materializeSummary<TSummary>(
  args: MaterializeSummaryArgs<TSummary>
): MaterializedSummary<TSummary> {
  const hostFact = findHostPublishedFact(args.field, args.hostFacts, args.target);

  if (hostFact !== undefined) {
    try {
      return { value: args.hydrate(hostFact.payload), fact: hostFact };
    } catch (error) {
      return materializeObstructedHostSummary(
        args,
        error instanceof Error ? error : undefined
      );
    }
  }

  return materializeLocalSummary(args);
}

function localNeighborhoodCore(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): NeighborhoodCoreSummary {
  return NeighborhoodCoreSummary.fromFrame(frame, receipts, emissions);
}

function materializeCore(
  args: BuildNeighborhoodStateArgs,
  target: string
): MaterializedSummary<NeighborhoodCoreSummary> {
  return materializeSummary({
    field: "neighborhoodCore",
    hostFacts: args.hostFacts ?? [],
    hydrate: hydrateNeighborhoodCoreSummary,
    localFactory: () => localNeighborhoodCore(args.frame, args.receipts, args.emissions),
    serialize: (summary) => sessionFamilyPayload(summary.toJSON()),
    target
  });
}

function materializeDetail(
  args: BuildNeighborhoodStateArgs,
  core: NeighborhoodCoreSummary,
  target: string
): MaterializedSummary<ReintegrationDetailSummary> {
  return materializeSummary({
    field: "reintegrationDetail",
    hostFacts: args.hostFacts ?? [],
    hydrate: hydrateReintegrationDetailSummary,
    localFactory: () => ReintegrationDetailSummary.fromSnapshot(args.frame, core, args.receipts),
    serialize: (summary) => sessionFamilyPayload(summary.toJSON()),
    target
  });
}

function materializeShell(
  args: BuildNeighborhoodStateArgs,
  core: NeighborhoodCoreSummary,
  target: string
): MaterializedSummary<ReceiptShellSummary> {
  return materializeSummary({
    field: "receiptShell",
    hostFacts: args.hostFacts ?? [],
    hydrate: hydrateReceiptShellSummary,
    localFactory: () => ReceiptShellSummary.fromReceipts(core, args.receipts),
    serialize: (summary) => sessionFamilyPayload(summary.toJSON()),
    target
  });
}

function materializeNeighborhoodSummaries(
  args: BuildNeighborhoodStateArgs
): MaterializedNeighborhoodSummaries {
  const target = sessionFamilyTarget(args.frame.headId, args.frame.frameIndex);
  const core = materializeCore(args, target);

  return {
    core,
    detail: materializeDetail(args, core.value, target),
    shell: materializeShell(args, core.value, target)
  };
}

export function buildNeighborhoodState(args: BuildNeighborhoodStateArgs): NeighborhoodState {
  const summaries = materializeNeighborhoodSummaries(args);

  return {
    neighborhoodCore: summaries.core.value,
    neighborhoodSites: NeighborhoodSiteCatalog.fromCore(summaries.core.value),
    reintegrationDetail: summaries.detail.value,
    receiptShell: summaries.shell.value,
    sessionFamilyFacts: [
      summaries.core.fact,
      summaries.detail.fact,
      summaries.shell.fact
    ]
  };
}

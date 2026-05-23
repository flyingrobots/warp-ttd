/**
 * Neighborhood read-model assembler.
 *
 * Pure function that derives all neighborhood state from protocol data.
 * Extracted from DebuggerSession to maintain SRP: the session manages
 * investigation lifecycle, the assembler projects display state.
 */
import {
  NeighborhoodCoreSummary,
  type SerializedNeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";
import { NeighborhoodSiteCatalog } from "./NeighborhoodSiteCatalog.ts";
import {
  ReintegrationDetailSummary,
  type SerializedReintegrationDetailSummary
} from "./ReintegrationDetailSummary.ts";
import {
  ReceiptShellSummary,
  type SerializedReceiptShellSummary
} from "./ReceiptShellSummary.ts";
import {
  localFallbackSessionFamilyFact,
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
  readonly local: TSummary;
  readonly serialize: (summary: TSummary) => JsonObject;
  readonly target: string;
}

function isPayloadObject(payload: JsonObject[keyof JsonObject] | undefined): payload is JsonObject {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

function isHostPublishedFact(
  fact: SessionFamilyFact,
  field: SessionFamilyFactKey
): fact is SessionFamilyFact & { readonly posture: "PRESENT"; readonly payload: JsonObject } {
  if (fact.field !== field || fact.posture !== "PRESENT") return false;
  if (fact.origin !== "HOST_PUBLISHED") return false;
  return isPayloadObject(fact.payload);
}

function findHostPublishedFact(
  field: SessionFamilyFactKey,
  facts: readonly SessionFamilyFact[]
): (SessionFamilyFact & { readonly posture: "PRESENT"; readonly payload: JsonObject }) | undefined {
  return facts.find((fact) => isHostPublishedFact(fact, field));
}

function materializeSummary<TSummary>(
  args: MaterializeSummaryArgs<TSummary>
): MaterializedSummary<TSummary> {
  const hostFact = findHostPublishedFact(args.field, args.hostFacts);

  if (hostFact !== undefined) {
    return { value: args.hydrate(hostFact.payload), fact: hostFact };
  }

  return {
    value: args.local,
    fact: localFallbackSessionFamilyFact({
      field: args.field,
      target: args.target,
      payload: args.serialize(args.local)
    })
  };
}

function hydrateNeighborhoodCore(payload: JsonObject): NeighborhoodCoreSummary {
  return new NeighborhoodCoreSummary(payload as object as SerializedNeighborhoodCoreSummary);
}

function hydrateReintegrationDetail(payload: JsonObject): ReintegrationDetailSummary {
  return new ReintegrationDetailSummary(payload as object as SerializedReintegrationDetailSummary);
}

function hydrateReceiptShell(payload: JsonObject): ReceiptShellSummary {
  return new ReceiptShellSummary(payload as object as SerializedReceiptShellSummary);
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
    hydrate: hydrateNeighborhoodCore,
    local: localNeighborhoodCore(args.frame, args.receipts, args.emissions),
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
    hydrate: hydrateReintegrationDetail,
    local: ReintegrationDetailSummary.fromSnapshot(args.frame, core, args.receipts),
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
    hydrate: hydrateReceiptShell,
    local: ReceiptShellSummary.fromReceipts(core, args.receipts),
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

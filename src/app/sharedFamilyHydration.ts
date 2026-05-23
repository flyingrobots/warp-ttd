import {
  NeighborhoodCoreSummary,
  type SerializedNeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";
import {
  ReceiptShellSummary,
  type SerializedReceiptShellSummary
} from "./ReceiptShellSummary.ts";
import {
  ReintegrationDetailSummary,
  type SerializedReintegrationDetailSummary
} from "./ReintegrationDetailSummary.ts";
import type { GeneratedFamilyRef, JsonObject } from "./generatedFamilyIngress.ts";
import type { SessionFamilyFactKey } from "./sessionFamilyFacts.ts";

export const SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION =
  "warp-ttd.shared-family-consumption.v1";

export type SharedFamilyConsumerPosture =
  | "GENERATED_FAMILY_UNAVAILABLE"
  | "LOCAL_MIRROR_FALLBACK";

export interface SharedFamilyConsumptionInspection extends JsonObject {
  schemaVersion: typeof SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION;
  consumerPosture: SharedFamilyConsumerPosture;
  generatedFamily: "continuum";
  fallback: "local-debugger-mirror";
  reason: string;
}

const SESSION_FAMILY_SOURCES: Record<SessionFamilyFactKey, GeneratedFamilyRef> = {
  neighborhoodCore: { family: "continuum", artifact: "NeighborhoodCoreSummary" },
  receiptShell: { family: "continuum", artifact: "ReceiptShellSummary" },
  reintegrationDetail: {
    family: "continuum",
    artifact: "ReintegrationDetailSummary"
  }
};

export function sharedFamilySourceFor(
  field: SessionFamilyFactKey
): GeneratedFamilyRef {
  return SESSION_FAMILY_SOURCES[field];
}

export function inspectSharedFamilyConsumption(): SharedFamilyConsumptionInspection {
  return {
    schemaVersion: SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION,
    consumerPosture: "LOCAL_MIRROR_FALLBACK",
    generatedFamily: "continuum",
    fallback: "local-debugger-mirror",
    reason:
      "Generated Continuum proof-family artifacts are not checked into WARP TTD yet; host-published payloads hydrate through the explicit local mirror boundary."
  };
}

export function hydrateNeighborhoodCoreSummary(
  payload: JsonObject
): NeighborhoodCoreSummary {
  return new NeighborhoodCoreSummary(payload as object as SerializedNeighborhoodCoreSummary);
}

export function hydrateReintegrationDetailSummary(
  payload: JsonObject
): ReintegrationDetailSummary {
  return new ReintegrationDetailSummary(payload as object as SerializedReintegrationDetailSummary);
}

export function hydrateReceiptShellSummary(
  payload: JsonObject
): ReceiptShellSummary {
  return new ReceiptShellSummary(payload as object as SerializedReceiptShellSummary);
}

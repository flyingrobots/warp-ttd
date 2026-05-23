import {
  absentGeneratedFamilyFact,
  obstructedGeneratedFamilyFact,
  presentGeneratedFamilyFact,
  type GeneratedFamilyFact,
  type JsonObject
} from "./generatedFamilyIngress.ts";
import { sharedFamilySourceFor } from "./sharedFamilyHydration.ts";
import type { SerializedNeighborhoodCoreSummary } from "./NeighborhoodCoreSummary.ts";
import type { SerializedReceiptShellSummary } from "./ReceiptShellSummary.ts";
import type { SerializedReintegrationDetailSummary } from "./ReintegrationDetailSummary.ts";

export const SESSION_FAMILY_FACT_KEYS = [
  "neighborhoodCore",
  "reintegrationDetail",
  "receiptShell"
] as const;

export type SessionFamilyFactKey = typeof SESSION_FAMILY_FACT_KEYS[number];

export type SessionFamilyPayload =
  | SerializedNeighborhoodCoreSummary
  | SerializedReintegrationDetailSummary
  | SerializedReceiptShellSummary;

export type SessionFamilyFact = GeneratedFamilyFact & {
  readonly field: SessionFamilyFactKey;
};

interface PresentSessionFamilyFactArgs {
  readonly field: SessionFamilyFactKey;
  readonly payload: JsonObject;
  readonly target: string;
}

export interface NonPresentSessionFamilyFactArgs {
  readonly field: SessionFamilyFactKey;
  readonly reason: string;
  readonly target: string;
}

export function sessionFamilyPayload(payload: SessionFamilyPayload): JsonObject {
  return payload as object as JsonObject;
}

export function sessionFamilyTarget(headId: string, frameIndex: number): string {
  return `${headId}@frame:${frameIndex.toString()}`;
}

function withField(
  field: SessionFamilyFactKey,
  fact: GeneratedFamilyFact
): SessionFamilyFact {
  return { field, ...fact };
}

export function hostPublishedSessionFamilyFact(
  args: PresentSessionFamilyFactArgs
): SessionFamilyFact {
  return withField(args.field, presentGeneratedFamilyFact({
    source: sharedFamilySourceFor(args.field),
    origin: "HOST_PUBLISHED",
    scope: "COORDINATE",
    target: args.target,
    payload: args.payload
  }));
}

export function localFallbackSessionFamilyFact(
  args: PresentSessionFamilyFactArgs
): SessionFamilyFact {
  return withField(args.field, presentGeneratedFamilyFact({
    source: sharedFamilySourceFor(args.field),
    origin: "LOCAL_FALLBACK",
    scope: "COORDINATE",
    target: args.target,
    payload: args.payload
  }));
}

export function absentSessionFamilyFact(
  args: NonPresentSessionFamilyFactArgs
): SessionFamilyFact {
  return withField(args.field, absentGeneratedFamilyFact({
    source: sharedFamilySourceFor(args.field),
    origin: "UNAVAILABLE",
    scope: "COORDINATE",
    target: args.target,
    reason: args.reason
  }));
}

export function obstructedSessionFamilyFact(
  args: NonPresentSessionFamilyFactArgs
): SessionFamilyFact {
  return withField(args.field, obstructedGeneratedFamilyFact({
    source: sharedFamilySourceFor(args.field),
    origin: "HOST_PUBLISHED",
    scope: "COORDINATE",
    target: args.target,
    reason: args.reason
  }));
}

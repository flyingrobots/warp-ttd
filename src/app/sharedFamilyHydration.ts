import fs from "node:fs";
import path from "node:path";

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
  | "GENERATED_FAMILY_PRESENT"
  | "GENERATED_FAMILY_UNAVAILABLE"
  | "LOCAL_MIRROR_FALLBACK";
export type SharedFamilyArtifactPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";
export type SharedFamilyGeneratedArtifactTarget = "echo-inspect";

export interface SharedFamilyGeneratedArtifactDescriptor extends JsonObject {
  family: "continuum";
  target: SharedFamilyGeneratedArtifactTarget;
  schemaVersion?: string;
  artifactRoot: string;
  requiredFiles: readonly string[];
}

export interface SharedFamilyGeneratedArtifactInspection extends JsonObject {
  family: "continuum";
  target: SharedFamilyGeneratedArtifactTarget;
  artifactPosture: Exclude<SharedFamilyArtifactPosture, "ABSENT">;
  schemaVersion?: string;
  artifactRoot: string;
  requiredFiles: readonly string[];
  presentFiles: readonly string[];
  missingFiles: readonly string[];
}

export interface SharedFamilyConsumptionInspection extends JsonObject {
  schemaVersion: typeof SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION;
  consumerPosture: SharedFamilyConsumerPosture;
  artifactPosture: SharedFamilyArtifactPosture;
  generatedFamily: "continuum";
  fallback: "local-debugger-mirror";
  artifacts: readonly SharedFamilyGeneratedArtifactInspection[];
  reason: string;
}

export interface SharedFamilyConsumptionInspectionArgs {
  rootPath: string;
  artifacts?: readonly SharedFamilyGeneratedArtifactDescriptor[];
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

function fallbackSharedFamilyConsumption(): SharedFamilyConsumptionInspection {
  return {
    schemaVersion: SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION,
    consumerPosture: "LOCAL_MIRROR_FALLBACK",
    artifactPosture: "ABSENT",
    generatedFamily: "continuum",
    fallback: "local-debugger-mirror",
    artifacts: [],
    reason:
      "Generated Continuum proof-family artifacts are not checked into WARP TTD yet; host-published payloads hydrate through the explicit local mirror boundary."
  };
}

function inspectGeneratedArtifact(
  rootPath: string,
  descriptor: SharedFamilyGeneratedArtifactDescriptor
): SharedFamilyGeneratedArtifactInspection {
  const artifactRoot = path.resolve(rootPath, descriptor.artifactRoot);
  const presentFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const file of descriptor.requiredFiles) {
    const filePath = path.join(artifactRoot, file);
    if (fs.existsSync(filePath)) {
      presentFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }

  return {
    family: descriptor.family,
    target: descriptor.target,
    artifactPosture: missingFiles.length === 0 ? "PRESENT" : "OBSTRUCTED",
    ...(descriptor.schemaVersion === undefined
      ? {}
      : { schemaVersion: descriptor.schemaVersion }),
    artifactRoot: descriptor.artifactRoot,
    requiredFiles: [...descriptor.requiredFiles],
    presentFiles,
    missingFiles
  };
}

function inspectGeneratedArtifacts(
  rootPath: string,
  descriptors: readonly SharedFamilyGeneratedArtifactDescriptor[]
): readonly SharedFamilyGeneratedArtifactInspection[] {
  return descriptors.map((descriptor) => inspectGeneratedArtifact(rootPath, descriptor));
}

function missingGeneratedFiles(
  artifacts: readonly SharedFamilyGeneratedArtifactInspection[]
): readonly string[] {
  return artifacts.flatMap((artifact) => artifact.missingFiles);
}

function unavailableSharedFamilyConsumption(
  artifacts: readonly SharedFamilyGeneratedArtifactInspection[],
  missingFiles: readonly string[]
): SharedFamilyConsumptionInspection {
  return {
    schemaVersion: SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION,
    consumerPosture: "GENERATED_FAMILY_UNAVAILABLE",
    artifactPosture: "OBSTRUCTED",
    generatedFamily: "continuum",
    fallback: "local-debugger-mirror",
    artifacts,
    reason:
      `Declared generated Continuum Echo inspect artifacts are missing generated files: ${missingFiles.join(", ")}.`
  };
}

function presentSharedFamilyConsumption(
  artifacts: readonly SharedFamilyGeneratedArtifactInspection[]
): SharedFamilyConsumptionInspection {
  return {
    schemaVersion: SHARED_FAMILY_CONSUMPTION_SCHEMA_VERSION,
    consumerPosture: "GENERATED_FAMILY_PRESENT",
    artifactPosture: "PRESENT",
    generatedFamily: "continuum",
    fallback: "local-debugger-mirror",
    artifacts,
    reason:
      "Declared Wesley-generated Continuum Echo inspect artifacts are present under the target root."
  };
}

export function inspectSharedFamilyConsumption(
  args?: SharedFamilyConsumptionInspectionArgs
): SharedFamilyConsumptionInspection {
  if (args === undefined) {
    return fallbackSharedFamilyConsumption();
  }

  const descriptors = args.artifacts ?? [];
  if (descriptors.length === 0) return fallbackSharedFamilyConsumption();

  const artifacts = inspectGeneratedArtifacts(args.rootPath, descriptors);
  const missingFiles = missingGeneratedFiles(artifacts);
  if (missingFiles.length > 0) {
    return unavailableSharedFamilyConsumption(artifacts, missingFiles);
  }

  return presentSharedFamilyConsumption(artifacts);
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

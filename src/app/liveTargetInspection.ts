import fs from "node:fs";
import path from "node:path";

import {
  inspectLiveEchoFamilyIntake,
  type LiveEchoFamilyIntakeInspection
} from "./liveEchoFamilyIntake.ts";
import {
  inspectLiveEchoAdapterProbe,
  type EchoAdapterProbeInspection
} from "./echoAdapterProbe.ts";
import type { JsonObject, JsonValue } from "./generatedFamilyIngress.ts";

export type LiveTargetName = string;
export type LiveTargetRootPosture = "PRESENT" | "MISSING" | "NOT_APPLICABLE";
export type LiveTargetAdapterPosture =
  | "CONFIGURED"
  | "UNAVAILABLE"
  | "UNSUPPORTED"
  | "OBSTRUCTED";
export type LiveTargetAdmissionChainPosture = "UNAVAILABLE";
export type LiveTargetConnectionMode =
  | "echo-root"
  | "git-warp"
  | "descriptor-only";
export type LiveTargetRuntimeBoundaryEvidencePosture =
  | "UNAVAILABLE"
  | "TRANSLATED_SUBSTRATE"
  | "CONTINUUM_NATIVE";
export type LiveTargetRuntimeBoundaryEvidenceSubstrate =
  | "git-warp"
  | "echo"
  | (string & {});
export type LiveTargetRuntimeBoundaryEvidenceKind =
  | "git-commit"
  | "git-range"
  | "warp-index"
  | (string & {});
export type LiveTargetCapability =
  | "ECHO_ADAPTER_PROBE"
  | "SESSION_FAMILY_FACTS"
  | "GIT_WARP_SESSION"
  | "DESCRIPTOR_ONLY"
  | (string & {});

export type LiveTargetRuntimeBoundaryEvidence =
  | {
    posture: "UNAVAILABLE";
    nativeContinuumWitness: false;
  }
  | {
    posture: "TRANSLATED_SUBSTRATE";
    nativeContinuumWitness: false;
    substrate: LiveTargetRuntimeBoundaryEvidenceSubstrate;
    evidenceKind?: LiveTargetRuntimeBoundaryEvidenceKind;
  }
  | {
    posture: "CONTINUUM_NATIVE";
    nativeContinuumWitness: true;
    substrate?: LiveTargetRuntimeBoundaryEvidenceSubstrate;
    evidenceKind?: LiveTargetRuntimeBoundaryEvidenceKind;
  };

export interface EchoRootConnectionDescriptor {
  readonly mode: "echo-root";
  readonly rootPath: string;
}

export interface GitWarpConnectionDescriptor {
  readonly mode: "git-warp";
  readonly rootPath: string;
  readonly graphName: string;
}

export interface DescriptorOnlyConnectionDescriptor {
  readonly mode: "descriptor-only";
  readonly rootPath?: string;
  readonly reason?: string;
  readonly adapterPosture?: Extract<LiveTargetAdapterPosture, "UNSUPPORTED" | "OBSTRUCTED">;
}

type DescriptorOnlyAdapterPosture = NonNullable<
  DescriptorOnlyConnectionDescriptor["adapterPosture"]
>;

interface DescriptorOnlyConnectionFields {
  readonly rootPath?: string;
  readonly reason?: string;
  readonly adapterPosture?: DescriptorOnlyAdapterPosture;
}

export type ContinuumDebugTargetConnection =
  | EchoRootConnectionDescriptor
  | GitWarpConnectionDescriptor
  | DescriptorOnlyConnectionDescriptor;

export interface ContinuumDebugTargetDescriptor {
  readonly id: string;
  readonly label?: string;
  readonly appKind?: string;
  readonly connection: ContinuumDebugTargetConnection;
}

export interface LiveTargetInspection {
  target: LiveTargetName;
  targetLabel?: string;
  connectionMode: LiveTargetConnectionMode;
  hostKind: "ECHO" | "GIT_WARP" | "CONTINUUM";
  appKind: string;
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: LiveTargetAdapterPosture;
  admissionChainPosture: LiveTargetAdmissionChainPosture;
  runtimeBoundaryEvidence: LiveTargetRuntimeBoundaryEvidence;
  capabilities: readonly LiveTargetCapability[];
  readOnly: true;
  echoAdapterProbe?: EchoAdapterProbeInspection;
  sessionFamilyIntake?: LiveEchoFamilyIntakeInspection;
  graphName?: string;
  reason: string;
}

export interface LiveTargetRoots {
  jeditRoot: string;
  graftRoot: string;
}

export interface LiveTargetDescriptorArgs {
  readonly descriptors: readonly ContinuumDebugTargetDescriptor[];
}

export type LiveTargetInspectionInput =
  | LiveTargetRoots
  | LiveTargetDescriptorArgs
  | readonly ContinuumDebugTargetDescriptor[];

const DEFAULT_JEDIT_ROOT = "../jedit";
const DEFAULT_GRAFT_ROOT = "../graft";
const GRAFT_GRAPH_NAME = "graft-ast";
const TARGETS_JSON_ENV = "WARP_TTD_TARGETS_JSON";

function resolveRoot(
  env: Readonly<NodeJS.ProcessEnv>,
  envName: string,
  fallback: string
): string {
  return path.resolve(env[envName] ?? fallback);
}

function rootPosture(rootPath: string): Exclude<LiveTargetRootPosture, "NOT_APPLICABLE"> {
  return fs.existsSync(rootPath) ? "PRESENT" : "MISSING";
}

export function liveTargetRootsFromEnv(
  env: Readonly<NodeJS.ProcessEnv> = process.env
): LiveTargetRoots {
  return {
    graftRoot: resolveRoot(env, "WARP_TTD_GRAFT_ROOT", DEFAULT_GRAFT_ROOT),
    jeditRoot: resolveRoot(env, "WARP_TTD_JEDIT_ROOT", DEFAULT_JEDIT_ROOT)
  };
}

export function defaultLiveTargetDescriptors(
  roots: LiveTargetRoots = liveTargetRootsFromEnv()
): readonly ContinuumDebugTargetDescriptor[] {
  return [
    {
      id: "jedit",
      label: "jedit local witness",
      appKind: "live Echo app",
      connection: { mode: "echo-root", rootPath: roots.jeditRoot }
    },
    {
      id: "graft",
      label: "graft local witness",
      appKind: "live git-warp app",
      connection: {
        mode: "git-warp",
        rootPath: roots.graftRoot,
        graphName: GRAFT_GRAPH_NAME
      }
    }
  ];
}

function unavailableRuntimeBoundaryEvidence(): LiveTargetRuntimeBoundaryEvidence {
  return {
    posture: "UNAVAILABLE",
    nativeContinuumWitness: false
  };
}

function graftTranslatedSubstrateEvidence(): LiveTargetRuntimeBoundaryEvidence {
  return {
    posture: "TRANSLATED_SUBSTRATE",
    nativeContinuumWitness: false,
    substrate: "git-warp",
    evidenceKind: "warp-index"
  };
}

function adapterPostureFromEchoProbe(
  probe: EchoAdapterProbeInspection
): LiveTargetAdapterPosture {
  switch (probe.probePosture) {
    case "PRESENT":
      return "CONFIGURED";
    case "UNSUPPORTED":
      return "UNSUPPORTED";
    case "OBSTRUCTED":
      return "OBSTRUCTED";
    case "UNAVAILABLE":
      return "UNAVAILABLE";
  }
}

function targetLabelObject(
  descriptor: ContinuumDebugTargetDescriptor
): Pick<LiveTargetInspection, "targetLabel"> | object {
  return descriptor.label === undefined ? {} : { targetLabel: descriptor.label };
}

interface EchoRootFacts {
  readonly adapterPosture: LiveTargetAdapterPosture;
  readonly echoAdapterProbe: EchoAdapterProbeInspection;
  readonly sessionFamilyIntake: LiveEchoFamilyIntakeInspection;
}

function echoRootFacts(
  descriptor: ContinuumDebugTargetDescriptor,
  connection: EchoRootConnectionDescriptor,
  posture: Exclude<LiveTargetRootPosture, "NOT_APPLICABLE">
): EchoRootFacts {
  const echoAdapterProbe = inspectLiveEchoAdapterProbe({
    rootPath: connection.rootPath,
    rootPosture: posture,
    targetId: descriptor.id
  });

  return {
    adapterPosture: adapterPostureFromEchoProbe(echoAdapterProbe),
    echoAdapterProbe,
    sessionFamilyIntake: inspectLiveEchoFamilyIntake({
      rootPath: connection.rootPath,
      rootPosture: posture,
      targetId: descriptor.id
    })
  };
}

function inspectEchoRootTarget(
  descriptor: ContinuumDebugTargetDescriptor,
  connection: EchoRootConnectionDescriptor
): LiveTargetInspection {
  const posture = rootPosture(connection.rootPath);
  const facts = echoRootFacts(descriptor, connection, posture);

  return {
    target: descriptor.id,
    ...targetLabelObject(descriptor),
    connectionMode: connection.mode,
    hostKind: "ECHO",
    appKind: descriptor.appKind ?? "Continuum-compatible app",
    rootPath: connection.rootPath,
    rootPosture: posture,
    adapterPosture: facts.adapterPosture,
    admissionChainPosture: "UNAVAILABLE",
    runtimeBoundaryEvidence: unavailableRuntimeBoundaryEvidence(),
    capabilities: ["ECHO_ADAPTER_PROBE", "SESSION_FAMILY_FACTS"],
    readOnly: true,
    echoAdapterProbe: facts.echoAdapterProbe,
    sessionFamilyIntake: facts.sessionFamilyIntake,
    reason:
      "Echo-compatible descriptor is registered; adapter/session publication and native Continuum evidence remain explicit posture facts."
  };
}

function inspectGitWarpTarget(
  descriptor: ContinuumDebugTargetDescriptor,
  connection: GitWarpConnectionDescriptor
): LiveTargetInspection {
  return {
    target: descriptor.id,
    ...targetLabelObject(descriptor),
    connectionMode: connection.mode,
    hostKind: "GIT_WARP",
    appKind: descriptor.appKind ?? "Continuum-compatible app",
    rootPath: connection.rootPath,
    rootPosture: rootPosture(connection.rootPath),
    adapterPosture: "CONFIGURED",
    admissionChainPosture: "UNAVAILABLE",
    runtimeBoundaryEvidence: graftTranslatedSubstrateEvidence(),
    capabilities: ["GIT_WARP_SESSION"],
    readOnly: true,
    graphName: connection.graphName,
    reason:
      "git-warp-compatible descriptor is registered; facts are translated substrate evidence, not native Continuum witnesshood."
  };
}

function descriptorOnlyRootPosture(
  connection: DescriptorOnlyConnectionDescriptor
): LiveTargetRootPosture {
  return connection.rootPath === undefined ? "NOT_APPLICABLE" : rootPosture(connection.rootPath);
}

function inspectDescriptorOnlyTarget(
  descriptor: ContinuumDebugTargetDescriptor,
  connection: DescriptorOnlyConnectionDescriptor
): LiveTargetInspection {
  return {
    target: descriptor.id,
    ...targetLabelObject(descriptor),
    connectionMode: connection.mode,
    hostKind: "CONTINUUM",
    appKind: descriptor.appKind ?? "Continuum-compatible app",
    rootPath: connection.rootPath ?? "",
    rootPosture: descriptorOnlyRootPosture(connection),
    adapterPosture: connection.adapterPosture ?? "UNSUPPORTED",
    admissionChainPosture: "UNAVAILABLE",
    runtimeBoundaryEvidence: unavailableRuntimeBoundaryEvidence(),
    capabilities: ["DESCRIPTOR_ONLY"],
    readOnly: true,
    reason:
      connection.reason ??
      "Continuum target descriptor is registered, but runtime handshake discovery is not implemented in this cycle."
  };
}

function inspectDescriptor(
  descriptor: ContinuumDebugTargetDescriptor
): LiveTargetInspection {
  switch (descriptor.connection.mode) {
    case "echo-root":
      return inspectEchoRootTarget(descriptor, descriptor.connection);
    case "git-warp":
      return inspectGitWarpTarget(descriptor, descriptor.connection);
    case "descriptor-only":
      return inspectDescriptorOnlyTarget(descriptor, descriptor.connection);
  }
}

function isDescriptorArray(
  input: LiveTargetInspectionInput
): input is readonly ContinuumDebugTargetDescriptor[] {
  return Array.isArray(input);
}

function isLiveTargetRoots(value: object): value is LiveTargetRoots {
  return "jeditRoot" in value && "graftRoot" in value;
}

function descriptorsFromInput(
  input: LiveTargetInspectionInput
): readonly ContinuumDebugTargetDescriptor[] {
  if (isDescriptorArray(input)) return obstructDuplicateIds(input);
  if (isLiveTargetRoots(input)) return obstructDuplicateIds(defaultLiveTargetDescriptors(input));
  if ("descriptors" in input) return obstructDuplicateIds(input.descriptors);
  return obstructDuplicateIds(defaultLiveTargetDescriptors());
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function stringField(data: JsonObject, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectField(data: JsonObject, field: string): JsonObject | undefined {
  const value = data[field];
  return isJsonObject(value) ? value : undefined;
}

function connectionModeFrom(value: JsonValue | undefined): LiveTargetConnectionMode | undefined {
  if (value === "echo-root") return value;
  if (value === "git-warp") return value;
  if (value === "descriptor-only") return value;
  return undefined;
}

function echoRootConnectionFrom(
  data: JsonObject
): EchoRootConnectionDescriptor | DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  if (rootPath !== undefined) return { mode: "echo-root", rootPath };
  return obstructedDescriptorOnlyConnection("echo-root target descriptor requires rootPath.");
}

function gitWarpConnectionFrom(
  data: JsonObject
): GitWarpConnectionDescriptor | DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  if (rootPath === undefined) {
    return obstructedDescriptorOnlyConnection("git-warp target descriptor requires rootPath.");
  }
  const graphName = stringField(data, "graphName");
  if (graphName === undefined) {
    return obstructedDescriptorOnlyConnection("git-warp target descriptor requires graphName.");
  }
  return { mode: "git-warp", rootPath, graphName };
}

function descriptorOnlyAdapterPostureFrom(
  value: JsonValue | undefined
): DescriptorOnlyAdapterPosture | undefined {
  if (value === "UNSUPPORTED") return value;
  if (value === "OBSTRUCTED") return value;
  return undefined;
}

function descriptorOnlyConnectionFields(
  reason: string | undefined,
  rootPath: string | undefined,
  adapterPosture: DescriptorOnlyAdapterPosture | undefined
): DescriptorOnlyConnectionFields {
  const fields: {
    reason?: string;
    rootPath?: string;
    adapterPosture?: DescriptorOnlyAdapterPosture;
  } = {};
  if (reason !== undefined) fields.reason = reason;
  if (rootPath !== undefined) fields.rootPath = rootPath;
  if (adapterPosture !== undefined) fields.adapterPosture = adapterPosture;
  return fields;
}

function descriptorOnlyConnectionFrom(data: JsonObject): DescriptorOnlyConnectionDescriptor {
  const reason = stringField(data, "reason");
  const rootPath = stringField(data, "rootPath");
  const adapterPosture = descriptorOnlyAdapterPostureFrom(data["adapterPosture"]);
  if ("adapterPosture" in data && adapterPosture === undefined) {
    return obstructedDescriptorOnlyConnection(
      "descriptor-only target descriptor adapterPosture must be UNSUPPORTED or OBSTRUCTED."
    );
  }
  return {
    mode: "descriptor-only",
    ...descriptorOnlyConnectionFields(reason, rootPath, adapterPosture)
  };
}

function obstructedDescriptorOnlyConnection(reason: string): DescriptorOnlyConnectionDescriptor {
  return {
    mode: "descriptor-only",
    adapterPosture: "OBSTRUCTED",
    reason
  };
}

function unsupportedDescriptorOnlyConnection(
  data: JsonObject,
  mode: string
): DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  return {
    mode: "descriptor-only",
    adapterPosture: "UNSUPPORTED",
    reason: `Connection mode ${mode} is not supported by this WARP TTD cycle.`,
    ...(rootPath === undefined ? {} : { rootPath })
  };
}

function unknownModeConnection(data: JsonObject): DescriptorOnlyConnectionDescriptor {
  const mode = data["mode"];
  if (typeof mode === "string") return unsupportedDescriptorOnlyConnection(data, mode);
  return obstructedDescriptorOnlyConnection("Target descriptor connection mode must be a string.");
}

function connectionForMode(
  mode: LiveTargetConnectionMode | undefined,
  connection: JsonObject
): ContinuumDebugTargetConnection {
  switch (mode) {
    case "echo-root":
      return echoRootConnectionFrom(connection);
    case "git-warp":
      return gitWarpConnectionFrom(connection);
    case "descriptor-only":
      return descriptorOnlyConnectionFrom(connection);
    case undefined:
      return unknownModeConnection(connection);
    default:
      return unknownModeConnection(connection);
  }
}

function connectionFromJson(data: JsonObject): ContinuumDebugTargetConnection {
  const connection = objectField(data, "connection");
  if (connection === undefined) {
    return obstructedDescriptorOnlyConnection("Target descriptor connection must be an object.");
  }
  return connectionForMode(connectionModeFrom(connection["mode"]), connection);
}

function descriptorMetadataObject(
  data: JsonObject
): Pick<ContinuumDebugTargetDescriptor, "appKind" | "label"> | object {
  const appKind = stringField(data, "appKind");
  const label = stringField(data, "label");
  return {
    ...(appKind === undefined ? {} : { appKind }),
    ...(label === undefined ? {} : { label })
  };
}

function generatedDescriptorId(index: number): string {
  return `warp-ttd-target-descriptor-${String(index)}`;
}

function obstructionDescriptor(id: string, reason: string): ContinuumDebugTargetDescriptor {
  return {
    id,
    connection: obstructedDescriptorOnlyConnection(reason)
  };
}

function descriptorFromJson(value: JsonValue, index: number): ContinuumDebugTargetDescriptor {
  if (!isJsonObject(value)) {
    return obstructionDescriptor(generatedDescriptorId(index), "Target descriptor entry must be an object.");
  }
  const id = stringField(value, "id");
  if (id === undefined) {
    return obstructionDescriptor(generatedDescriptorId(index), "Target descriptor id must be a non-empty string.");
  }
  const connection = connectionFromJson(value);
  return {
    id,
    connection,
    ...descriptorMetadataObject(value)
  };
}

function duplicateTargetIds(
  descriptors: readonly ContinuumDebugTargetDescriptor[]
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.id)) duplicates.add(descriptor.id);
    seen.add(descriptor.id);
  }
  return duplicates;
}

function duplicateObstructedDescriptor(
  descriptor: ContinuumDebugTargetDescriptor
): ContinuumDebugTargetDescriptor {
  return obstructionDescriptor(
    descriptor.id,
    `Duplicate target descriptor id ${descriptor.id} is not allowed.`
  );
}

function obstructDuplicateIds(
  descriptors: readonly ContinuumDebugTargetDescriptor[]
): readonly ContinuumDebugTargetDescriptor[] {
  const duplicates = duplicateTargetIds(descriptors);
  return descriptors.map((descriptor) => (
    duplicates.has(descriptor.id) ? duplicateObstructedDescriptor(descriptor) : descriptor
  ));
}

function targetsJsonObstruction(reason: string): ContinuumDebugTargetDescriptor {
  return {
    id: "warp-ttd-targets-json",
    label: TARGETS_JSON_ENV,
    connection: {
      mode: "descriptor-only",
      adapterPosture: "OBSTRUCTED",
      reason
    }
  };
}

function descriptorsFromJson(value: string): readonly ContinuumDebugTargetDescriptor[] {
  const parsed = JSON.parse(value) as JsonValue;
  if (!isJsonArray(parsed)) {
    return [targetsJsonObstruction(`${TARGETS_JSON_ENV} must be a JSON array.`)];
  }
  return obstructDuplicateIds(parsed.map(descriptorFromJson));
}

export function liveTargetDescriptorsFromEnv(): readonly ContinuumDebugTargetDescriptor[] {
  const configured = process.env[TARGETS_JSON_ENV];
  if (configured === undefined) return defaultLiveTargetDescriptors();
  try {
    return descriptorsFromJson(configured);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown JSON parse error";
    return [targetsJsonObstruction(`${TARGETS_JSON_ENV} could not be parsed: ${message}.`)];
  }
}

export function inspectLiveTargets(
  input: LiveTargetInspectionInput = liveTargetDescriptorsFromEnv()
): LiveTargetInspection[] {
  return descriptorsFromInput(input).map(inspectDescriptor);
}

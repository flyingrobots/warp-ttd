import {
  inspectLiveTargets,
  type LiveTargetConnectionMode,
  type LiveTargetInspection,
  type LiveTargetRuntimeBoundaryEvidencePosture
} from "./liveTargetInspection.ts";
import {
  inspectRuntimeHello,
  type ContinuumHelloReason,
  type ContinuumRuntimeHelloInspection,
  type RuntimeHelloEvidencePosture,
  type RuntimeHelloPosture
} from "./runtimeHelloInspection.ts";
import {
  loadRuntimeRegistryFromEnv,
  loadRuntimeRegistryFromPath,
  type ContinuumRuntimeRegistryInspection,
  type RuntimeRegistryLoadResult,
  type RuntimeRegistryRedaction
} from "./runtimeRegistry.ts";

export const CONTINUUM_RUNTIME_DISCOVERY_INSPECTION_SCHEMA_VERSION =
  "warp-ttd.continuum-runtime-discovery-inspection.v1";

export type RuntimeDiscoveryPosture =
  | "REACHABLE"
  | "ABSENT"
  | "UNSUPPORTED"
  | "OBSTRUCTED";

export interface RuntimeDiscoveryReason {
  readonly code: string;
  readonly message: string;
  readonly source:
    | "REGISTRY"
    | "TARGET_DESCRIPTOR"
    | "RUNTIME_HELLO"
    | "ADAPTER_TRANSLATION"
    | "WARP_TTD";
}

export interface ContinuumRuntimeDiscoveryTarget {
  readonly targetId: string;
  readonly targetLabel?: string;
  readonly appKind: string;
  readonly connectionMode: LiveTargetConnectionMode;
}

export interface ContinuumRuntimeDiscoveryRecord {
  readonly target: ContinuumRuntimeDiscoveryTarget;
  readonly discoveryPosture: RuntimeDiscoveryPosture;
  readonly targetInspection: LiveTargetInspection;
  readonly hello?: ContinuumRuntimeHelloInspection;
  readonly evidencePosture:
    | RuntimeHelloEvidencePosture
    | LiveTargetRuntimeBoundaryEvidencePosture;
  readonly readOnly: true;
  readonly consent: "NOT_REQUIRED" | "DESIGN_DEFERRED";
  readonly auth: "NOT_REQUIRED" | "DESIGN_DEFERRED";
  readonly redaction: RuntimeRegistryRedaction;
  readonly reasons: readonly RuntimeDiscoveryReason[];
}

export interface ContinuumRuntimeDiscoveryInspection {
  readonly schemaVersion: typeof CONTINUUM_RUNTIME_DISCOVERY_INSPECTION_SCHEMA_VERSION;
  readonly registry: ContinuumRuntimeRegistryInspection;
  readonly runtimeDiscovery: readonly ContinuumRuntimeDiscoveryRecord[];
}

export interface RuntimeDiscoveryInput {
  readonly registryPath?: string;
  readonly env?: Readonly<NodeJS.ProcessEnv>;
}

const DISCOVERY_POSTURE_BY_HELLO = {
  PRESENT: "REACHABLE",
  ABSENT: "ABSENT",
  UNAVAILABLE: "ABSENT",
  UNSUPPORTED: "UNSUPPORTED",
  OBSTRUCTED: "OBSTRUCTED",
  RIGHTS_LIMITED: "OBSTRUCTED",
  REDACTED: "OBSTRUCTED"
} as const satisfies Readonly<Record<RuntimeHelloPosture, RuntimeDiscoveryPosture>>;

const HELLO_REASON_CODE_BY_POSTURE = {
  PRESENT: "RUNTIME_HELLO_PRESENT",
  ABSENT: "RUNTIME_HELLO_ABSENT",
  UNAVAILABLE: "RUNTIME_HELLO_UNAVAILABLE",
  UNSUPPORTED: "RUNTIME_HELLO_UNSUPPORTED",
  OBSTRUCTED: "RUNTIME_HELLO_OBSTRUCTED",
  RIGHTS_LIMITED: "RUNTIME_HELLO_RIGHTS_LIMITED",
  REDACTED: "RUNTIME_HELLO_REDACTED"
} as const satisfies Readonly<Record<RuntimeHelloPosture, string>>;

interface RuntimeDiscoveryRecordArgs {
  readonly targetInspection: LiveTargetInspection;
  readonly hello?: ContinuumRuntimeHelloInspection | undefined;
  readonly registry: ContinuumRuntimeRegistryInspection;
  readonly index: number;
}

function reason(
  code: string,
  message: string,
  source: RuntimeDiscoveryReason["source"]
): RuntimeDiscoveryReason {
  return { code, message, source };
}

function targetLabel(label: string | undefined): Pick<ContinuumRuntimeDiscoveryTarget, "targetLabel"> | object {
  return label === undefined ? {} : { targetLabel: label };
}

function discoveryTarget(target: LiveTargetInspection): ContinuumRuntimeDiscoveryTarget {
  return {
    targetId: target.target,
    appKind: target.appKind,
    connectionMode: target.connectionMode,
    ...targetLabel(target.targetLabel)
  };
}

function redactionForIndex(
  registry: ContinuumRuntimeRegistryInspection,
  index: number
): RuntimeRegistryRedaction {
  const prefix = `runtimes[${index.toString()}].`;
  const fields = registry.redaction.fields.filter((field) => field.startsWith(prefix));
  return { redacted: fields.length > 0, fields };
}

function registryReasons(
  registry: ContinuumRuntimeRegistryInspection,
  target: LiveTargetInspection
): readonly RuntimeDiscoveryReason[] {
  if (registry.posture !== "OBSTRUCTED") return [];
  if (target.adapterPosture !== "OBSTRUCTED") return [];
  return registry.reasons.map((entry) => reason(entry.code, entry.message, entry.source));
}

function isEndpointUnsupported(target: LiveTargetInspection): boolean {
  return (
    target.connectionMode === "descriptor-only" &&
    target.adapterPosture === "UNSUPPORTED" &&
    target.reason.includes("Connection mode endpoint")
  );
}

function targetReason(target: LiveTargetInspection): RuntimeDiscoveryReason | undefined {
  if (target.rootPosture === "MISSING") {
    return reason("LOCAL_ROOT_MISSING", `${target.target} local root is missing.`, "TARGET_DESCRIPTOR");
  }
  if (isEndpointUnsupported(target)) {
    return reason("ENDPOINT_CONSENT_NOT_DESIGNED", target.reason, "REGISTRY");
  }
  if (target.adapterPosture === "UNSUPPORTED") {
    return reason("DESCRIPTOR_UNSUPPORTED", target.reason, "TARGET_DESCRIPTOR");
  }
  if (target.adapterPosture === "OBSTRUCTED") {
    return reason("TARGET_DESCRIPTOR_OBSTRUCTED", target.reason, "TARGET_DESCRIPTOR");
  }
  return undefined;
}

function discoveryPostureFromHello(posture: RuntimeHelloPosture): RuntimeDiscoveryPosture {
  return DISCOVERY_POSTURE_BY_HELLO[posture];
}

function discoveryPostureFromTarget(
  target: LiveTargetInspection
): RuntimeDiscoveryPosture | undefined {
  if (target.rootPosture === "MISSING") return "ABSENT";
  if (target.adapterPosture === "OBSTRUCTED") return "OBSTRUCTED";
  if (target.adapterPosture === "UNSUPPORTED") return "UNSUPPORTED";
  return undefined;
}

function discoveryPosture(args: RuntimeDiscoveryRecordArgs): RuntimeDiscoveryPosture {
  const targetPosture = discoveryPostureFromTarget(args.targetInspection);
  if (targetPosture !== undefined) return targetPosture;
  if (args.hello === undefined) return "OBSTRUCTED";
  return discoveryPostureFromHello(args.hello.helloPosture);
}

function discoveryReasonSource(
  source: ContinuumHelloReason["source"] | undefined
): RuntimeDiscoveryReason["source"] {
  if (source === undefined) return "RUNTIME_HELLO";
  if (source === "RUNTIME") return "RUNTIME_HELLO";
  return source;
}

function reasonCodeFromHelloPosture(posture: RuntimeHelloPosture): string {
  return HELLO_REASON_CODE_BY_POSTURE[posture];
}

function helloReason(hello: ContinuumRuntimeHelloInspection): RuntimeDiscoveryReason {
  return reason(
    reasonCodeFromHelloPosture(hello.helloPosture),
    hello.reason ?? `${hello.target} runtime hello posture is ${hello.helloPosture}.`,
    discoveryReasonSource(hello.reasons[0]?.source)
  );
}

function helloReasons(
  hello: ContinuumRuntimeHelloInspection | undefined
): readonly RuntimeDiscoveryReason[] {
  if (hello !== undefined) return [helloReason(hello)];
  return [reason("RUNTIME_HELLO_MISSING", "Runtime hello inspection was not produced.", "WARP_TTD")];
}

function optionalReason(value: RuntimeDiscoveryReason | undefined): readonly RuntimeDiscoveryReason[] {
  return value === undefined ? [] : [value];
}

function redactionReasons(redaction: RuntimeRegistryRedaction): readonly RuntimeDiscoveryReason[] {
  if (!redaction.redacted) return [];
  return [
    reason(
      "REGISTRY_SECRET_FIELD_REDACTED",
      "Secret-like registry fields were redacted from runtime discovery output.",
      "REGISTRY"
    )
  ];
}

function consentPosture(target: LiveTargetInspection): "NOT_REQUIRED" | "DESIGN_DEFERRED" {
  return isEndpointUnsupported(target) ? "DESIGN_DEFERRED" : "NOT_REQUIRED";
}

function helloField(
  hello: ContinuumRuntimeHelloInspection | undefined
): Pick<ContinuumRuntimeDiscoveryRecord, "hello"> | object {
  return hello === undefined ? {} : { hello };
}

function discoveryRecord(args: RuntimeDiscoveryRecordArgs): ContinuumRuntimeDiscoveryRecord {
  const redaction = redactionForIndex(args.registry, args.index);
  const target = args.targetInspection;
  return {
    target: discoveryTarget(target),
    discoveryPosture: discoveryPosture(args),
    targetInspection: target,
    ...helloField(args.hello),
    evidencePosture: args.hello?.evidencePosture ?? target.runtimeBoundaryEvidence.posture,
    readOnly: true,
    consent: consentPosture(target),
    auth: consentPosture(target),
    redaction,
    reasons: [
      ...registryReasons(args.registry, target),
      ...optionalReason(targetReason(target)),
      ...helloReasons(args.hello),
      ...redactionReasons(redaction)
    ]
  };
}

function loadRuntimeDiscoveryRegistry(input: RuntimeDiscoveryInput): RuntimeRegistryLoadResult {
  if (input.registryPath !== undefined) return loadRuntimeRegistryFromPath(input.registryPath);
  return loadRuntimeRegistryFromEnv(input.env ?? process.env);
}

function discoveryRecords(args: {
  readonly registry: ContinuumRuntimeRegistryInspection;
  readonly targets: readonly LiveTargetInspection[];
  readonly hellos: readonly ContinuumRuntimeHelloInspection[];
}): readonly ContinuumRuntimeDiscoveryRecord[] {
  return args.targets.map((targetInspection, index) => discoveryRecord({
    targetInspection,
    hello: args.hellos[index],
    registry: args.registry,
    index
  }));
}

export async function inspectRuntimeDiscovery(
  input: RuntimeDiscoveryInput = {}
): Promise<ContinuumRuntimeDiscoveryInspection> {
  const registry = loadRuntimeDiscoveryRegistry(input);
  const descriptorInput = { descriptors: registry.descriptors };
  const targets = inspectLiveTargets(descriptorInput);
  const hellos = await inspectRuntimeHello(descriptorInput);
  return {
    schemaVersion: CONTINUUM_RUNTIME_DISCOVERY_INSPECTION_SCHEMA_VERSION,
    registry: registry.inspection,
    runtimeDiscovery: discoveryRecords({ registry: registry.inspection, targets, hellos })
  };
}

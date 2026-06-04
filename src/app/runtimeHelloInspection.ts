import {
  inspectLiveTargets,
  liveTargetDescriptorsFromEnv,
  type LiveTargetConnectionMode,
  type LiveTargetInspection,
  type LiveTargetInspectionInput,
  type LiveTargetRuntimeBoundaryEvidencePosture
} from "./liveTargetInspection.ts";
import {
  inspectLiveTargetSessions,
  type LiveTargetSessionInspection
} from "./liveTargetSessionInspection.ts";

export const CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION = "continuum.debug.hello.v1";
export const CONTINUUM_RUNTIME_HELLO_INSPECTION_SCHEMA_VERSION =
  "warp-ttd.continuum-runtime-hello-inspection.v1";

export type RuntimeHelloPosture =
  | "PRESENT"
  | "ABSENT"
  | "UNAVAILABLE"
  | "UNSUPPORTED"
  | "OBSTRUCTED"
  | "RIGHTS_LIMITED"
  | "REDACTED";
export type RuntimeHelloEvidencePosture =
  | "CONTINUUM_NATIVE"
  | "TRANSLATED_SUBSTRATE"
  | "LOCAL_MIRROR_FALLBACK"
  | "UNAVAILABLE";

export interface ContinuumHelloReason {
  code: string;
  message: string;
  source: "TARGET_DESCRIPTOR" | "RUNTIME" | "ADAPTER_TRANSLATION" | "WARP_TTD";
}

export interface ContinuumHelloSourceRef {
  kind: "target-descriptor" | "adapter-translation";
  target: string;
  connectionMode?: LiveTargetConnectionMode;
  graphName?: string;
  substrate?: string;
  evidenceKind?: string;
}

export interface ContinuumSupportedFamily {
  registryKey: string;
  version: string;
  role: "PRODUCER" | "CONSUMER" | "TRANSLATOR";
  posture: "PRESENT" | "ABSENT" | "UNSUPPORTED" | "OBSTRUCTED";
  reason?: string;
}

export interface ContinuumRuntimeCapability {
  id: string;
  posture: "PRESENT" | "ABSENT" | "UNSUPPORTED" | "OBSTRUCTED" | "RIGHTS_LIMITED";
  evidencePosture: RuntimeHelloEvidencePosture;
  reason?: string;
}

export interface ContinuumRuntimeHello {
  schemaVersion: typeof CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION;
  runtime: {
    runtimeId: string;
    runtimeKind: string;
    runtimeVendor?: string;
    runtimeVersion?: string;
    instanceId?: string;
    displayName?: string;
  };
  protocol: {
    debugHelloVersion: "1";
    continuumVersion?: string;
    supportedFamilies: readonly ContinuumSupportedFamily[];
  };
  capabilities: readonly ContinuumRuntimeCapability[];
  posture: {
    availability: "PRESENT" | "DEGRADED" | "UNAVAILABLE";
    evidence: RuntimeHelloEvidencePosture;
    nativeContinuumWitness: boolean;
    consent: "NOT_REQUIRED" | "REQUIRED" | "GRANTED" | "DENIED" | "UNKNOWN";
    auth: "NOT_REQUIRED" | "REQUIRED" | "PRESENT" | "MISSING" | "INVALID" | "UNKNOWN";
    redaction: "NONE" | "PARTIAL" | "FULL";
    mutation: "NOT_SUPPORTED";
    authority: "NOT_ISSUED";
    admission: "NOT_PERFORMED";
  };
  sourceRefs: readonly ContinuumHelloSourceRef[];
  reasons: readonly ContinuumHelloReason[];
}

export interface ContinuumRuntimeHelloInspection {
  schemaVersion: typeof CONTINUUM_RUNTIME_HELLO_INSPECTION_SCHEMA_VERSION;
  target: string;
  targetLabel?: string;
  connectionMode: LiveTargetConnectionMode;
  hostKind: LiveTargetInspection["hostKind"];
  appKind: string;
  readOnly: true;
  helloPosture: RuntimeHelloPosture;
  evidencePosture: RuntimeHelloEvidencePosture;
  nativeContinuumWitness: boolean;
  hello?: ContinuumRuntimeHello;
  reason?: string;
  reasons: readonly ContinuumHelloReason[];
  retryHint?: string;
}

interface NonPresentInspectionArgs {
  target: LiveTargetInspection;
  helloPosture: Exclude<RuntimeHelloPosture, "PRESENT">;
  code: string;
  message: string;
  source: ContinuumHelloReason["source"];
  retryHint?: string;
  evidencePosture?: RuntimeHelloEvidencePosture;
  nativeContinuumWitness?: boolean;
}

function evidencePostureFromTarget(
  posture: LiveTargetRuntimeBoundaryEvidencePosture
): RuntimeHelloEvidencePosture {
  switch (posture) {
    case "CONTINUUM_NATIVE":
      return "CONTINUUM_NATIVE";
    case "TRANSLATED_SUBSTRATE":
      return "TRANSLATED_SUBSTRATE";
    case "UNAVAILABLE":
      return "UNAVAILABLE";
  }
}

function reason(
  code: string,
  message: string,
  source: ContinuumHelloReason["source"] = "WARP_TTD"
): ContinuumHelloReason {
  return { code, message, source };
}

function targetLabelObject(
  target: LiveTargetInspection
): Pick<ContinuumRuntimeHelloInspection, "targetLabel"> | object {
  return target.targetLabel === undefined ? {} : { targetLabel: target.targetLabel };
}

function runtimeDisplayNameObject(
  target: LiveTargetInspection
): Pick<ContinuumRuntimeHello["runtime"], "displayName"> | object {
  return target.targetLabel === undefined ? {} : { displayName: target.targetLabel };
}

function adapterTranslationSourceRef(
  target: LiveTargetInspection
): ContinuumHelloSourceRef | undefined {
  const evidence = target.runtimeBoundaryEvidence;
  if (evidence.posture === "UNAVAILABLE") return undefined;
  return {
    kind: "adapter-translation",
    target: target.target,
    ...(evidence.substrate === undefined ? {} : { substrate: evidence.substrate }),
    ...(evidence.evidenceKind === undefined ? {} : { evidenceKind: evidence.evidenceKind })
  };
}

function sourceRefs(target: LiveTargetInspection): readonly ContinuumHelloSourceRef[] {
  const refs: ContinuumHelloSourceRef[] = [
    {
      kind: "target-descriptor",
      target: target.target,
      connectionMode: target.connectionMode,
      ...(target.graphName === undefined ? {} : { graphName: target.graphName })
    }
  ];
  const adapterRef = adapterTranslationSourceRef(target);
  if (adapterRef !== undefined) refs.push(adapterRef);
  return refs;
}

function translatedGitWarpReason(): ContinuumHelloReason {
  return reason(
    "translated-substrate-hello",
    "WARP TTD translated git-warp adapter facts into a Continuum-compatible hello shape; this is not native Continuum witnesshood.",
    "ADAPTER_TRANSLATION"
  );
}

function translatedGitWarpFamilies(): readonly ContinuumSupportedFamily[] {
  return [
    {
      registryKey: "warp-ttd.git-warp-session",
      version: "1",
      role: "TRANSLATOR",
      posture: "PRESENT",
      reason:
        "WARP TTD can inspect git-warp sessions through its adapter, but git-warp has not published native continuum.debug.hello.v1."
    }
  ];
}

function translatedGitWarpCapabilities(
  evidencePosture: RuntimeHelloEvidencePosture
): readonly ContinuumRuntimeCapability[] {
  return [
    {
      id: "warp-ttd.target-session",
      posture: "PRESENT",
      evidencePosture
    }
  ];
}

function translatedGitWarpPosture(
  evidencePosture: RuntimeHelloEvidencePosture
): ContinuumRuntimeHello["posture"] {
  return {
    availability: "PRESENT",
    evidence: evidencePosture,
    nativeContinuumWitness: false,
    consent: "NOT_REQUIRED",
    auth: "NOT_REQUIRED",
    redaction: "NONE",
    mutation: "NOT_SUPPORTED",
    authority: "NOT_ISSUED",
    admission: "NOT_PERFORMED"
  };
}

function translatedGitWarpHello(target: LiveTargetInspection): ContinuumRuntimeHello {
  const evidencePosture = evidencePostureFromTarget(target.runtimeBoundaryEvidence.posture);
  return {
    schemaVersion: CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION,
    runtime: {
      runtimeId: target.target,
      runtimeKind: "git-warp",
      ...runtimeDisplayNameObject(target)
    },
    protocol: { debugHelloVersion: "1", supportedFamilies: translatedGitWarpFamilies() },
    capabilities: translatedGitWarpCapabilities(evidencePosture),
    posture: translatedGitWarpPosture(evidencePosture),
    sourceRefs: sourceRefs(target),
    reasons: [translatedGitWarpReason()]
  };
}

function presentInspection(
  target: LiveTargetInspection,
  hello: ContinuumRuntimeHello
): ContinuumRuntimeHelloInspection {
  return {
    schemaVersion: CONTINUUM_RUNTIME_HELLO_INSPECTION_SCHEMA_VERSION,
    target: target.target,
    ...targetLabelObject(target),
    connectionMode: target.connectionMode,
    hostKind: target.hostKind,
    appKind: target.appKind,
    readOnly: true,
    helloPosture: "PRESENT",
    evidencePosture: hello.posture.evidence,
    nativeContinuumWitness: hello.posture.nativeContinuumWitness,
    hello,
    reasons: hello.reasons
  };
}

function nonPresentEvidencePosture(args: NonPresentInspectionArgs): RuntimeHelloEvidencePosture {
  return args.evidencePosture ?? evidencePostureFromTarget(
    args.target.runtimeBoundaryEvidence.posture
  );
}

function nonPresentNativeContinuumWitness(args: NonPresentInspectionArgs): boolean {
  return args.nativeContinuumWitness ?? args.target.runtimeBoundaryEvidence.nativeContinuumWitness;
}

function nonPresentInspection(args: NonPresentInspectionArgs): ContinuumRuntimeHelloInspection {
  const { target } = args;
  const reasons = [reason(args.code, args.message, args.source)];
  return {
    schemaVersion: CONTINUUM_RUNTIME_HELLO_INSPECTION_SCHEMA_VERSION,
    target: target.target,
    ...targetLabelObject(target),
    connectionMode: target.connectionMode,
    hostKind: target.hostKind,
    appKind: target.appKind,
    readOnly: true,
    helloPosture: args.helloPosture,
    evidencePosture: nonPresentEvidencePosture(args),
    nativeContinuumWitness: nonPresentNativeContinuumWitness(args),
    reason: args.message,
    reasons,
    ...(args.retryHint === undefined ? {} : { retryHint: args.retryHint })
  };
}

function unavailableRootInspection(
  target: LiveTargetInspection,
  message: string,
  retryHint: string
): ContinuumRuntimeHelloInspection {
  return nonPresentInspection({
    target,
    helloPosture: "UNAVAILABLE",
    code: "runtime-hello-root-unavailable",
    message,
    source: "TARGET_DESCRIPTOR",
    evidencePosture: "UNAVAILABLE",
    nativeContinuumWitness: false,
    retryHint
  });
}

function targetRootMissing(target: LiveTargetInspection): boolean {
  return target.rootPosture === "MISSING";
}

function echoRootMissingMessage(target: LiveTargetInspection): string {
  return target.echoAdapterProbe?.reason
    ?? `${target.target} root is missing; no Echo runtime hello was inspected.`;
}

function inspectMissingEchoRootHello(
  target: LiveTargetInspection
): ContinuumRuntimeHelloInspection {
  return unavailableRootInspection(
    target,
    echoRootMissingMessage(target),
    "Fix the Echo target root path, then rerun runtime hello inspection."
  );
}

function inspectObstructedEchoHello(
  target: LiveTargetInspection
): ContinuumRuntimeHelloInspection {
  return nonPresentInspection({
    target,
    helloPosture: "OBSTRUCTED",
    code: "echo-runtime-hello-obstructed",
    message: target.reason,
    source: "TARGET_DESCRIPTOR",
    retryHint:
      "Fix the Echo target descriptor or adapter probe obstruction, then rerun runtime hello inspection."
  });
}

function inspectUnsupportedEchoHello(
  target: LiveTargetInspection
): ContinuumRuntimeHelloInspection {
  return nonPresentInspection({
    target,
    helloPosture: "UNSUPPORTED",
    code: "echo-runtime-hello-unsupported",
    message: target.echoAdapterProbe?.reason ?? target.reason,
    source: "TARGET_DESCRIPTOR",
    retryHint:
      "Publish a supported Echo adapter probe descriptor, then rerun runtime hello inspection."
  });
}

function inspectAbsentEchoHello(target: LiveTargetInspection): ContinuumRuntimeHelloInspection {
  return nonPresentInspection({
    target,
    helloPosture: "ABSENT",
    code: "echo-native-runtime-hello-absent",
    message: "Echo target is registered, but no native runtime hello producer is published yet.",
    source: "RUNTIME",
    retryHint:
      "Install or enable an Echo producer for continuum.debug.hello.v1, then rerun runtime hello inspection."
  });
}

function inspectEchoHello(target: LiveTargetInspection): ContinuumRuntimeHelloInspection {
  if (targetRootMissing(target)) return inspectMissingEchoRootHello(target);
  if (target.adapterPosture === "OBSTRUCTED") return inspectObstructedEchoHello(target);
  if (target.adapterPosture === "UNSUPPORTED") return inspectUnsupportedEchoHello(target);
  return inspectAbsentEchoHello(target);
}

function obstructedGitWarpHello(
  target: LiveTargetInspection,
  message: string
): ContinuumRuntimeHelloInspection {
  return nonPresentInspection({
    target,
    helloPosture: "OBSTRUCTED",
    code: "git-warp-runtime-hello-obstructed",
    message,
    source: "ADAPTER_TRANSLATION",
    evidencePosture: "UNAVAILABLE",
    nativeContinuumWitness: false,
    retryHint:
      "Fix the git-warp adapter/runtime probe obstruction, then rerun runtime hello inspection."
  });
}

function gitWarpSessionObstructionReason(
  target: LiveTargetInspection,
  session: LiveTargetSessionInspection | undefined
): string | undefined {
  if (session === undefined) return `${target.target} git-warp session was not inspected.`;
  if (session.sessionPosture === "OBSTRUCTED") return session.reason;
  return undefined;
}

function inspectGitWarpHello(
  target: LiveTargetInspection,
  session: LiveTargetSessionInspection | undefined
): ContinuumRuntimeHelloInspection {
  if (targetRootMissing(target)) {
    return unavailableRootInspection(
      target,
      `${target.target} root is missing; no git-warp adapter facts were inspected.`,
      "Fix the git-warp target root path, then rerun runtime hello inspection."
    );
  }

  if (target.adapterPosture === "OBSTRUCTED") {
    return obstructedGitWarpHello(target, target.reason);
  }

  const sessionObstructionReason = gitWarpSessionObstructionReason(target, session);
  if (sessionObstructionReason !== undefined) return obstructedGitWarpHello(
    target,
    sessionObstructionReason
  );

  return presentInspection(target, translatedGitWarpHello(target));
}

function inspectDescriptorOnlyHello(
  target: LiveTargetInspection
): ContinuumRuntimeHelloInspection {
  if (target.adapterPosture === "OBSTRUCTED") {
    return nonPresentInspection({
      target,
      helloPosture: "OBSTRUCTED",
      code: "descriptor-runtime-hello-obstructed",
      message: target.reason,
      source: "TARGET_DESCRIPTOR",
      retryHint:
        "Fix the target descriptor or runtime hello response, then rerun runtime hello inspection."
    });
  }

  return nonPresentInspection({
    target,
    helloPosture: "UNSUPPORTED",
    code: "descriptor-runtime-hello-unsupported",
    message: target.reason,
    source: "TARGET_DESCRIPTOR",
    retryHint:
      "Provide a supported Continuum runtime hello connection descriptor before relying on runtime compatibility."
  });
}

function inspectTargetRuntimeHello(
  target: LiveTargetInspection,
  session: LiveTargetSessionInspection | undefined
): ContinuumRuntimeHelloInspection {
  if (target.connectionMode === "git-warp") {
    return inspectGitWarpHello(target, session);
  }

  if (target.connectionMode === "echo-root") {
    return inspectEchoHello(target);
  }

  return inspectDescriptorOnlyHello(target);
}

export async function inspectRuntimeHello(
  input: LiveTargetInspectionInput = liveTargetDescriptorsFromEnv()
): Promise<ContinuumRuntimeHelloInspection[]> {
  const targets = inspectLiveTargets(input);
  const sessions = await inspectLiveTargetSessions(input);
  return targets.map((target, index) => inspectTargetRuntimeHello(target, sessions[index]));
}

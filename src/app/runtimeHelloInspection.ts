import {
  inspectLiveTargets,
  type LiveTargetConnectionMode,
  type LiveTargetInspection,
  type LiveTargetInspectionInput,
  type LiveTargetRuntimeBoundaryEvidence,
  type LiveTargetRuntimeBoundaryEvidencePosture
} from "./liveTargetInspection.ts";

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
  evidence: {
    posture: RuntimeHelloEvidencePosture;
    nativeContinuumWitness: boolean;
    substrate?: string;
    evidenceKind?: string;
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

function evidenceFields(
  evidence: LiveTargetRuntimeBoundaryEvidence
): Pick<ContinuumRuntimeHello["evidence"], "evidenceKind" | "substrate"> | object {
  if (evidence.posture === "UNAVAILABLE") return {};
  return {
    ...(evidence.substrate === undefined ? {} : { substrate: evidence.substrate }),
    ...(evidence.evidenceKind === undefined ? {} : { evidenceKind: evidence.evidenceKind })
  };
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
    evidence: {
      posture: evidencePosture,
      nativeContinuumWitness: false,
      ...evidenceFields(target.runtimeBoundaryEvidence)
    },
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
    evidencePosture: hello.evidence.posture,
    nativeContinuumWitness: hello.evidence.nativeContinuumWitness,
    hello,
    reasons: hello.reasons
  };
}

function nonPresentInspection(args: NonPresentInspectionArgs): ContinuumRuntimeHelloInspection {
  const { code, helloPosture, message, retryHint, source, target } = args;
  const reasons = [reason(code, message, source)];
  return {
    schemaVersion: CONTINUUM_RUNTIME_HELLO_INSPECTION_SCHEMA_VERSION,
    target: target.target,
    ...targetLabelObject(target),
    connectionMode: target.connectionMode,
    hostKind: target.hostKind,
    appKind: target.appKind,
    readOnly: true,
    helloPosture,
    evidencePosture: evidencePostureFromTarget(target.runtimeBoundaryEvidence.posture),
    nativeContinuumWitness: target.runtimeBoundaryEvidence.nativeContinuumWitness,
    reason: message,
    reasons,
    ...(retryHint === undefined ? {} : { retryHint })
  };
}

function inspectEchoHello(target: LiveTargetInspection): ContinuumRuntimeHelloInspection {
  if (target.adapterPosture === "OBSTRUCTED") {
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
  target: LiveTargetInspection
): ContinuumRuntimeHelloInspection {
  if (target.connectionMode === "git-warp") {
    return presentInspection(target, translatedGitWarpHello(target));
  }

  if (target.connectionMode === "echo-root") {
    return inspectEchoHello(target);
  }

  return inspectDescriptorOnlyHello(target);
}

export function inspectRuntimeHello(
  input?: LiveTargetInspectionInput
): ContinuumRuntimeHelloInspection[] {
  return inspectLiveTargets(input).map(inspectTargetRuntimeHello);
}

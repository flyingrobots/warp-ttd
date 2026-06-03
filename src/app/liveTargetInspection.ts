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

export type LiveTargetName = "jedit" | "graft";
export type LiveTargetRootPosture = "PRESENT" | "MISSING";
export type LiveTargetAdapterPosture =
  | "CONFIGURED"
  | "UNAVAILABLE"
  | "UNSUPPORTED"
  | "OBSTRUCTED";
export type LiveTargetAdmissionChainPosture = "UNAVAILABLE";
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

export interface LiveTargetInspection {
  target: LiveTargetName;
  hostKind: "ECHO" | "GIT_WARP";
  appKind: "live Echo app" | "live git-warp app";
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: LiveTargetAdapterPosture;
  admissionChainPosture: LiveTargetAdmissionChainPosture;
  runtimeBoundaryEvidence: LiveTargetRuntimeBoundaryEvidence;
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

const DEFAULT_JEDIT_ROOT = "../jedit";
const DEFAULT_GRAFT_ROOT = "../graft";
const GRAFT_GRAPH_NAME = "graft-ast";

function resolveRoot(envName: string, fallback: string): string {
  return path.resolve(process.env[envName] ?? fallback);
}

function rootPosture(rootPath: string): LiveTargetRootPosture {
  return fs.existsSync(rootPath) ? "PRESENT" : "MISSING";
}

export function liveTargetRootsFromEnv(): LiveTargetRoots {
  return {
    graftRoot: resolveRoot("WARP_TTD_GRAFT_ROOT", DEFAULT_GRAFT_ROOT),
    jeditRoot: resolveRoot("WARP_TTD_JEDIT_ROOT", DEFAULT_JEDIT_ROOT)
  };
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

function inspectJeditTarget(roots: LiveTargetRoots): LiveTargetInspection {
  const posture = rootPosture(roots.jeditRoot);
  const echoAdapterProbe = inspectLiveEchoAdapterProbe({
    rootPath: roots.jeditRoot,
    rootPosture: posture
  });

  return {
    target: "jedit",
    hostKind: "ECHO",
    appKind: "live Echo app",
    rootPath: roots.jeditRoot,
    rootPosture: posture,
    adapterPosture: adapterPostureFromEchoProbe(echoAdapterProbe),
    admissionChainPosture: "UNAVAILABLE",
    runtimeBoundaryEvidence: unavailableRuntimeBoundaryEvidence(),
    readOnly: true,
    echoAdapterProbe,
    sessionFamilyIntake: inspectLiveEchoFamilyIntake({
      rootPath: roots.jeditRoot,
      rootPosture: posture
    }),
    reason: "Echo live adapter, admission-chain publication, and native Continuum evidence are not wired into WARP TTD yet."
  };
}

function inspectGraftTarget(roots: LiveTargetRoots): LiveTargetInspection {
  return {
    target: "graft",
    hostKind: "GIT_WARP",
    appKind: "live git-warp app",
    rootPath: roots.graftRoot,
    rootPosture: rootPosture(roots.graftRoot),
    adapterPosture: "CONFIGURED",
    admissionChainPosture: "UNAVAILABLE",
    runtimeBoundaryEvidence: graftTranslatedSubstrateEvidence(),
    readOnly: true,
    graphName: GRAFT_GRAPH_NAME,
    reason: "graft uses the existing git-warp adapter path; git-warp facts are translated substrate evidence, not native Continuum witnesshood."
  };
}

export function inspectLiveTargets(
  roots: LiveTargetRoots = liveTargetRootsFromEnv()
): LiveTargetInspection[] {
  return [
    inspectJeditTarget(roots),
    inspectGraftTarget(roots)
  ];
}

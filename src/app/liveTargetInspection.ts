import fs from "node:fs";
import path from "node:path";

export type LiveTargetName = "jedit" | "graft";
export type LiveTargetRootPosture = "PRESENT" | "MISSING";
export type LiveTargetAdapterPosture = "CONFIGURED" | "UNAVAILABLE";
export type LiveTargetAdmissionChainPosture = "UNAVAILABLE";

export interface LiveTargetInspection {
  target: LiveTargetName;
  hostKind: "ECHO" | "GIT_WARP";
  appKind: "live Echo app" | "live git-warp app";
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: LiveTargetAdapterPosture;
  admissionChainPosture: LiveTargetAdmissionChainPosture;
  readOnly: true;
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

export function inspectLiveTargets(
  roots: LiveTargetRoots = liveTargetRootsFromEnv()
): LiveTargetInspection[] {
  return [
    {
      target: "jedit",
      hostKind: "ECHO",
      appKind: "live Echo app",
      rootPath: roots.jeditRoot,
      rootPosture: rootPosture(roots.jeditRoot),
      adapterPosture: "UNAVAILABLE",
      admissionChainPosture: "UNAVAILABLE",
      readOnly: true,
      reason: "Echo live adapter and admission-chain publication are not wired into WARP TTD yet."
    },
    {
      target: "graft",
      hostKind: "GIT_WARP",
      appKind: "live git-warp app",
      rootPath: roots.graftRoot,
      rootPosture: rootPosture(roots.graftRoot),
      adapterPosture: "CONFIGURED",
      admissionChainPosture: "UNAVAILABLE",
      readOnly: true,
      graphName: GRAFT_GRAPH_NAME,
      reason: "graft uses the existing git-warp adapter path; Echo admission-chain facts are not invented for git-warp targets."
    }
  ];
}

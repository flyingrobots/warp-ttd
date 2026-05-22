import { resolveAdapter } from "./adapterRegistry.ts";
import { DebuggerSession, type SerializedSession } from "./debuggerSession.ts";
import {
  inspectLiveTargets,
  liveTargetRootsFromEnv,
  type LiveTargetInspection,
  type LiveTargetRoots,
  type LiveTargetRuntimeBoundaryEvidence,
  type LiveTargetRootPosture
} from "./liveTargetInspection.ts";
import type { HostHello } from "../protocol.ts";

export type LiveTargetSessionPosture = "PRESENT" | "OBSTRUCTED";

export interface LiveTargetSessionInspection {
  target: "graft";
  hostKind: "GIT_WARP";
  appKind: "live git-warp app";
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: "CONFIGURED";
  runtimeBoundaryEvidence: LiveTargetRuntimeBoundaryEvidence;
  readOnly: true;
  graphName: string;
  sessionPosture: LiveTargetSessionPosture;
  defaultHeadId?: string;
  hostHello?: HostHello;
  session?: SerializedSession;
  reason: string;
}

const GRAFT_GRAPH_NAME = "graft-ast";

class MissingLiveTargetRegistrationError extends Error {
  public constructor(target: string) {
    super(`${target} live target is not registered`);
    this.name = "MissingLiveTargetRegistrationError";
  }
}

function configuredGraftTarget(roots: LiveTargetRoots): LiveTargetInspection {
  const target = inspectLiveTargets(roots)
    .find((entry) => entry.target === "graft");

  if (target?.hostKind !== "GIT_WARP") {
    throw new MissingLiveTargetRegistrationError("graft");
  }

  return target;
}

function obstructedGraftSession(
  target: LiveTargetInspection,
  reason: string
): LiveTargetSessionInspection {
  return {
    target: "graft",
    hostKind: "GIT_WARP",
    appKind: "live git-warp app",
    rootPath: target.rootPath,
    rootPosture: target.rootPosture,
    adapterPosture: "CONFIGURED",
    runtimeBoundaryEvidence: target.runtimeBoundaryEvidence,
    readOnly: true,
    graphName: target.graphName ?? GRAFT_GRAPH_NAME,
    sessionPosture: "OBSTRUCTED",
    reason
  };
}

function presentGraftSession(
  target: LiveTargetInspection,
  defaultHeadId: string,
  session: DebuggerSession
): LiveTargetSessionInspection {
  return {
    target: "graft",
    hostKind: "GIT_WARP",
    appKind: "live git-warp app",
    rootPath: target.rootPath,
    rootPosture: target.rootPosture,
    adapterPosture: "CONFIGURED",
    runtimeBoundaryEvidence: target.runtimeBoundaryEvidence,
    readOnly: true,
    graphName: target.graphName ?? GRAFT_GRAPH_NAME,
    sessionPosture: "PRESENT",
    defaultHeadId,
    hostHello: session.hostHello,
    session: session.toJSON(),
    reason: "Opened graft through the git-warp adapter for read-only session inspection."
  };
}

async function inspectGraftSession(
  roots: LiveTargetRoots
): Promise<LiveTargetSessionInspection> {
  const target = configuredGraftTarget(roots);

  if (target.rootPosture !== "PRESENT") {
    return obstructedGraftSession(
      target,
      "graft root is missing; no git-warp session was opened."
    );
  }

  try {
    const { adapter, defaultHeadId } = await resolveAdapter({
      kind: "git-warp",
      repoPath: target.rootPath,
      graphName: target.graphName ?? GRAFT_GRAPH_NAME
    });
    const session = await DebuggerSession.create(adapter, defaultHeadId);

    return presentGraftSession(target, defaultHeadId, session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return obstructedGraftSession(
      target,
      `graft git-warp session could not be opened: ${message}`
    );
  }
}

export async function inspectLiveTargetSessions(
  roots: LiveTargetRoots = liveTargetRootsFromEnv()
): Promise<LiveTargetSessionInspection[]> {
  return [await inspectGraftSession(roots)];
}

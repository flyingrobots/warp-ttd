import { resolveAdapter } from "./adapterRegistry.ts";
import { DebuggerSession, type SerializedSession } from "./debuggerSession.ts";
import {
  inspectLiveTargets,
  liveTargetRootsFromEnv,
  type LiveTargetInspection,
  type LiveTargetAdapterPosture,
  type LiveTargetRoots,
  type LiveTargetRuntimeBoundaryEvidence,
  type LiveTargetRootPosture
} from "./liveTargetInspection.ts";
import type { EchoAdapterProbeInspection } from "./echoAdapterProbe.ts";
import type { LiveEchoFamilyIntakeInspection } from "./liveEchoFamilyIntake.ts";
import type { HostHello } from "../protocol.ts";

export type LiveTargetSessionPosture = "PRESENT" | "OBSTRUCTED";

export type LiveTargetSessionInspection =
  | LiveEchoTargetSessionInspection
  | GraftLiveTargetSessionInspection;

export interface LiveEchoTargetSessionInspection {
  target: "jedit";
  hostKind: "ECHO";
  appKind: "live Echo app";
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: LiveTargetAdapterPosture;
  runtimeBoundaryEvidence: LiveTargetRuntimeBoundaryEvidence;
  readOnly: true;
  sessionPosture: "OBSTRUCTED";
  echoAdapterProbe: EchoAdapterProbeInspection;
  sessionFamilyIntake: LiveEchoFamilyIntakeInspection;
  reason: string;
}

export interface GraftLiveTargetSessionInspection {
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

function configuredJeditTarget(roots: LiveTargetRoots): LiveTargetInspection {
  const target = inspectLiveTargets(roots)
    .find((entry) => entry.target === "jedit");

  if (target?.hostKind !== "ECHO") {
    throw new MissingLiveTargetRegistrationError("jedit");
  }

  return target;
}

function jeditSessionFamilyIntake(
  target: LiveTargetInspection
): LiveEchoFamilyIntakeInspection {
  if (target.sessionFamilyIntake === undefined) {
    throw new MissingLiveTargetRegistrationError("jedit family intake");
  }

  return target.sessionFamilyIntake;
}

function jeditEchoAdapterProbe(
  target: LiveTargetInspection
): EchoAdapterProbeInspection {
  if (target.echoAdapterProbe === undefined) {
    throw new MissingLiveTargetRegistrationError("jedit Echo adapter probe");
  }

  return target.echoAdapterProbe;
}

function obstructedJeditSession(
  target: LiveTargetInspection
): LiveEchoTargetSessionInspection {
  return {
    target: "jedit",
    hostKind: "ECHO",
    appKind: "live Echo app",
    rootPath: target.rootPath,
    rootPosture: target.rootPosture,
    adapterPosture: target.adapterPosture,
    runtimeBoundaryEvidence: target.runtimeBoundaryEvidence,
    readOnly: true,
    sessionPosture: "OBSTRUCTED",
    echoAdapterProbe: jeditEchoAdapterProbe(target),
    sessionFamilyIntake: jeditSessionFamilyIntake(target),
    reason: "jedit live Echo session adapter is not wired yet; only read-only family intake posture was inspected."
  };
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

function inspectJeditSession(roots: LiveTargetRoots): LiveEchoTargetSessionInspection {
  return obstructedJeditSession(configuredJeditTarget(roots));
}

export async function inspectLiveTargetSessions(
  roots: LiveTargetRoots = liveTargetRootsFromEnv()
): Promise<LiveTargetSessionInspection[]> {
  return [
    inspectJeditSession(roots),
    await inspectGraftSession(roots)
  ];
}

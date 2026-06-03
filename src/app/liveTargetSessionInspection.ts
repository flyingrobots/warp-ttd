import { resolveAdapter } from "./adapterRegistry.ts";
import { DebuggerSession, type SerializedSession } from "./debuggerSession.ts";
import {
  inspectLiveTargets,
  liveTargetDescriptorsFromEnv,
  type LiveTargetInspection,
  type LiveTargetAdapterPosture,
  type LiveTargetInspectionInput,
  type LiveTargetRuntimeBoundaryEvidence,
  type LiveTargetRootPosture
} from "./liveTargetInspection.ts";
import type { EchoAdapterProbeInspection } from "./echoAdapterProbe.ts";
import type { LiveEchoFamilyIntakeInspection } from "./liveEchoFamilyIntake.ts";
import type { HostHello } from "../protocol.ts";

export type LiveTargetSessionPosture = "PRESENT" | "OBSTRUCTED";

export type LiveTargetSessionInspection =
  | LiveEchoTargetSessionInspection
  | GitWarpLiveTargetSessionInspection
  | DescriptorOnlyLiveTargetSessionInspection;

interface LiveTargetSessionBase {
  target: string;
  targetLabel?: string;
  connectionMode: string;
  appKind: string;
  rootPath: string;
  rootPosture: LiveTargetRootPosture;
  adapterPosture: LiveTargetAdapterPosture;
  runtimeBoundaryEvidence: LiveTargetRuntimeBoundaryEvidence;
  readOnly: true;
  sessionPosture: LiveTargetSessionPosture;
  defaultHeadId?: string;
  hostHello?: HostHello;
  session?: SerializedSession;
  reason: string;
}

export interface LiveEchoTargetSessionInspection extends LiveTargetSessionBase {
  hostKind: "ECHO";
  sessionPosture: "OBSTRUCTED";
  echoAdapterProbe: EchoAdapterProbeInspection;
  sessionFamilyIntake: LiveEchoFamilyIntakeInspection;
}

export interface GitWarpLiveTargetSessionInspection extends LiveTargetSessionBase {
  hostKind: "GIT_WARP";
  adapterPosture: "CONFIGURED";
  graphName: string;
  defaultHeadId?: string;
  hostHello?: HostHello;
  session?: SerializedSession;
}

export interface DescriptorOnlyLiveTargetSessionInspection extends LiveTargetSessionBase {
  hostKind: "CONTINUUM";
}

const GRAFT_GRAPH_NAME = "graft-ast";

class MissingLiveTargetRegistrationError extends Error {
  public constructor(target: string) {
    super(`${target} live target is not registered`);
    this.name = "MissingLiveTargetRegistrationError";
  }
}

function targetLabelObject(
  target: LiveTargetInspection
): Pick<LiveTargetSessionBase, "targetLabel"> | object {
  return target.targetLabel === undefined ? {} : { targetLabel: target.targetLabel };
}

function liveTargetSessionBase(
  target: LiveTargetInspection,
  sessionPosture: LiveTargetSessionPosture,
  reason: string
): LiveTargetSessionBase {
  return {
    target: target.target,
    ...targetLabelObject(target),
    connectionMode: target.connectionMode,
    appKind: target.appKind,
    rootPath: target.rootPath,
    rootPosture: target.rootPosture,
    adapterPosture: target.adapterPosture,
    runtimeBoundaryEvidence: target.runtimeBoundaryEvidence,
    readOnly: true,
    sessionPosture,
    reason
  };
}

function targetSessionFamilyIntake(
  target: LiveTargetInspection
): LiveEchoFamilyIntakeInspection {
  if (target.sessionFamilyIntake === undefined) {
    throw new MissingLiveTargetRegistrationError(`${target.target} family intake`);
  }

  return target.sessionFamilyIntake;
}

function targetEchoAdapterProbe(
  target: LiveTargetInspection
): EchoAdapterProbeInspection {
  if (target.echoAdapterProbe === undefined) {
    throw new MissingLiveTargetRegistrationError(`${target.target} Echo adapter probe`);
  }

  return target.echoAdapterProbe;
}

function obstructedEchoSession(
  target: LiveTargetInspection
): LiveEchoTargetSessionInspection {
  return {
    ...liveTargetSessionBase(
      target,
      "OBSTRUCTED",
      `${target.target} live Echo session adapter is not wired yet; only read-only family intake posture was inspected.`
    ),
    hostKind: "ECHO",
    sessionPosture: "OBSTRUCTED",
    echoAdapterProbe: targetEchoAdapterProbe(target),
    sessionFamilyIntake: targetSessionFamilyIntake(target)
  };
}

function obstructedGitWarpSession(
  target: LiveTargetInspection,
  reason: string
): GitWarpLiveTargetSessionInspection {
  return {
    ...liveTargetSessionBase(target, "OBSTRUCTED", reason),
    hostKind: "GIT_WARP",
    adapterPosture: "CONFIGURED",
    graphName: target.graphName ?? GRAFT_GRAPH_NAME
  };
}

function presentGitWarpSession(
  target: LiveTargetInspection,
  defaultHeadId: string,
  session: DebuggerSession
): GitWarpLiveTargetSessionInspection {
  return {
    ...liveTargetSessionBase(
      target,
      "PRESENT",
      `Opened ${target.target} through the git-warp adapter for read-only session inspection.`
    ),
    hostKind: "GIT_WARP",
    adapterPosture: "CONFIGURED",
    graphName: target.graphName ?? GRAFT_GRAPH_NAME,
    defaultHeadId,
    hostHello: session.hostHello,
    session: session.toJSON()
  };
}

async function inspectGitWarpSession(
  target: LiveTargetInspection
): Promise<LiveTargetSessionInspection> {
  if (target.rootPosture !== "PRESENT") {
    return obstructedGitWarpSession(
      target,
      `${target.target} root is missing; no git-warp session was opened.`
    );
  }

  try {
    const { adapter, defaultHeadId } = await resolveAdapter({
      kind: "git-warp",
      repoPath: target.rootPath,
      graphName: target.graphName ?? GRAFT_GRAPH_NAME
    });
    const session = await DebuggerSession.create(adapter, defaultHeadId);

    return presentGitWarpSession(target, defaultHeadId, session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return obstructedGitWarpSession(
      target,
      `${target.target} git-warp session could not be opened: ${message}`
    );
  }
}

function descriptorOnlySession(
  target: LiveTargetInspection
): DescriptorOnlyLiveTargetSessionInspection {
  return {
    ...liveTargetSessionBase(
      target,
      "OBSTRUCTED",
      `${target.target} is registered, but runtime handshake session inspection is not implemented in this cycle.`
    ),
    hostKind: "CONTINUUM",
    adapterPosture: target.adapterPosture
  };
}

async function inspectLiveTargetSession(
  target: LiveTargetInspection
): Promise<LiveTargetSessionInspection> {
  switch (target.hostKind) {
    case "ECHO":
      return obstructedEchoSession(target);
    case "GIT_WARP":
      return inspectGitWarpSession(target);
    case "CONTINUUM":
      return descriptorOnlySession(target);
  }
}

export async function inspectLiveTargetSessions(
  input: LiveTargetInspectionInput = liveTargetDescriptorsFromEnv()
): Promise<LiveTargetSessionInspection[]> {
  return Promise.all(inspectLiveTargets(input).map(inspectLiveTargetSession));
}

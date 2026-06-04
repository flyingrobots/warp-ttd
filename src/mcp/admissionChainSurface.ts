import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { TtdHostAdapter } from "../adapter.ts";
import {
  buildAdmissionChainReadModel,
  buildReadingInspection,
  type AdmissionChainReadModel,
  type AdmissionFact,
  type AdmissionFactPosture,
  type JsonObject,
  type JsonValue,
  type ReadingInspection
} from "../app/admissionChainReadModel.ts";
import { DebuggerSession } from "../app/debuggerSession.ts";
import { inspectLiveTargets } from "../app/liveTargetInspection.ts";
import { inspectRuntimeHello } from "../app/runtimeHelloInspection.ts";
import type { AdapterCapability } from "../protocol.ts";

export type {
  AdmissionChainReadModel,
  AdmissionFact,
  AdmissionFactPosture,
  JsonObject,
  JsonValue,
  ReadingInspection
};

export const MCP_ADMISSION_TOOL_NAMES = {
  inspectSession: "warp_ttd.inspect_session",
  inspectAdapterCapabilities: "warp_ttd.inspect_adapter_capabilities",
  inspectReadings: "warp_ttd.inspect_readings",
  inspectAdmissionChain: "warp_ttd.inspect_admission_chain",
  inspectLiveTargets: "warp_ttd.inspect_live_targets",
  inspectRuntimeHello: "warp_ttd.inspect_runtime_hello"
} as const;

export type McpAdmissionToolName =
  typeof MCP_ADMISSION_TOOL_NAMES[keyof typeof MCP_ADMISSION_TOOL_NAMES];

export interface AdapterCapabilitiesInspection extends JsonObject {
  hostHello: JsonObject;
  capabilities: readonly AdapterCapability[];
}

export interface LiveTargetsInspection extends JsonObject {
  targets: readonly JsonObject[];
}

export interface RuntimeHelloInspection extends JsonObject {
  runtimeHello: readonly JsonObject[];
}

export interface McpAdmissionChainServerOptions {
  adapter: TtdHostAdapter;
  headId: string;
}

interface ReadOnlyToolRegistration {
  name: McpAdmissionToolName;
  title: string;
  description: string;
  callback: () => Promise<JsonObject> | JsonObject;
}

export function inspectAdapterCapabilities(
  session: DebuggerSession
): AdapterCapabilitiesInspection {
  const hostHello = session.hostHello;

  return {
    hostHello: {
      hostKind: hostHello.hostKind,
      hostVersion: hostHello.hostVersion,
      protocolVersion: hostHello.protocolVersion,
      schemaId: hostHello.schemaId,
      capabilities: [...hostHello.capabilities]
    },
    capabilities: session.adapterCapabilities
  };
}

export function inspectReadings(session: DebuggerSession): ReadingInspection {
  return buildReadingInspection(session);
}

export function inspectAdmissionChain(session: DebuggerSession): AdmissionChainReadModel {
  return buildAdmissionChainReadModel(session);
}

export function inspectLiveTargetPosture(): LiveTargetsInspection {
  return {
    targets: inspectLiveTargets().map((target) => jsonObject(target))
  };
}

export async function inspectRuntimeHelloPosture(): Promise<RuntimeHelloInspection> {
  return {
    runtimeHello: (await inspectRuntimeHello()).map((inspection) => jsonObject(inspection))
  };
}

function toolResult(data: JsonObject): CallToolResult {
  return {
    structuredContent: data,
    content: [
      {
        type: "text",
        text: JSON.stringify(data)
      }
    ]
  };
}

function registerReadOnlyTool(
  server: McpServer,
  registration: ReadOnlyToolRegistration
): void {
  server.registerTool(
    registration.name,
    {
      title: registration.title,
      description: registration.description,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => toolResult(await registration.callback())
  );
}

function jsonObject(value: object): JsonObject {
  return value as JsonObject;
}

function sessionTool(getSession: () => Promise<DebuggerSession>): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectSession,
    title: "Inspect Session",
    description:
      "Return the current serialized DebuggerSession without changing playback state.",
    callback: async () => ({ session: jsonObject((await getSession()).toJSON()) })
  };
}

function capabilityTool(getSession: () => Promise<DebuggerSession>): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectAdapterCapabilities,
    title: "Inspect Adapter Capabilities",
    description:
      "Return the cached host hello and adapter capabilities from session creation.",
    callback: async () => inspectAdapterCapabilities(await getSession())
  };
}

function readingTool(getSession: () => Promise<DebuggerSession>): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectReadings,
    title: "Inspect Readings",
    description:
      "Return current basis, reading posture, runtime source, and neighborhood reading facts.",
    callback: async () => inspectReadings(await getSession())
  };
}

function admissionChainTool(
  getSession: () => Promise<DebuggerSession>
): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectAdmissionChain,
    title: "Inspect Admission Chain",
    description:
      "Return present or absent artifact, grant, ticket, witness, receipt, and reading posture.",
    callback: async () => inspectAdmissionChain(await getSession())
  };
}

function liveTargetsTool(): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectLiveTargets,
    title: "Inspect Live Targets",
    description:
      "Return read-only live target posture, including runtime-boundary evidence status.",
    callback: () => inspectLiveTargetPosture()
  };
}

function runtimeHelloTool(): ReadOnlyToolRegistration {
  return {
    name: MCP_ADMISSION_TOOL_NAMES.inspectRuntimeHello,
    title: "Inspect Runtime Hello",
    description:
      "Return read-only Continuum runtime hello posture for configured targets.",
    callback: () => inspectRuntimeHelloPosture()
  };
}

function mcpToolRegistrations(
  getSession: () => Promise<DebuggerSession>
): readonly ReadOnlyToolRegistration[] {
  return [
    sessionTool(getSession),
    capabilityTool(getSession),
    readingTool(getSession),
    admissionChainTool(getSession),
    liveTargetsTool(),
    runtimeHelloTool()
  ];
}

function registerAdmissionTools(
  server: McpServer,
  getSession: () => Promise<DebuggerSession>
): void {
  for (const tool of mcpToolRegistrations(getSession)) {
    registerReadOnlyTool(server, tool);
  }
}

function createSessionResolver(
  options: McpAdmissionChainServerOptions
): () => Promise<DebuggerSession> {
  let session: DebuggerSession | undefined;
  let sessionPromise: Promise<DebuggerSession> | undefined;

  async function initializeSession(): Promise<DebuggerSession> {
    try {
      const created = await DebuggerSession.create(options.adapter, options.headId);
      session = created;
      return created;
    } catch (err) {
      sessionPromise = undefined;
      throw err;
    }
  }

  return async function getSession(): Promise<DebuggerSession> {
    if (session !== undefined) return session;

    sessionPromise ??= initializeSession();
    return sessionPromise;
  };
}

export function createMcpAdmissionChainServer(
  options: McpAdmissionChainServerOptions
): McpServer {
  const server = new McpServer(
    { name: "warp-ttd", version: "0.1.0" },
    {
      instructions:
        "Read-only WARP TTD inspection over DebuggerSession and admission-chain posture."
    }
  );
  const getSession = createSessionResolver(options);

  registerAdmissionTools(server, getSession);

  return server;
}

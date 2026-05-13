import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { TtdHostAdapter } from "../adapter.ts";
import { DebuggerSession } from "../app/debuggerSession.ts";
import type { AdapterCapability, ReceiptSummary } from "../protocol.ts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const MCP_ADMISSION_TOOL_NAMES = {
  inspectSession: "warp_ttd.inspect_session",
  inspectAdapterCapabilities: "warp_ttd.inspect_adapter_capabilities",
  inspectReadings: "warp_ttd.inspect_readings",
  inspectAdmissionChain: "warp_ttd.inspect_admission_chain"
} as const;

export type McpAdmissionToolName =
  typeof MCP_ADMISSION_TOOL_NAMES[keyof typeof MCP_ADMISSION_TOOL_NAMES];

export type AdmissionFactPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";

export interface AdmissionFact<T extends JsonValue = JsonValue> extends JsonObject {
  posture: AdmissionFactPosture;
  reason?: string;
  value?: T;
}

export interface AdapterCapabilitiesInspection extends JsonObject {
  hostHello: JsonObject;
  capabilities: readonly AdapterCapability[];
}

export interface ReadingInspection extends JsonObject {
  basisRef: string;
  observerPlanRef: string | null;
  readingEnvelopeRef: string | null;
  readingPosture: "PRESENT";
  witnessRef: string | null;
  receiptRefs: string[];
  runtimeSource: string;
  aperture: string | null;
  budgetPosture: AdmissionFact;
  headId: string;
  frameIndex: number;
  laneIds: string[];
  neighborhoodSiteId: string;
  neighborhoodOutcome: string;
}

export interface AdmissionChainInspection extends JsonObject {
  basis: AdmissionFact<JsonObject>;
  artifactRegistration: AdmissionFact;
  opticArtifactHandle: AdmissionFact;
  opticAdmissionRequirements: AdmissionFact;
  capabilityGrant: AdmissionFact;
  capabilityPresentation: AdmissionFact;
  admissionTicket: AdmissionFact;
  lawWitness: AdmissionFact;
  receipts: AdmissionFact<JsonObject>;
  reading: AdmissionFact<ReadingInspection>;
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

function absent<T extends JsonValue = JsonValue>(reason: string): AdmissionFact<T> {
  return { posture: "ABSENT", reason };
}

function present<T extends JsonValue>(value: T): AdmissionFact<T> {
  return { posture: "PRESENT", value };
}

function basisRef(session: DebuggerSession): string {
  return `${session.activeHeadId}@frame:${session.snapshot.frame.frameIndex.toString()}`;
}

function receiptRefs(receipts: readonly ReceiptSummary[]): string[] {
  return receipts.map((receipt) => receipt.receiptId);
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
  const snapshot = session.snapshot;

  return {
    basisRef: basisRef(session),
    observerPlanRef: null,
    readingEnvelopeRef: null,
    readingPosture: "PRESENT",
    witnessRef: null,
    receiptRefs: receiptRefs(snapshot.receipts),
    runtimeSource: snapshot.execCtx.mode,
    aperture: snapshot.execCtx.apertureId ?? null,
    budgetPosture: absent("Host adapter did not provide budget posture."),
    headId: session.activeHeadId,
    frameIndex: snapshot.frame.frameIndex,
    laneIds: snapshot.frame.lanes.map((lane) => lane.laneId),
    neighborhoodSiteId: snapshot.neighborhoodCore.siteId,
    neighborhoodOutcome: snapshot.neighborhoodCore.outcome
  };
}

function receiptFact(receipts: readonly ReceiptSummary[]): AdmissionChainInspection["receipts"] {
  const ids = receiptRefs(receipts);

  if (ids.length === 0) {
    return absent("No receipt facts are present at the current frame.");
  }

  return present({
    count: ids.length,
    receiptIds: ids
  });
}

const ABSENT_REASONS = {
  artifactRegistration: "Host adapter did not provide registered artifact facts.",
  opticArtifactHandle:
    "Host adapter did not provide an Echo-owned optic artifact handle.",
  opticAdmissionRequirements:
    "Host adapter did not provide optic admission requirements.",
  capabilityGrant: "Host adapter did not provide capability grant posture.",
  capabilityPresentation:
    "Host adapter did not provide capability presentation posture.",
  admissionTicket:
    "Host adapter did not provide admission ticket or obstruction posture.",
  lawWitness: "Host adapter did not provide law witness posture."
} as const;

type AbsentAdmissionFacts = Pick<
  AdmissionChainInspection,
  | "artifactRegistration"
  | "opticArtifactHandle"
  | "opticAdmissionRequirements"
  | "capabilityGrant"
  | "capabilityPresentation"
  | "admissionTicket"
  | "lawWitness"
>;

function absentAdmissionFacts(): AbsentAdmissionFacts {
  return {
    artifactRegistration: absent(ABSENT_REASONS.artifactRegistration),
    opticArtifactHandle: absent(ABSENT_REASONS.opticArtifactHandle),
    opticAdmissionRequirements: absent(ABSENT_REASONS.opticAdmissionRequirements),
    capabilityGrant: absent(ABSENT_REASONS.capabilityGrant),
    capabilityPresentation: absent(ABSENT_REASONS.capabilityPresentation),
    admissionTicket: absent(ABSENT_REASONS.admissionTicket),
    lawWitness: absent(ABSENT_REASONS.lawWitness)
  };
}

export function inspectAdmissionChain(session: DebuggerSession): AdmissionChainInspection {
  const snapshot = session.snapshot;

  return {
    basis: present({
      basisRef: basisRef(session),
      headId: session.activeHeadId,
      frameIndex: snapshot.frame.frameIndex
    }),
    ...absentAdmissionFacts(),
    receipts: receiptFact(snapshot.receipts),
    reading: present(inspectReadings(session))
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

function mcpToolRegistrations(
  getSession: () => Promise<DebuggerSession>
): readonly ReadOnlyToolRegistration[] {
  return [
    sessionTool(getSession),
    capabilityTool(getSession),
    readingTool(getSession),
    admissionChainTool(getSession)
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

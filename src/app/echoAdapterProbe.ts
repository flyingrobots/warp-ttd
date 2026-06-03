import fs from "node:fs";
import path from "node:path";

import type { JsonObject, JsonValue } from "./generatedFamilyIngress.ts";

export const LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION =
  "warp-ttd.echo-adapter-probe.v1";
export const LIVE_ECHO_ADAPTER_PROBE_MANIFEST =
  ".warp-ttd/echo-adapter-probe.json";

export type EchoAdapterProbeRootPosture = "PRESENT" | "MISSING";
export type EchoAdapterProbePosture =
  | "UNAVAILABLE"
  | "PRESENT"
  | "UNSUPPORTED"
  | "OBSTRUCTED";
export type EchoAdapterBridgePosture =
  | "ROOT_UNAVAILABLE"
  | "BRIDGE_ABSENT"
  | "BRIDGE_PRESENT"
  | "ABI_UNSUPPORTED"
  | "PROBE_OBSTRUCTED";
export type EchoAdapterSessionProbePosture =
  | "NOT_OPENED"
  | "SESSION_OBSTRUCTED";
export type EchoAdapterProbeTransport = "wasm" | "native";

export interface EchoAdapterBridgeDescriptor extends JsonObject {
  readonly schemaVersion: typeof LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION;
  readonly bridgeKind: "echo";
  readonly abiVersion: number;
  readonly transport: EchoAdapterProbeTransport;
}

export interface EchoAdapterProbeInspection extends JsonObject {
  readonly schemaVersion: typeof LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION;
  readonly target: string;
  readonly hostKind: "ECHO";
  readonly rootPath: string;
  readonly rootPosture: EchoAdapterProbeRootPosture;
  readonly bridgeManifestPath: string;
  readonly bridgePosture: EchoAdapterBridgePosture;
  readonly probePosture: EchoAdapterProbePosture;
  readonly sessionProbePosture: EchoAdapterSessionProbePosture;
  readonly supportedAbiVersions: readonly number[];
  readonly bridge: EchoAdapterBridgeDescriptor | null;
  readonly readOnly: true;
  readonly reason: string;
}

interface EchoAdapterProbeArgs {
  readonly rootPath: string;
  readonly rootPosture: EchoAdapterProbeRootPosture;
  readonly targetId?: string;
}

interface ManifestRead {
  readonly bridgePosture: EchoAdapterBridgePosture;
  readonly probePosture: EchoAdapterProbePosture;
  readonly bridge: EchoAdapterBridgeDescriptor | null;
  readonly reason: string;
}

const SUPPORTED_ECHO_ADAPTER_ABI_VERSIONS = [1] as const;
const SUPPORTED_TRANSPORTS = new Set<EchoAdapterProbeTransport>([
  "native",
  "wasm"
]);

function bridgeManifestPath(rootPath: string): string {
  return path.join(rootPath, LIVE_ECHO_ADAPTER_PROBE_MANIFEST);
}

function errorMessage(error: Error | undefined): string {
  return error?.message ?? "unknown probe descriptor read error";
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  data: JsonObject,
  field: string
): string | null {
  const value = data[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerField(
  data: JsonObject,
  field: string
): number | null {
  const value = data[field];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isSupportedTransport(
  value: string
): value is EchoAdapterProbeTransport {
  return SUPPORTED_TRANSPORTS.has(value as EchoAdapterProbeTransport);
}

function isSupportedAbiVersion(version: number): boolean {
  return SUPPORTED_ECHO_ADAPTER_ABI_VERSIONS.includes(
    version as typeof SUPPORTED_ECHO_ADAPTER_ABI_VERSIONS[number]
  );
}

function supportedAbiVersions(): number[] {
  return [...SUPPORTED_ECHO_ADAPTER_ABI_VERSIONS];
}

function obstructed(reason: string): ManifestRead {
  return {
    bridge: null,
    bridgePosture: "PROBE_OBSTRUCTED",
    probePosture: "OBSTRUCTED",
    reason
  };
}

function unsupported(reason: string): ManifestRead {
  return {
    bridge: null,
    bridgePosture: "ABI_UNSUPPORTED",
    probePosture: "UNSUPPORTED",
    reason
  };
}

function presentBridge(bridge: EchoAdapterBridgeDescriptor): ManifestRead {
  return {
    bridge,
    bridgePosture: "BRIDGE_PRESENT",
    probePosture: "PRESENT",
    reason:
      "Supported Echo adapter bridge descriptor is present; live Echo session open remains obstructed in WARP TTD."
  };
}

function descriptorIdentityObstruction(data: JsonObject): ManifestRead | null {
  const schemaVersion = stringField(data, "schemaVersion");
  if (schemaVersion !== LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION) {
    return obstructed("Echo adapter probe descriptor has an unsupported schemaVersion.");
  }

  const bridgeKind = stringField(data, "bridgeKind");
  if (bridgeKind !== "echo") {
    return obstructed("Echo adapter probe descriptor must declare bridgeKind echo.");
  }

  return null;
}

function descriptorAbiVersion(data: JsonObject): ManifestRead | number {
  const abiVersion = integerField(data, "abiVersion");
  if (abiVersion === null) {
    return obstructed("Echo adapter probe descriptor must declare integer abiVersion.");
  }

  if (!isSupportedAbiVersion(abiVersion)) {
    return unsupported(
      `Unsupported Echo adapter ABI ${abiVersion.toString()}; supported ABI versions: ${supportedAbiVersions().join(", ")}.`
    );
  }

  return abiVersion;
}

function descriptorTransport(
  data: JsonObject
): ManifestRead | EchoAdapterProbeTransport {
  const transport = stringField(data, "transport");
  if (transport === null) {
    return obstructed("Echo adapter probe descriptor must declare transport.");
  }

  if (!isSupportedTransport(transport)) {
    return unsupported(`Unsupported Echo adapter transport: ${transport}.`);
  }

  return transport;
}

function isManifestRead(
  value: ManifestRead | number | EchoAdapterProbeTransport
): value is ManifestRead {
  return typeof value === "object";
}

function bridgeDescriptorFromJson(data: JsonObject): ManifestRead {
  const identity = descriptorIdentityObstruction(data);
  if (identity !== null) return identity;

  const abiVersion = descriptorAbiVersion(data);
  if (isManifestRead(abiVersion)) return abiVersion;

  const transport = descriptorTransport(data);
  if (isManifestRead(transport)) return transport;

  return presentBridge({
    schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
    bridgeKind: "echo",
    abiVersion,
    transport
  });
}

function readPresentManifest(pathname: string): ManifestRead {
  try {
    const parsed = JSON.parse(fs.readFileSync(pathname, "utf-8")) as JsonValue;

    if (!isJsonObject(parsed)) {
      return obstructed("Echo adapter probe descriptor must be a JSON object.");
    }

    return bridgeDescriptorFromJson(parsed);
  } catch (error) {
    return obstructed(`Echo adapter probe descriptor could not be read: ${errorMessage(
      error instanceof Error ? error : undefined
    )}`);
  }
}

function targetId(args: EchoAdapterProbeArgs): string {
  return args.targetId ?? "jedit";
}

function readManifest(args: EchoAdapterProbeArgs): ManifestRead {
  if (args.rootPosture === "MISSING") {
    return {
      bridge: null,
      bridgePosture: "ROOT_UNAVAILABLE",
      probePosture: "UNAVAILABLE",
      reason: `${targetId(args)} root is missing; no Echo adapter bridge was probed.`
    };
  }

  const pathname = bridgeManifestPath(args.rootPath);
  if (!fs.existsSync(pathname)) {
    return {
      bridge: null,
      bridgePosture: "BRIDGE_ABSENT",
      probePosture: "UNAVAILABLE",
      reason: `${targetId(args)} Echo adapter bridge descriptor is not present.`
    };
  }

  return readPresentManifest(pathname);
}

function sessionProbePosture(
  bridgePosture: EchoAdapterBridgePosture
): EchoAdapterSessionProbePosture {
  return bridgePosture === "BRIDGE_PRESENT"
    ? "SESSION_OBSTRUCTED"
    : "NOT_OPENED";
}

export function inspectLiveEchoAdapterProbe(
  args: EchoAdapterProbeArgs
): EchoAdapterProbeInspection {
  const manifest = readManifest(args);

  return {
    schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
    target: targetId(args),
    hostKind: "ECHO",
    rootPath: args.rootPath,
    rootPosture: args.rootPosture,
    bridgeManifestPath: bridgeManifestPath(args.rootPath),
    bridgePosture: manifest.bridgePosture,
    probePosture: manifest.probePosture,
    sessionProbePosture: sessionProbePosture(manifest.bridgePosture),
    supportedAbiVersions: supportedAbiVersions(),
    bridge: manifest.bridge,
    readOnly: true,
    reason: manifest.reason
  };
}

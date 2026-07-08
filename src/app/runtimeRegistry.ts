import fs from "node:fs";

import type { JsonObject, JsonValue } from "./generatedFamilyIngress.ts";
import {
  defaultLiveTargetDescriptors,
  type ContinuumDebugTargetConnection,
  type ContinuumDebugTargetDescriptor,
  type DescriptorOnlyConnectionDescriptor,
  type EchoRootConnectionDescriptor,
  type GitWarpConnectionDescriptor,
  type LiveTargetConnectionMode,
  type LiveTargetRoots
} from "./liveTargetInspection.ts";

export const RUNTIME_REGISTRY_SCHEMA_VERSION = "warp-ttd.runtime-registry.v1";
export const RUNTIME_REGISTRY_INSPECTION_SCHEMA_VERSION =
  "warp-ttd.runtime-registry-inspection.v1";
export const RUNTIME_REGISTRY_JSON_ENV = "WARP_TTD_RUNTIME_REGISTRY_JSON";
export const RUNTIME_REGISTRY_PATH_ENV = "WARP_TTD_RUNTIME_REGISTRY_PATH";

export type RuntimeRegistryMetadataValue = string | number | boolean | null;
export type RuntimeRegistryMetadata = Readonly<Record<string, RuntimeRegistryMetadataValue>>;

export interface ContinuumRuntimeRegistryEntry {
  readonly id: string;
  readonly label?: string;
  readonly appKind?: string;
  readonly connection: ContinuumDebugTargetConnection;
  readonly metadata?: RuntimeRegistryMetadata;
}

export interface ContinuumRuntimeRegistry {
  readonly schemaVersion: typeof RUNTIME_REGISTRY_SCHEMA_VERSION;
  readonly runtimes: readonly ContinuumRuntimeRegistryEntry[];
}

export type RuntimeRegistrySource =
  | { readonly kind: "DEFAULT" }
  | { readonly kind: "ENV_JSON"; readonly env: typeof RUNTIME_REGISTRY_JSON_ENV }
  | {
    readonly kind: "ENV_PATH";
    readonly env: typeof RUNTIME_REGISTRY_PATH_ENV;
    readonly path: string;
  }
  | { readonly kind: "CLI_PATH"; readonly path: string };

export type RuntimeRegistryPosture = "PRESENT" | "OBSTRUCTED";

export interface RuntimeRegistryReason {
  readonly code: string;
  readonly message: string;
  readonly source: "REGISTRY" | "WARP_TTD";
}

export interface RuntimeRegistryRedaction {
  readonly redacted: boolean;
  readonly fields: readonly string[];
}

export interface ContinuumRuntimeRegistryInspection {
  readonly schemaVersion: typeof RUNTIME_REGISTRY_INSPECTION_SCHEMA_VERSION;
  readonly registrySchemaVersion: typeof RUNTIME_REGISTRY_SCHEMA_VERSION;
  readonly source: RuntimeRegistrySource;
  readonly posture: RuntimeRegistryPosture;
  readonly entryCount: number;
  readonly redaction: RuntimeRegistryRedaction;
  readonly reasons: readonly RuntimeRegistryReason[];
}

export interface RuntimeRegistryLoadResult {
  readonly registry: ContinuumRuntimeRegistry;
  readonly inspection: ContinuumRuntimeRegistryInspection;
  readonly descriptors: readonly ContinuumDebugTargetDescriptor[];
}

interface MetadataNormalization {
  readonly metadata?: RuntimeRegistryMetadata;
  readonly redactedFields: readonly string[];
  readonly obstruction?: RuntimeRegistryReason;
}

interface EntryNormalization {
  readonly entry: ContinuumRuntimeRegistryEntry;
  readonly redactedFields: readonly string[];
  readonly reasons: readonly RuntimeRegistryReason[];
}

interface EntryFields {
  readonly id: string;
  readonly label?: string | undefined;
  readonly appKind?: string | undefined;
  readonly metadata?: RuntimeRegistryMetadata | undefined;
}

interface RegistryResultArgs {
  readonly registry: ContinuumRuntimeRegistry;
  readonly source: RuntimeRegistrySource;
  readonly reasons?: readonly RuntimeRegistryReason[];
  readonly redactedFields?: readonly string[];
}

interface ObstructedEntryNormalizationArgs {
  readonly fields: EntryFields;
  readonly message: string;
  readonly code: string;
  readonly redactedFields?: readonly string[];
}

interface AppendMetadataFieldArgs {
  readonly metadata: Record<string, RuntimeRegistryMetadataValue>;
  readonly redactedFields: string[];
  readonly key: string;
  readonly field: ReturnType<typeof metadataFieldFromJson>;
}

type DescriptorOnlyAdapterPosture = NonNullable<
  DescriptorOnlyConnectionDescriptor["adapterPosture"]
>;

function reason(
  code: string,
  message: string,
  source: RuntimeRegistryReason["source"] = "REGISTRY"
): RuntimeRegistryReason {
  return { code, message, source };
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function stringField(data: JsonObject, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectField(data: JsonObject, field: string): JsonObject | undefined {
  const value = data[field];
  return isJsonObject(value) ? value : undefined;
}

function isMetadataValue(value: JsonValue): value is RuntimeRegistryMetadataValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isSecretLikeField(field: string): boolean {
  return /(?:secret|token|password|credential|api[_-]?key|private[_-]?key)/i.test(field);
}

function optionalEntryFields(args: {
  label?: string | undefined;
  appKind?: string | undefined;
  metadata?: RuntimeRegistryMetadata | undefined;
}): Pick<ContinuumRuntimeRegistryEntry, "label" | "appKind" | "metadata"> | object {
  const fields: {
    label?: string;
    appKind?: string;
    metadata?: RuntimeRegistryMetadata;
  } = {};
  if (args.label !== undefined) fields.label = args.label;
  if (args.appKind !== undefined) fields.appKind = args.appKind;
  if (args.metadata !== undefined) fields.metadata = args.metadata;
  return fields;
}

function connectionModeFrom(value: JsonValue | undefined): LiveTargetConnectionMode | undefined {
  if (value === "echo-root") return value;
  if (value === "git-warp") return value;
  if (value === "descriptor-only") return value;
  return undefined;
}

function obstructedDescriptorOnlyConnection(reasonText: string): DescriptorOnlyConnectionDescriptor {
  return {
    mode: "descriptor-only",
    adapterPosture: "OBSTRUCTED",
    reason: reasonText
  };
}

function unsupportedDescriptorOnlyConnection(
  data: JsonObject,
  mode: string
): DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  return {
    mode: "descriptor-only",
    adapterPosture: "UNSUPPORTED",
    reason: `Connection mode ${mode} is not supported by this WARP TTD cycle.`,
    ...(rootPath === undefined ? {} : { rootPath })
  };
}

function echoRootConnectionFrom(data: JsonObject): EchoRootConnectionDescriptor | DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  if (rootPath !== undefined) return { mode: "echo-root", rootPath };
  return obstructedDescriptorOnlyConnection("echo-root runtime registry entry requires rootPath.");
}

function gitWarpConnectionFrom(data: JsonObject): GitWarpConnectionDescriptor | DescriptorOnlyConnectionDescriptor {
  const rootPath = stringField(data, "rootPath");
  if (rootPath === undefined) {
    return obstructedDescriptorOnlyConnection("git-warp runtime registry entry requires rootPath.");
  }
  const graphName = stringField(data, "graphName");
  if (graphName === undefined) {
    return obstructedDescriptorOnlyConnection("git-warp runtime registry entry requires graphName.");
  }
  return { mode: "git-warp", rootPath, graphName };
}

function isDescriptorOnlyAdapterPosture(value: JsonValue | undefined): value is DescriptorOnlyAdapterPosture {
  return value === "UNSUPPORTED" || value === "OBSTRUCTED";
}

function descriptorOnlyConnectionFields(
  data: JsonObject,
  adapterPosture: DescriptorOnlyAdapterPosture | undefined
): Omit<DescriptorOnlyConnectionDescriptor, "mode"> {
  const reasonText = stringField(data, "reason");
  const rootPath = stringField(data, "rootPath");
  return {
    ...(rootPath === undefined ? {} : { rootPath }),
    ...(reasonText === undefined ? {} : { reason: reasonText }),
    ...(adapterPosture === undefined ? {} : { adapterPosture })
  };
}

function descriptorOnlyConnectionFrom(data: JsonObject): DescriptorOnlyConnectionDescriptor {
  const adapterPosture = data["adapterPosture"];
  if (adapterPosture !== undefined && !isDescriptorOnlyAdapterPosture(adapterPosture)) {
    return obstructedDescriptorOnlyConnection(
      "descriptor-only runtime registry adapterPosture must be UNSUPPORTED or OBSTRUCTED."
    );
  }

  return {
    mode: "descriptor-only",
    ...descriptorOnlyConnectionFields(data, adapterPosture)
  };
}

function unknownModeConnection(data: JsonObject): DescriptorOnlyConnectionDescriptor {
  const mode = data["mode"];
  if (typeof mode === "string") return unsupportedDescriptorOnlyConnection(data, mode);
  return obstructedDescriptorOnlyConnection("Runtime registry connection mode must be a string.");
}

function connectionForMode(
  mode: LiveTargetConnectionMode | undefined,
  connection: JsonObject
): ContinuumDebugTargetConnection {
  switch (mode) {
    case "echo-root":
      return echoRootConnectionFrom(connection);
    case "git-warp":
      return gitWarpConnectionFrom(connection);
    case "descriptor-only":
      return descriptorOnlyConnectionFrom(connection);
    case undefined:
      return unknownModeConnection(connection);
    default:
      return unknownModeConnection(connection);
  }
}

function connectionFromJson(data: JsonObject): ContinuumDebugTargetConnection {
  const connection = objectField(data, "connection");
  if (connection === undefined) {
    return obstructedDescriptorOnlyConnection("Runtime registry entry connection must be an object.");
  }
  return connectionForMode(connectionModeFrom(connection["mode"]), connection);
}

function connectionObstructionReason(
  connection: ContinuumDebugTargetConnection
): RuntimeRegistryReason | undefined {
  if (connection.mode !== "descriptor-only") return undefined;
  if (connection.adapterPosture !== "OBSTRUCTED") return undefined;
  return reason("REGISTRY_ENTRY_CONNECTION_OBSTRUCTED", connection.reason ?? "Runtime registry entry is obstructed.");
}

function metadataObstruction(message: string): MetadataNormalization {
  return {
    redactedFields: [],
    obstruction: reason("REGISTRY_ENTRY_METADATA_INVALID", message)
  };
}

function metadataFieldFromJson(
  metadataValue: JsonValue | undefined,
  index: number,
  key: string
): {
  readonly redactedField?: string;
  readonly value?: RuntimeRegistryMetadataValue;
  readonly obstruction?: RuntimeRegistryReason;
} {
  if (isSecretLikeField(key)) {
    return { redactedField: `runtimes[${String(index)}].metadata.${key}` };
  }
  if (metadataValue === undefined || !isMetadataValue(metadataValue)) {
    return {
      obstruction: reason(
        "REGISTRY_ENTRY_METADATA_INVALID",
        `Runtime registry metadata field ${key} must be a string, number, boolean, or null.`
      )
    };
  }
  return { value: metadataValue };
}

function appendMetadataField(
  args: AppendMetadataFieldArgs
): RuntimeRegistryReason | undefined {
  if (args.field.obstruction !== undefined) return args.field.obstruction;
  if (args.field.redactedField !== undefined) args.redactedFields.push(args.field.redactedField);
  if (args.field.value !== undefined) args.metadata[args.key] = args.field.value;
  return undefined;
}

function metadataFieldsFromJson(data: JsonObject, index: number): MetadataNormalization {
  const metadata: Record<string, RuntimeRegistryMetadataValue> = {};
  const redactedFields: string[] = [];
  for (const key of Object.keys(data).sort()) {
    const field = metadataFieldFromJson(data[key], index, key);
    const obstruction = appendMetadataField({ metadata, redactedFields, key, field });
    if (obstruction !== undefined) return { redactedFields, obstruction };
  }
  return {
    ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
    redactedFields
  };
}

function metadataFromJson(
  value: JsonValue | undefined,
  index: number
): MetadataNormalization {
  if (value === undefined) return { redactedFields: [] };
  if (!isJsonObject(value)) {
    return metadataObstruction(
      "Runtime registry entry metadata must be an object with scalar JSON values."
    );
  }
  return metadataFieldsFromJson(value, index);
}

function generatedEntryId(index: number): string {
  return `warp-ttd-runtime-registry-entry-${String(index)}`;
}

function obstructionEntry(
  id: string,
  reasonText: string,
  args: {
    label?: string | undefined;
    appKind?: string | undefined;
    metadata?: RuntimeRegistryMetadata | undefined;
  } = {}
): ContinuumRuntimeRegistryEntry {
  return {
    id,
    connection: obstructedDescriptorOnlyConnection(reasonText),
    ...optionalEntryFields(args)
  };
}

function obstructedEntryNormalization(
  args: ObstructedEntryNormalizationArgs
): EntryNormalization {
  return {
    entry: obstructionEntry(args.fields.id, args.message, args.fields),
    redactedFields: args.redactedFields ?? [],
    reasons: [reason(args.code, args.message)]
  };
}

function nonObjectEntry(index: number): EntryNormalization {
  const message = "Runtime registry entry must be an object.";
  return obstructedEntryNormalization({
    fields: { id: generatedEntryId(index) },
    message,
    code: "REGISTRY_ENTRY_NOT_OBJECT"
  });
}

function entryFieldsFromJson(value: JsonObject, index: number): {
  readonly fields: EntryFields;
  readonly idWasPresent: boolean;
  readonly metadata: MetadataNormalization;
} {
  const metadata = metadataFromJson(value["metadata"], index);
  return {
    fields: {
      id: stringField(value, "id") ?? generatedEntryId(index),
      label: stringField(value, "label"),
      appKind: stringField(value, "appKind"),
      metadata: metadata.metadata
    },
    idWasPresent: stringField(value, "id") !== undefined,
    metadata
  };
}

function connectedEntryNormalization(
  value: JsonObject,
  fields: EntryFields,
  redactedFields: readonly string[]
): EntryNormalization {
  const connection = connectionFromJson(value);
  const connectionReason = connectionObstructionReason(connection);

  return {
    entry: {
      id: fields.id,
      connection,
      ...optionalEntryFields(fields)
    },
    redactedFields,
    reasons: connectionReason === undefined ? [] : [connectionReason]
  };
}

function entryFromJson(value: JsonValue, index: number): EntryNormalization {
  if (!isJsonObject(value)) return nonObjectEntry(index);

  const normalized = entryFieldsFromJson(value, index);
  if (!normalized.idWasPresent) {
    return obstructedEntryNormalization({
      fields: normalized.fields,
      message: "Runtime registry entry id must be a non-empty string.",
      code: "REGISTRY_ENTRY_ID_INVALID",
      redactedFields: normalized.metadata.redactedFields
    });
  }
  if (normalized.metadata.obstruction !== undefined) {
    return {
      entry: obstructionEntry(
        normalized.fields.id,
        normalized.metadata.obstruction.message,
        normalized.fields
      ),
      redactedFields: normalized.metadata.redactedFields,
      reasons: [normalized.metadata.obstruction]
    };
  }
  return connectedEntryNormalization(value, normalized.fields, normalized.metadata.redactedFields);
}

function duplicateRuntimeIds(
  entries: readonly ContinuumRuntimeRegistryEntry[]
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) duplicates.add(entry.id);
    seen.add(entry.id);
  }
  return duplicates;
}

function obstructDuplicateRuntimeIds(
  entries: readonly ContinuumRuntimeRegistryEntry[]
): {
  readonly entries: readonly ContinuumRuntimeRegistryEntry[];
  readonly reasons: readonly RuntimeRegistryReason[];
} {
  const duplicates = duplicateRuntimeIds(entries);
  const reasons: RuntimeRegistryReason[] = [];
  const normalized = entries.map((entry) => {
    if (!duplicates.has(entry.id)) return entry;
    const message = `Duplicate runtime registry id ${entry.id} is not allowed.`;
    reasons.push(reason("REGISTRY_ENTRY_DUPLICATE_ID", message));
    return obstructionEntry(entry.id, message, {
      label: entry.label,
      appKind: entry.appKind,
      metadata: entry.metadata
    });
  });
  return { entries: normalized, reasons };
}

function inspection(args: {
  source: RuntimeRegistrySource;
  posture: RuntimeRegistryPosture;
  entryCount: number;
  redactedFields: readonly string[];
  reasons: readonly RuntimeRegistryReason[];
}): ContinuumRuntimeRegistryInspection {
  return {
    schemaVersion: RUNTIME_REGISTRY_INSPECTION_SCHEMA_VERSION,
    registrySchemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    source: args.source,
    posture: args.posture,
    entryCount: args.entryCount,
    redaction: {
      redacted: args.redactedFields.length > 0,
      fields: args.redactedFields
    },
    reasons: args.reasons
  };
}

function resultFromRegistry(args: RegistryResultArgs): RuntimeRegistryLoadResult {
  const reasons = args.reasons ?? [];
  const redactedFields = args.redactedFields ?? [];
  return {
    registry: args.registry,
    inspection: inspection({
      source: args.source,
      posture: reasons.length === 0 ? "PRESENT" : "OBSTRUCTED",
      entryCount: args.registry.runtimes.length,
      redactedFields,
      reasons
    }),
    descriptors: runtimeRegistryDescriptors(args.registry)
  };
}

function obstructedResult(
  source: RuntimeRegistrySource,
  obstruction: RuntimeRegistryReason
): RuntimeRegistryLoadResult {
  const registry: ContinuumRuntimeRegistry = {
    schemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    runtimes: [
      obstructionEntry("warp-ttd-runtime-registry", obstruction.message, {
        label: "WARP TTD runtime registry"
      })
    ]
  };
  return resultFromRegistry({ registry, source, reasons: [obstruction] });
}

export function runtimeRegistryFromDescriptors(
  descriptors: readonly ContinuumDebugTargetDescriptor[]
): ContinuumRuntimeRegistry {
  return {
    schemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    runtimes: descriptors.map((descriptor) => ({
      id: descriptor.id,
      connection: descriptor.connection,
      ...optionalEntryFields({
        label: descriptor.label,
        appKind: descriptor.appKind
      })
    }))
  };
}

export function defaultRuntimeRegistry(roots?: LiveTargetRoots): ContinuumRuntimeRegistry {
  return runtimeRegistryFromDescriptors(defaultLiveTargetDescriptors(roots));
}

export function runtimeRegistryDescriptors(
  registry: ContinuumRuntimeRegistry
): readonly ContinuumDebugTargetDescriptor[] {
  return registry.runtimes.map((entry) => ({
    id: entry.id,
    connection: entry.connection,
    ...optionalEntryFields({
      label: entry.label,
      appKind: entry.appKind
    })
  }));
}

function isRuntimeRegistryReason(
  value: JsonObject | readonly JsonValue[] | RuntimeRegistryReason
): value is RuntimeRegistryReason {
  return !Array.isArray(value) && "code" in value && "message" in value && "source" in value;
}

function registryObjectFromJson(value: JsonValue): JsonObject | RuntimeRegistryReason {
  if (isJsonObject(value)) return value;
  return reason("REGISTRY_NOT_OBJECT", "Runtime registry must be a JSON object.");
}

function runtimesFromRegistryObject(value: JsonObject): readonly JsonValue[] | RuntimeRegistryReason {
  if (value["schemaVersion"] !== RUNTIME_REGISTRY_SCHEMA_VERSION) {
    return reason(
      "REGISTRY_SCHEMA_VERSION_UNSUPPORTED",
      `Runtime registry schemaVersion must be ${RUNTIME_REGISTRY_SCHEMA_VERSION}.`
    );
  }

  const runtimes = value["runtimes"];
  if (runtimes !== undefined && isJsonArray(runtimes)) return runtimes;
  return reason("REGISTRY_RUNTIMES_NOT_ARRAY", "Runtime registry runtimes must be a JSON array.");
}

export function normalizeRuntimeRegistry(
  value: JsonValue,
  source: RuntimeRegistrySource
): RuntimeRegistryLoadResult {
  const registryObject = registryObjectFromJson(value);
  if (isRuntimeRegistryReason(registryObject)) return obstructedResult(source, registryObject);

  const runtimes = runtimesFromRegistryObject(registryObject);
  if (isRuntimeRegistryReason(runtimes)) return obstructedResult(source, runtimes);

  return resultFromNormalizedEntries(runtimes.map(entryFromJson), source);
}

function resultFromNormalizedEntries(
  normalized: readonly EntryNormalization[],
  source: RuntimeRegistrySource
): RuntimeRegistryLoadResult {
  const duplicateNormalized = obstructDuplicateRuntimeIds(
    normalized.map((entry) => entry.entry)
  );
  const registry: ContinuumRuntimeRegistry = {
    schemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    runtimes: duplicateNormalized.entries
  };
  const reasons = [
    ...normalized.flatMap((entry) => entry.reasons),
    ...duplicateNormalized.reasons
  ];
  const redactedFields = normalized.flatMap((entry) => entry.redactedFields);
  return resultFromRegistry({ registry, source, reasons, redactedFields });
}

export function runtimeRegistryFromJson(
  value: string,
  source: RuntimeRegistrySource = {
    kind: "ENV_JSON",
    env: RUNTIME_REGISTRY_JSON_ENV
  }
): RuntimeRegistryLoadResult {
  try {
    return normalizeRuntimeRegistry(JSON.parse(value) as JsonValue, source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown JSON parse error";
    return obstructedResult(
      source,
      reason("REGISTRY_JSON_PARSE_ERROR", `Runtime registry JSON could not be parsed: ${message}.`)
    );
  }
}

export function loadRuntimeRegistryFromPath(
  registryPath: string,
  source: RuntimeRegistrySource = { kind: "CLI_PATH", path: registryPath }
): RuntimeRegistryLoadResult {
  try {
    return runtimeRegistryFromJson(fs.readFileSync(registryPath, "utf8"), source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown file read error";
    return obstructedResult(
      source,
      reason(
        "REGISTRY_PATH_READ_ERROR",
        `Runtime registry path ${registryPath} could not be read: ${message}.`,
        "WARP_TTD"
      )
    );
  }
}

export function loadRuntimeRegistryFromEnv(
  env: Readonly<NodeJS.ProcessEnv> = process.env
): RuntimeRegistryLoadResult {
  const configuredJson = env[RUNTIME_REGISTRY_JSON_ENV];
  if (configuredJson !== undefined) {
    return runtimeRegistryFromJson(configuredJson, {
      kind: "ENV_JSON",
      env: RUNTIME_REGISTRY_JSON_ENV
    });
  }

  const configuredPath = env[RUNTIME_REGISTRY_PATH_ENV];
  if (configuredPath !== undefined) {
    return loadRuntimeRegistryFromPath(configuredPath, {
      kind: "ENV_PATH",
      env: RUNTIME_REGISTRY_PATH_ENV,
      path: configuredPath
    });
  }

  return resultFromRegistry({
    registry: defaultRuntimeRegistry(),
    source: { kind: "DEFAULT" }
  });
}

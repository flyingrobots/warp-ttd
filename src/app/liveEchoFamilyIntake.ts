import fs from "node:fs";
import path from "node:path";

import {
  absentGeneratedFamilyFact,
  obstructedGeneratedFamilyFact,
  presentGeneratedFamilyFact,
  type JsonObject,
  type JsonValue
} from "./generatedFamilyIngress.ts";
import {
  SESSION_FAMILY_FACT_KEYS,
  type SessionFamilyFact,
  type SessionFamilyFactKey
} from "./sessionFamilyFacts.ts";
import {
  inspectSharedFamilyConsumption,
  sharedFamilySourceFor,
  type SharedFamilyConsumptionInspection
} from "./sharedFamilyHydration.ts";

export const LIVE_ECHO_FAMILY_INTAKE_SCHEMA_VERSION =
  "warp-ttd.live-echo-family-intake.v1";
export const LIVE_ECHO_FAMILY_FACTS_MANIFEST =
  ".warp-ttd/live-echo-family-facts.json";

export type LiveEchoFamilyRootPosture = "PRESENT" | "MISSING";
export type LiveEchoFamilyManifestPosture = "MISSING" | "PRESENT" | "OBSTRUCTED";
export type LiveEchoFamilyIntakePosture = "UNAVAILABLE" | "PRESENT" | "OBSTRUCTED";

export interface LiveEchoFamilyIntakeArgs {
  readonly rootPath: string;
  readonly rootPosture: LiveEchoFamilyRootPosture;
}

export interface LiveEchoFamilyIntakeInspection extends JsonObject {
  readonly schemaVersion: typeof LIVE_ECHO_FAMILY_INTAKE_SCHEMA_VERSION;
  readonly target: "jedit";
  readonly hostKind: "ECHO";
  readonly rootPath: string;
  readonly rootPosture: LiveEchoFamilyRootPosture;
  readonly manifestPath: string;
  readonly manifestPosture: LiveEchoFamilyManifestPosture;
  readonly intakePosture: LiveEchoFamilyIntakePosture;
  readonly expectedFields: readonly SessionFamilyFactKey[];
  readonly facts: readonly SessionFamilyFact[];
  readonly generatedFamilyConsumption: SharedFamilyConsumptionInspection;
  readonly readOnly: true;
  readonly reason: string;
}

interface ManifestRead {
  readonly manifestPosture: LiveEchoFamilyManifestPosture;
  readonly publishedFields: readonly SessionFamilyFactKey[];
  readonly reason: string;
}

function manifestPath(rootPath: string): string {
  return path.join(rootPath, LIVE_ECHO_FAMILY_FACTS_MANIFEST);
}

function errorMessage(error: Error | undefined): string {
  return error?.message ?? "unknown manifest read error";
}

function isSessionFamilyFactKey(value: string): value is SessionFamilyFactKey {
  return (SESSION_FAMILY_FACT_KEYS as readonly string[]).includes(value);
}

function sessionFamilyFieldFrom(entry: JsonValue): SessionFamilyFactKey | undefined {
  if (typeof entry !== "string") return undefined;
  if (!isSessionFamilyFactKey(entry)) return undefined;
  return entry;
}

function appendUniqueField(
  fields: SessionFamilyFactKey[],
  field: SessionFamilyFactKey
): void {
  if (!fields.includes(field)) fields.push(field);
}

function publishedFieldsFrom(data: JsonObject): readonly SessionFamilyFactKey[] | undefined {
  const value = data["publishedFields"];
  if (!Array.isArray(value)) return undefined;

  const entries = value as readonly JsonValue[];
  const fields: SessionFamilyFactKey[] = [];
  for (const entry of entries) {
    const field = sessionFamilyFieldFrom(entry);
    if (field === undefined) return undefined;
    appendUniqueField(fields, field);
  }

  return fields;
}

function presentManifest(data: JsonObject): ManifestRead {
  const publishedFields = publishedFieldsFrom(data);
  if (publishedFields === undefined) {
    return {
      manifestPosture: "OBSTRUCTED",
      publishedFields: [],
      reason: "jedit live Echo family manifest must declare publishedFields."
    };
  }

  return {
    manifestPosture: "PRESENT",
    publishedFields,
    reason: "jedit live Echo family manifest was read without attaching to Echo."
  };
}

function readPresentManifest(pathname: string): ManifestRead {
  try {
    return presentManifest(JSON.parse(fs.readFileSync(pathname, "utf-8")) as JsonObject);
  } catch (error) {
    return {
      manifestPosture: "OBSTRUCTED",
      publishedFields: [],
      reason: `jedit live Echo family manifest could not be read: ${errorMessage(
        error instanceof Error ? error : undefined
      )}`
    };
  }
}

function readManifest(args: LiveEchoFamilyIntakeArgs): ManifestRead {
  if (args.rootPosture === "MISSING") {
    return {
      manifestPosture: "MISSING",
      publishedFields: [],
      reason: "jedit root is missing; no live Echo family manifest was read."
    };
  }

  if (!fs.existsSync(manifestPath(args.rootPath))) {
    return {
      manifestPosture: "MISSING",
      publishedFields: [],
      reason: "jedit live Echo family manifest is not present."
    };
  }

  return readPresentManifest(manifestPath(args.rootPath));
}

function absentIntakeFact(field: SessionFamilyFactKey, reason: string): SessionFamilyFact {
  return {
    field,
    ...absentGeneratedFamilyFact({
      source: sharedFamilySourceFor(field),
      origin: "UNAVAILABLE",
      scope: "TARGET",
      target: "jedit",
      reason
    })
  };
}

function obstructedIntakeFact(field: SessionFamilyFactKey, reason: string): SessionFamilyFact {
  return {
    field,
    ...obstructedGeneratedFamilyFact({
      source: sharedFamilySourceFor(field),
      origin: "HOST_PUBLISHED",
      scope: "TARGET",
      target: "jedit",
      reason
    })
  };
}

function presentIntakeFact(field: SessionFamilyFactKey): SessionFamilyFact {
  return {
    field,
    ...presentGeneratedFamilyFact({
      source: sharedFamilySourceFor(field),
      origin: "HOST_PUBLISHED",
      scope: "TARGET",
      target: "jedit"
    })
  };
}

function intakeFactFor(
  field: SessionFamilyFactKey,
  manifest: ManifestRead
): SessionFamilyFact {
  if (manifest.manifestPosture === "OBSTRUCTED") {
    return obstructedIntakeFact(field, manifest.reason);
  }

  if (manifest.publishedFields.includes(field)) return presentIntakeFact(field);

  return absentIntakeFact(field, manifest.reason);
}

function intakePosture(manifest: ManifestRead): LiveEchoFamilyIntakePosture {
  if (manifest.manifestPosture === "OBSTRUCTED") return "OBSTRUCTED";
  if (manifest.publishedFields.length > 0) return "PRESENT";
  return "UNAVAILABLE";
}

export function inspectLiveEchoFamilyIntake(
  args: LiveEchoFamilyIntakeArgs
): LiveEchoFamilyIntakeInspection {
  const manifest = readManifest(args);

  return {
    schemaVersion: LIVE_ECHO_FAMILY_INTAKE_SCHEMA_VERSION,
    target: "jedit",
    hostKind: "ECHO",
    rootPath: args.rootPath,
    rootPosture: args.rootPosture,
    manifestPath: manifestPath(args.rootPath),
    manifestPosture: manifest.manifestPosture,
    intakePosture: intakePosture(manifest),
    expectedFields: SESSION_FAMILY_FACT_KEYS,
    facts: SESSION_FAMILY_FACT_KEYS.map((field) => intakeFactFor(field, manifest)),
    generatedFamilyConsumption: inspectSharedFamilyConsumption(),
    readOnly: true,
    reason: manifest.reason
  };
}

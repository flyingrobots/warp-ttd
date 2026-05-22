import type { DebuggerSession } from "./debuggerSession.ts";
import {
  absentGeneratedFamilyFact,
  obstructedGeneratedFamilyFact,
  presentGeneratedFamilyFact,
  type GeneratedFamilyFact,
  type GeneratedFamilyOrigin,
  type GeneratedFamilyRef,
  type GeneratedFamilyScope
} from "./generatedFamilyIngress.ts";
import type { ReceiptSummary } from "../protocol.ts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const ADMISSION_CHAIN_SCHEMA_VERSION = "warp-ttd.admission-chain.v1";

export const ADMISSION_CHAIN_FACT_KEYS = [
  "basis",
  "artifactRegistration",
  "opticArtifactHandle",
  "opticAdmissionRequirements",
  "capabilityGrant",
  "capabilityPresentation",
  "admissionTicket",
  "lawWitness",
  "receipts",
  "reading"
] as const;

export type AdmissionChainFactKey = typeof ADMISSION_CHAIN_FACT_KEYS[number];

export type AdmissionFactPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";

export interface AbsentFact extends JsonObject {
  field: AdmissionChainFactKey;
  posture: "ABSENT";
  reason: string;
}

export interface PresentFact<T extends JsonValue = JsonValue> extends JsonObject {
  field: AdmissionChainFactKey;
  posture: "PRESENT";
  value: T;
}

export interface ObstructedFact extends JsonObject {
  field: AdmissionChainFactKey;
  posture: "OBSTRUCTED";
  reason: string;
}

export type AdmissionFact<T extends JsonValue = JsonValue> =
  | AbsentFact
  | PresentFact<T>
  | ObstructedFact;

export interface AdapterCapabilitiesInspection extends JsonObject {
  hostHello: JsonObject;
  capabilities: readonly string[];
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

export interface AdmissionChainFact extends JsonObject {
  key: AdmissionChainFactKey;
  label: string;
  value: AdmissionFact;
  sourceFamily: AdmissionChainSourceFamilyFact;
}

export type AdmissionChainSourceFamilyFact = GeneratedFamilyFact & {
  readonly field: AdmissionChainFactKey;
};

interface AdmissionChainFields {
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

type UnavailableAdmissionFields = Pick<
  AdmissionChainFields,
  | "artifactRegistration"
  | "opticArtifactHandle"
  | "opticAdmissionRequirements"
  | "capabilityGrant"
  | "capabilityPresentation"
  | "admissionTicket"
  | "lawWitness"
>;

interface SourceFamilyFactArgs {
  readonly source: GeneratedFamilyRef;
  readonly origin: GeneratedFamilyOrigin;
  readonly scope: GeneratedFamilyScope;
}

export interface AdmissionChainReadModel extends AdmissionChainFields, JsonObject {
  schemaVersion: typeof ADMISSION_CHAIN_SCHEMA_VERSION;
  facts: readonly AdmissionChainFact[];
  sourceFamilyFacts: readonly AdmissionChainSourceFamilyFact[];
}

const FACT_LABELS: Record<AdmissionChainFactKey, string> = {
  basis: "Basis",
  artifactRegistration: "Artifact registration",
  opticArtifactHandle: "Optic artifact handle",
  opticAdmissionRequirements: "Optic admission requirements",
  capabilityGrant: "CapabilityGrant",
  capabilityPresentation: "CapabilityPresentation",
  admissionTicket: "Admission ticket",
  lawWitness: "Law witness",
  receipts: "Receipts",
  reading: "Reading"
};

const ABSENT_REASONS = {
  artifactRegistration: "Host adapter did not provide registered artifact facts.",
  opticArtifactHandle:
    "Host adapter did not provide an Echo-owned optic artifact handle.",
  opticAdmissionRequirements:
    "Host adapter did not provide optic admission requirements.",
  capabilityGrant: "Host adapter did not provide CapabilityGrant posture.",
  capabilityPresentation:
    "Host adapter did not provide CapabilityPresentation posture.",
  admissionTicket:
    "Host adapter did not provide admission ticket or obstruction posture.",
  lawWitness: "Host adapter did not provide law witness posture."
} as const;

const SHARED_FAMILY_SOURCES: Record<AdmissionChainFactKey, GeneratedFamilyRef> = {
  admissionTicket: { family: "echo", artifact: "AdmissionTicket" },
  artifactRegistration: { family: "echo", artifact: "OpticRegistrationDescriptor" },
  basis: protocolSource("PlaybackFrame"),
  capabilityGrant: { family: "authority", artifact: "CapabilityGrant" },
  capabilityPresentation: {
    family: "authority",
    artifact: "CapabilityPresentation"
  },
  lawWitness: { family: "echo", artifact: "LawWitness" },
  opticAdmissionRequirements: {
    family: "echo",
    artifact: "OpticAdmissionRequirements"
  },
  opticArtifactHandle: { family: "echo", artifact: "OpticArtifactHandle" },
  reading: { family: "continuum", artifact: "ReadingEnvelope" },
  receipts: protocolSource("ReceiptSummary")
};

function absent(
  field: AdmissionChainFactKey,
  reason: string
): AbsentFact {
  return { field, posture: "ABSENT", reason };
}

function present<T extends JsonValue>(
  field: AdmissionChainFactKey,
  value: T
): PresentFact<T> {
  return { field, posture: "PRESENT", value };
}

function basisRef(session: DebuggerSession): string {
  return `${session.activeHeadId}@frame:${session.snapshot.frame.frameIndex.toString()}`;
}

function receiptRefs(receipts: readonly ReceiptSummary[]): string[] {
  return receipts.map((receipt) => receipt.receiptId);
}

function receiptFact(receipts: readonly ReceiptSummary[]): AdmissionFact<JsonObject> {
  const ids = receiptRefs(receipts);

  if (ids.length === 0) {
    return absent("receipts", "No receipt facts are present at the current frame.");
  }

  return present("receipts", {
    count: ids.length,
    receiptIds: ids
  });
}

function unavailableAdmissionFields(): UnavailableAdmissionFields {
  return {
    artifactRegistration: absent(
      "artifactRegistration",
      ABSENT_REASONS.artifactRegistration
    ),
    opticArtifactHandle: absent("opticArtifactHandle", ABSENT_REASONS.opticArtifactHandle),
    opticAdmissionRequirements: absent(
      "opticAdmissionRequirements",
      ABSENT_REASONS.opticAdmissionRequirements
    ),
    capabilityGrant: absent("capabilityGrant", ABSENT_REASONS.capabilityGrant),
    capabilityPresentation: absent(
      "capabilityPresentation",
      ABSENT_REASONS.capabilityPresentation
    ),
    admissionTicket: absent("admissionTicket", ABSENT_REASONS.admissionTicket),
    lawWitness: absent("lawWitness", ABSENT_REASONS.lawWitness)
  };
}

function factsFor(
  model: AdmissionChainFields,
  sourceFamilyFacts: readonly AdmissionChainSourceFamilyFact[]
): AdmissionChainFact[] {
  return ADMISSION_CHAIN_FACT_KEYS.map((key, index) => {
    const value = model[key];
    const sourceFamily = sourceFamilyFacts[index] ?? sourceFamilyFactFor(key, value);

    return {
      key,
      label: FACT_LABELS[key],
      value,
      sourceFamily
    };
  });
}

function protocolSource(
  artifact: string
): GeneratedFamilyRef {
  return {
    family: "warp-ttd-protocol",
    artifact,
    schemaVersion: "0.6.0"
  };
}

function sharedFamilySource(key: AdmissionChainFactKey): GeneratedFamilyRef {
  return SHARED_FAMILY_SOURCES[key];
}

function sourceFamilyScope(key: AdmissionChainFactKey): GeneratedFamilyScope {
  return ["basis", "receipts", "reading"].includes(key) ? "COORDINATE" : "SESSION";
}

function sourceFamilyOrigin(
  key: AdmissionChainFactKey,
  fact: AdmissionFact
): GeneratedFamilyOrigin {
  if (fact.posture !== "PRESENT") return "UNAVAILABLE";
  if (["basis", "receipts", "reading"].includes(key)) return "LOCAL_FALLBACK";
  return "HOST_PUBLISHED";
}

function presentPayload(fact: AdmissionFact): JsonObject | undefined {
  if (fact.posture !== "PRESENT") return undefined;
  return typeof fact.value === "object" && fact.value !== null
    ? (fact.value as JsonObject)
    : { value: fact.value };
}

function sourceFamilyFactFor(
  key: AdmissionChainFactKey,
  fact: AdmissionFact
): AdmissionChainSourceFamilyFact {
  const args = {
    source: sharedFamilySource(key),
    origin: sourceFamilyOrigin(key, fact),
    scope: sourceFamilyScope(key)
  };

  if (fact.posture === "PRESENT") {
    return presentSourceFamilyFact(key, args, fact);
  }

  if (fact.posture === "OBSTRUCTED") {
    return obstructedSourceFamilyFact(key, args, fact.reason);
  }

  return absentSourceFamilyFact(key, args, fact.reason);
}

function presentSourceFamilyFact(
  key: AdmissionChainFactKey,
  args: SourceFamilyFactArgs,
  fact: PresentFact
): AdmissionChainSourceFamilyFact {
  const payload = presentPayload(fact);

  return {
    field: key,
    ...(payload === undefined
      ? presentGeneratedFamilyFact(args)
      : presentGeneratedFamilyFact({ ...args, payload }))
  };
}

function absentSourceFamilyFact(
  key: AdmissionChainFactKey,
  args: SourceFamilyFactArgs,
  reason: string
): AdmissionChainSourceFamilyFact {
  return {
    field: key,
    ...absentGeneratedFamilyFact({ ...args, reason })
  };
}

function obstructedSourceFamilyFact(
  key: AdmissionChainFactKey,
  args: SourceFamilyFactArgs,
  reason: string
): AdmissionChainSourceFamilyFact {
  return {
    field: key,
    ...obstructedGeneratedFamilyFact({ ...args, reason })
  };
}

function sourceFamilyFactsFor(
  model: AdmissionChainFields
): AdmissionChainSourceFamilyFact[] {
  return ADMISSION_CHAIN_FACT_KEYS.map((key) =>
    sourceFamilyFactFor(key, model[key])
  );
}

export function buildReadingInspection(session: DebuggerSession): ReadingInspection {
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
    budgetPosture: absent("reading", "Host adapter did not provide budget posture."),
    headId: session.activeHeadId,
    frameIndex: snapshot.frame.frameIndex,
    laneIds: snapshot.frame.lanes.map((lane) => lane.laneId),
    neighborhoodSiteId: snapshot.neighborhoodCore.siteId,
    neighborhoodOutcome: snapshot.neighborhoodCore.outcome
  };
}

function buildAdmissionChainFields(session: DebuggerSession): AdmissionChainFields {
  const snapshot = session.snapshot;

  return {
    basis: present("basis", {
      basisRef: basisRef(session),
      headId: session.activeHeadId,
      frameIndex: snapshot.frame.frameIndex
    }),
    ...unavailableAdmissionFields(),
    receipts: receiptFact(snapshot.receipts),
    reading: present("reading", buildReadingInspection(session))
  } satisfies AdmissionChainFields;
}

export function buildAdmissionChainReadModel(
  session: DebuggerSession
): AdmissionChainReadModel {
  const fields = buildAdmissionChainFields(session);
  const sourceFamilyFacts = sourceFamilyFactsFor(fields);

  return {
    schemaVersion: ADMISSION_CHAIN_SCHEMA_VERSION,
    facts: factsFor(fields, sourceFamilyFacts),
    sourceFamilyFacts,
    ...fields
  };
}

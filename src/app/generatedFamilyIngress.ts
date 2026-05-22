export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type GeneratedFamilyPosture = "ABSENT" | "PRESENT" | "OBSTRUCTED";
export type GeneratedFamilyScope = "SESSION" | "COORDINATE" | "TARGET";
export type GeneratedFamilyName =
  | "warp-ttd-protocol"
  | "continuum"
  | "echo"
  | "authority"
  | "git-warp";
export type GeneratedFamilyOrigin =
  | "GENERATED_PAYLOAD"
  | "HOST_PUBLISHED"
  | "TRANSLATED_SUBSTRATE"
  | "LOCAL_FALLBACK"
  | "UNAVAILABLE";

export interface GeneratedFamilyRef extends JsonObject {
  family: GeneratedFamilyName;
  artifact?: string;
  schemaVersion?: string;
}

export interface GeneratedFamilyFactBase extends JsonObject {
  posture: GeneratedFamilyPosture;
  source: GeneratedFamilyRef;
  origin: GeneratedFamilyOrigin;
  scope: GeneratedFamilyScope;
  target?: string;
}

export interface PresentGeneratedFamilyFact<
  TPayload extends JsonValue = JsonValue
> extends GeneratedFamilyFactBase {
  posture: "PRESENT";
  payload?: TPayload;
}

export interface AbsentGeneratedFamilyFact extends GeneratedFamilyFactBase {
  posture: "ABSENT";
  reason: string;
}

export interface ObstructedGeneratedFamilyFact extends GeneratedFamilyFactBase {
  posture: "OBSTRUCTED";
  reason: string;
}

export type GeneratedFamilyFact<TPayload extends JsonValue = JsonValue> =
  | PresentGeneratedFamilyFact<TPayload>
  | AbsentGeneratedFamilyFact
  | ObstructedGeneratedFamilyFact;

interface GeneratedFamilyFactArgs {
  source: GeneratedFamilyRef;
  origin: GeneratedFamilyOrigin;
  scope: GeneratedFamilyScope;
  target?: string;
}

interface PresentGeneratedFamilyFactArgs<TPayload extends JsonValue>
  extends GeneratedFamilyFactArgs {
  payload?: TPayload;
}

interface NonPresentGeneratedFamilyFactArgs extends GeneratedFamilyFactArgs {
  reason: string;
}

export function generatedFamilyRef(source: GeneratedFamilyRef): GeneratedFamilyRef {
  return {
    family: source.family,
    ...(source.artifact === undefined ? {} : { artifact: source.artifact }),
    ...(source.schemaVersion === undefined
      ? {}
      : { schemaVersion: source.schemaVersion })
  };
}

function generatedFamilyBase(args: GeneratedFamilyFactArgs): GeneratedFamilyFactBase {
  return {
    source: generatedFamilyRef(args.source),
    origin: args.origin,
    scope: args.scope,
    ...(args.target === undefined ? {} : { target: args.target }),
    posture: "ABSENT"
  };
}

export function presentGeneratedFamilyFact<TPayload extends JsonValue = JsonValue>(
  args: PresentGeneratedFamilyFactArgs<TPayload>
): PresentGeneratedFamilyFact<TPayload> {
  const base = generatedFamilyBase(args);

  return {
    ...base,
    posture: "PRESENT",
    ...(args.payload === undefined ? {} : { payload: args.payload })
  };
}

export function absentGeneratedFamilyFact(
  args: NonPresentGeneratedFamilyFactArgs
): AbsentGeneratedFamilyFact {
  return {
    ...generatedFamilyBase(args),
    posture: "ABSENT",
    reason: args.reason
  };
}

export function obstructedGeneratedFamilyFact(
  args: NonPresentGeneratedFamilyFactArgs
): ObstructedGeneratedFamilyFact {
  return {
    ...generatedFamilyBase(args),
    posture: "OBSTRUCTED",
    reason: args.reason
  };
}

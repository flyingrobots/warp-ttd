import assert from "node:assert/strict";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export function requireRecord(
  value: JsonValue | object | undefined,
  label: string
): JsonObject {
  assert.equal(typeof value, "object", `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  return value as JsonObject;
}

export function requireArray(
  value: JsonValue | object | undefined,
  label: string
): readonly JsonValue[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  return value as readonly JsonValue[];
}

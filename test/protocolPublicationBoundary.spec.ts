/**
 * Protocol publication boundary tests — cycle 0011.
 *
 * Verify that the local TypeScript protocol mirror follows the authored
 * GraphQL schema.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "warp-ttd-protocol.graphql");
const PROTOCOL_MIRROR_PATH = path.join(ROOT, "src", "protocol.ts");

function extractSchemaEnumValues(schemaContent: string, enumName: string): string[] {
  const match = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, "m").exec(schemaContent);
  assert.ok(match?.[1] !== undefined, `Schema enum ${enumName} should exist`);
  return match[1]
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter((line) => line.length > 0);
}

function extractMirrorUnionValues(mirrorContent: string, typeName: string): string[] {
  const match = new RegExp(`export\\s+type\\s+${typeName}\\s*=([\\s\\S]*?);`, "m").exec(mirrorContent);
  assert.ok(match?.[1] !== undefined, `Mirror type ${typeName} should exist`);
  return [...match[1].matchAll(/"([A-Z_]+)"/g)].map((item) => item[1] ?? "");
}

test("every exported interface in protocol mirror has a matching type in the schema", () => {
  const mirrorContent = fs.readFileSync(PROTOCOL_MIRROR_PATH, "utf-8");
  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");

  // Extract exported interface/type names from the mirror
  const exportedTypes: string[] = [];
  for (const m of mirrorContent.matchAll(/export\s+(?:interface|type)\s+(\w+)/g)) {
    if (m[1] !== undefined) exportedTypes.push(m[1]);
  }

  assert.ok(exportedTypes.length > 0, "Mirror should export at least one type");

  // Every mirror type should appear as a type/enum in the schema
  for (const typeName of exportedTypes) {
    assert.match(
      schemaContent,
      new RegExp(`(?:type|enum)\\s+${typeName}\\b`),
      `Mirror exports '${typeName}' but schema has no matching type or enum`,
    );
  }
});

test("protocol mirror enum unions match the authored schema literals", () => {
  const mirrorContent = fs.readFileSync(PROTOCOL_MIRROR_PATH, "utf-8");
  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");

  const enumNames = [
    "HostKind",
    "LaneKind",
    "AdapterCapability",
    "DeliveryOutcome",
    "ExecutionMode",
  ];

  for (const enumName of enumNames) {
    assert.deepEqual(
      extractMirrorUnionValues(mirrorContent, enumName),
      extractSchemaEnumValues(schemaContent, enumName),
      `Mirror enum ${enumName} should follow the authored schema literals exactly`,
    );
  }
});

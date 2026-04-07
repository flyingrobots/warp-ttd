/**
 * Protocol publication boundary tests — cycle 0011.
 *
 * Verify that the repo names a boring, discoverable publication boundary:
 * one authored schema, one Wesley compile path, one stable artifact family,
 * and local files that declare themselves followers rather than authorities.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "warp-ttd-protocol.graphql");
const PROTOCOL_MIRROR_PATH = path.join(ROOT, "src", "protocol.ts");
const README_PATH = path.join(ROOT, "README.md");

// ─── Agent PQ 1: Can the agent identify exactly one authored protocol source?

test("exactly one authored protocol schema exists", () => {
  const schemasDir = path.join(ROOT, "schemas");
  const files = fs.readdirSync(schemasDir);
  const graphqlFiles = files.filter((f) => f.endsWith(".graphql"));
  assert.equal(graphqlFiles.length, 1, "Expected exactly one .graphql schema");
  assert.equal(graphqlFiles[0], "warp-ttd-protocol.graphql");
});

test("schema file contains protocol header comment identifying it as authored source", () => {
  const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
  assert.match(
    content,
    /[Aa]uthored source of truth/,
    "Schema should self-identify as the authored source of truth",
  );
});

// ─── User PQ 2: Is it clear what consumers should take from this repo?

test("README names the schema file and its version for consumers", () => {
  const content = fs.readFileSync(README_PATH, "utf-8");
  assert.ok(
    content.includes("schemas/warp-ttd-protocol.graphql"),
    "README should name the schema file",
  );
  assert.match(
    content,
    /v\d+\.\d+\.\d+/,
    "README should show the protocol version",
  );
});

test("README tells consumers to feed the schema to Wesley", () => {
  const content = fs.readFileSync(README_PATH, "utf-8");
  assert.ok(
    content.includes("compile-ttd"),
    "README should name the Wesley compile path",
  );
});

// ─── User PQ 3: Is it clear which local surfaces are not shared contract?

test("README distinguishes local mirror from authored schema", () => {
  const content = fs.readFileSync(README_PATH, "utf-8");
  assert.match(
    content,
    /src\/protocol\.ts.*local|local.*src\/protocol\.ts/i,
    "README should identify src/protocol.ts as local",
  );
  assert.match(
    content,
    /follows the schema|does not own/i,
    "README should state the mirror follows the schema",
  );
});

// ─── Agent PQ 4: Can the agent tell that src/protocol.ts follows the schema?

test("protocol mirror declares itself a follower in its header comment", () => {
  const content = fs.readFileSync(PROTOCOL_MIRROR_PATH, "utf-8");
  const header = content.slice(0, 300);
  assert.match(
    header,
    /schemas\/warp-ttd-protocol\.graphql/,
    "Mirror should reference the authored schema path",
  );
  assert.match(
    header,
    /not.*(peer authority|treat it as peer authority)/i,
    "Mirror should declare it is not a peer authority",
  );
});

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

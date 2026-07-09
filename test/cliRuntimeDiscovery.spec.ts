import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  requireArray,
  requireRecord,
  type JsonObject
} from "./helpers/jsonTestUtils.ts";
import { createFixture } from "./helpers/gitWarpFixture.ts";

const exec = promisify(execFile);
const CLI = "./src/cli.ts";
const NODE_ARGS = ["--experimental-strip-types", CLI, "discover"];

interface EnvelopeLine {
  readonly envelope: string;
  readonly data?: JsonObject;
}

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test", "fixtures", "runtime-registry", name);
}

async function runDiscover(
  args: readonly string[] = ["--json"],
  env: NodeJS.ProcessEnv = {}
): Promise<readonly string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, ...args], {
    env: { ...process.env, ...env }
  });
  return stdout.trim().split("\n").filter((line) => line.length > 0);
}

function parseEnvelope(line: string): EnvelopeLine {
  const parsed = JSON.parse(line) as EnvelopeLine;
  assert.equal(parsed.envelope, "ContinuumRuntimeDiscoveryInspection");
  return parsed;
}

function discoveryData(lines: readonly string[]): JsonObject {
  assert.equal(lines.length, 1);
  return requireRecord(parseEnvelope(lines[0] ?? "").data, "runtime discovery data");
}

function discoveryRecords(data: JsonObject): readonly JsonObject[] {
  return requireArray(data["runtimeDiscovery"], "runtimeDiscovery")
    .map((entry) => requireRecord(entry, "runtimeDiscovery entry"));
}

function targetId(record: JsonObject): string {
  const target = requireRecord(record["target"], "target");
  assert.equal(typeof target["targetId"], "string");
  return target["targetId"] as string;
}

function recordByTarget(records: readonly JsonObject[], id: string): JsonObject {
  const record = records.find((entry) => targetId(entry) === id);
  assert.ok(record !== undefined, `missing discovery record ${id}`);
  return record;
}

function reasonCodes(record: JsonObject): readonly string[] {
  return requireArray(record["reasons"], "reasons")
    .map((entry) => requireRecord(entry, "reason")["code"])
    .filter((code): code is string => typeof code === "string");
}

function assertPosture(record: JsonObject, posture: string, code: string): void {
  assert.equal(record["discoveryPosture"], posture);
  assert.ok(reasonCodes(record).includes(code), `${targetId(record)} missing ${code}`);
}

function registry(data: JsonObject): JsonObject {
  return requireRecord(data["registry"], "registry");
}

test("discover --json emits one deterministic runtime discovery envelope", async () => {
  const fixture = await createFixture("runtime-discovery-cli-graft", "graft-ast");
  try {
    const data = discoveryData(await runDiscover(["--json"], {
      WARP_TTD_GRAFT_ROOT: fixture.tempDir,
      WARP_TTD_JEDIT_ROOT: path.join(fixture.tempDir, "missing-jedit")
    }));
    const records = discoveryRecords(data);

    assert.equal(data["schemaVersion"], "warp-ttd.continuum-runtime-discovery-inspection.v1");
    assert.equal(registry(data)["source"] !== undefined, true);
    assertPosture(recordByTarget(records, "jedit"), "ABSENT", "LOCAL_ROOT_MISSING");
    assertPosture(recordByTarget(records, "graft"), "REACHABLE", "RUNTIME_HELLO_PRESENT");
    assert.equal(recordByTarget(records, "graft")["readOnly"], true);
  } finally {
    await fixture.cleanup();
  }
});

test("discover --json --registry reports mixed fixture without leaking secrets", async () => {
  const data = discoveryData(await runDiscover([
    "--json",
    "--registry",
    fixturePath("mixed-registry.json")
  ]));
  const records = discoveryRecords(data);
  const endpoint = recordByTarget(records, "vendor-endpoint");

  assert.equal(requireRecord(registry(data)["source"], "source")["kind"], "CLI_PATH");
  assertPosture(recordByTarget(records, "local-echo"), "ABSENT", "LOCAL_ROOT_MISSING");
  assertPosture(endpoint, "UNSUPPORTED", "ENDPOINT_CONSENT_NOT_DESIGNED");
  assertPosture(recordByTarget(records, "descriptor-only-demo"), "UNSUPPORTED", "DESCRIPTOR_UNSUPPORTED");
  assert.equal(endpoint["consent"], "DESIGN_DEFERRED");
  assert.equal(endpoint["auth"], "DESIGN_DEFERRED");

  const emitted = JSON.stringify(data);
  assert.equal(emitted.includes("must-not-leak"), false);
  assert.equal(emitted.includes("https://example.invalid/runtime"), false);
});

test("discover --json covers the registry obstruction fixture matrix", async () => {
  const cases: readonly [string, string][] = [
    ["duplicate-registry.json", "REGISTRY_DUPLICATE_ID"],
    ["wrong-schema.json", "REGISTRY_SCHEMA_VERSION_UNSUPPORTED"],
    ["malformed-registry.json", "REGISTRY_JSON_PARSE_FAILED"]
  ];

  for (const [fixture, code] of cases) {
    const data = discoveryData(await runDiscover(["--json", "--registry", fixturePath(fixture)]));
    assert.equal(registry(data)["posture"], "OBSTRUCTED");
    assert.ok(discoveryRecords(data).every((record) => reasonCodes(record).includes(code)));
  }
});

test("npm discover script emits runtime discovery JSON", async () => {
  const { stdout } = await exec("npm", ["run", "discover", "--", "--json"], {
    env: {
      ...process.env,
      WARP_TTD_GRAFT_ROOT: "/tmp/warp-ttd-missing-graft",
      WARP_TTD_JEDIT_ROOT: "/tmp/warp-ttd-missing-jedit"
    }
  });
  const lines = stdout.trim().split("\n").filter((line) => line.startsWith("{"));

  assert.equal(parseEnvelope(lines[0] ?? "").envelope, "ContinuumRuntimeDiscoveryInspection");
});

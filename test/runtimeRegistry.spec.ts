import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  RUNTIME_REGISTRY_JSON_ENV,
  RUNTIME_REGISTRY_PATH_ENV,
  RUNTIME_REGISTRY_SCHEMA_VERSION,
  loadRuntimeRegistryFromEnv,
  loadRuntimeRegistryFromPath,
  runtimeRegistryFromJson
} from "../src/app/runtimeRegistry.ts";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test", "fixtures", "runtime-registry", name);
}

test("loadRuntimeRegistryFromEnv emits built-in witness registry by default", () => {
  const result = loadRuntimeRegistryFromEnv({});

  assert.equal(result.registry.schemaVersion, RUNTIME_REGISTRY_SCHEMA_VERSION);
  assert.equal(result.inspection.source.kind, "DEFAULT");
  assert.equal(result.inspection.posture, "PRESENT");
  assert.equal(result.inspection.entryCount, 2);
  assert.deepEqual(result.registry.runtimes.map((runtime) => runtime.id), ["jedit", "graft"]);
  assert.deepEqual(result.descriptors.map((descriptor) => descriptor.id), ["jedit", "graft"]);
  assert.deepEqual(
    result.registry.runtimes.map((runtime) => {
      assert.ok("rootPath" in runtime.connection);
      return runtime.connection.rootPath;
    }),
    [path.resolve("../jedit"), path.resolve("../graft")]
  );
});

test("loadRuntimeRegistryFromEnv honors supplied default root env", () => {
  const result = loadRuntimeRegistryFromEnv({
    WARP_TTD_GRAFT_ROOT: "/tmp/runtime-registry-graft",
    WARP_TTD_JEDIT_ROOT: "/tmp/runtime-registry-jedit"
  });

  assert.deepEqual(
    result.registry.runtimes.map((runtime) => {
      assert.ok("rootPath" in runtime.connection);
      return runtime.connection.rootPath;
    }),
    ["/tmp/runtime-registry-jedit", "/tmp/runtime-registry-graft"]
  );
});

test("runtime registry path fixture normalizes entries without leaking endpoint secrets", () => {
  const result = loadRuntimeRegistryFromPath(fixturePath("mixed-registry.json"));

  assert.equal(result.inspection.source.kind, "CLI_PATH");
  assert.equal(result.inspection.posture, "PRESENT");
  assert.equal(result.inspection.entryCount, 3);
  assert.equal(result.inspection.redaction.redacted, true);
  assert.deepEqual(result.inspection.redaction.fields, [
    "runtimes[0].metadata.token",
    "runtimes[1].connection.authToken"
  ]);
  assert.deepEqual(result.registry.runtimes.map((runtime) => runtime.id), [
    "local-echo",
    "vendor-endpoint",
    "descriptor-only-demo"
  ]);

  const [echo, endpoint, descriptorOnly] = result.registry.runtimes;
  assert.ok(echo !== undefined);
  assert.ok(endpoint !== undefined);
  assert.ok(descriptorOnly !== undefined);
  assert.deepEqual(echo.metadata, { enabled: true, priority: 1 });
  assert.equal(echo.connection.mode, "echo-root");
  assert.equal(endpoint.connection.mode, "descriptor-only");
  assert.equal(endpoint.connection.adapterPosture, "UNSUPPORTED");
  assert.match(endpoint.connection.reason ?? "", /endpoint/);
  assert.equal(descriptorOnly.connection.mode, "descriptor-only");
  assert.equal(descriptorOnly.connection.adapterPosture, "UNSUPPORTED");

  const emitted = JSON.stringify(result);
  assert.equal(emitted.includes("must-not-leak"), false);
  assert.equal(emitted.includes("https://example.invalid/runtime"), false);
});

test("runtime registry env JSON takes precedence over env path", () => {
  const configured = {
    schemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    runtimes: [
      {
        id: "env-json-runtime",
        connection: { mode: "descriptor-only" }
      }
    ]
  };

  const result = loadRuntimeRegistryFromEnv({
    [RUNTIME_REGISTRY_JSON_ENV]: JSON.stringify(configured),
    [RUNTIME_REGISTRY_PATH_ENV]: fixturePath("wrong-schema.json")
  });

  assert.equal(result.inspection.source.kind, "ENV_JSON");
  assert.equal(result.inspection.posture, "PRESENT");
  assert.deepEqual(result.registry.runtimes.map((runtime) => runtime.id), [
    "env-json-runtime"
  ]);
});

test("runtime registry schema errors return structured obstruction entries", () => {
  const result = loadRuntimeRegistryFromPath(fixturePath("wrong-schema.json"));

  assert.equal(result.inspection.posture, "OBSTRUCTED");
  assert.equal(result.inspection.entryCount, 1);
  assert.deepEqual(result.inspection.reasons.map((entry) => entry.code), [
    "REGISTRY_SCHEMA_VERSION_UNSUPPORTED"
  ]);
  const descriptor = result.descriptors[0];
  assert.ok(descriptor !== undefined);
  assert.equal(descriptor.id, "warp-ttd-runtime-registry");
  assert.equal(descriptor.connection.mode, "descriptor-only");
  assert.equal(descriptor.connection.adapterPosture, "OBSTRUCTED");
});

test("runtime registry duplicate ids obstruct every duplicated runtime", () => {
  const result = loadRuntimeRegistryFromPath(fixturePath("duplicate-registry.json"));

  assert.equal(result.inspection.posture, "OBSTRUCTED");
  assert.deepEqual(result.registry.runtimes.map((runtime) => runtime.id), [
    "same-runtime",
    "same-runtime"
  ]);
  assert.deepEqual(
    result.registry.runtimes.map((runtime) => (
      runtime.connection.mode === "descriptor-only" ? runtime.connection.adapterPosture : ""
    )),
    ["OBSTRUCTED", "OBSTRUCTED"]
  );
  assert.ok(
    result.inspection.reasons.every((entry) => entry.code === "REGISTRY_DUPLICATE_ID")
  );
});

test("runtime registry JSON parse failures remain machine-readable", () => {
  const result = runtimeRegistryFromJson(fs.readFileSync(fixturePath("malformed-registry.json"), "utf8"));

  assert.equal(result.inspection.source.kind, "ENV_JSON");
  assert.equal(result.inspection.posture, "OBSTRUCTED");
  assert.deepEqual(result.inspection.reasons.map((entry) => entry.code), [
    "REGISTRY_JSON_PARSE_FAILED"
  ]);
  const runtime = result.registry.runtimes[0];
  assert.ok(runtime !== undefined);
  assert.equal(runtime.connection.mode, "descriptor-only");
  assert.equal(runtime.connection.adapterPosture, "OBSTRUCTED");
});

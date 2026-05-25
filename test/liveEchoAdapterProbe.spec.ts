import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  LIVE_ECHO_ADAPTER_PROBE_MANIFEST,
  LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
  inspectLiveEchoAdapterProbe
} from "../src/app/echoAdapterProbe.ts";

function tempJeditRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));
}

function writeProbeManifest(rootPath: string, value: object): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_ADAPTER_PROBE_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(value));
}

function supportedProbeManifest(): object {
  return {
    schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
    bridgeKind: "echo",
    abiVersion: 1,
    transport: "wasm"
  };
}

test("inspectLiveEchoAdapterProbe reports root unavailable when jedit root is missing", () => {
  const rootPath = path.join(os.tmpdir(), "warp-ttd-missing-jedit-root");
  const inspection = inspectLiveEchoAdapterProbe({
    rootPath,
    rootPosture: "MISSING"
  });

  assert.equal(inspection.target, "jedit");
  assert.equal(inspection.readOnly, true);
  assert.equal(inspection.bridgePosture, "ROOT_UNAVAILABLE");
  assert.equal(inspection.probePosture, "UNAVAILABLE");
  assert.equal(inspection.sessionProbePosture, "NOT_OPENED");
  assert.equal(inspection.bridge, null);
});

test("inspectLiveEchoAdapterProbe reports absent bridge under a present root", () => {
  const rootPath = tempJeditRoot();

  try {
    const inspection = inspectLiveEchoAdapterProbe({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.bridgePosture, "BRIDGE_ABSENT");
    assert.equal(inspection.probePosture, "UNAVAILABLE");
    assert.equal(inspection.sessionProbePosture, "NOT_OPENED");
    assert.match(inspection.reason, /not present/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoAdapterProbe reports present bridge for supported descriptor", () => {
  const rootPath = tempJeditRoot();

  try {
    writeProbeManifest(rootPath, supportedProbeManifest());
    const inspection = inspectLiveEchoAdapterProbe({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.schemaVersion, LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION);
    assert.equal(inspection.bridgePosture, "BRIDGE_PRESENT");
    assert.equal(inspection.probePosture, "PRESENT");
    assert.equal(inspection.sessionProbePosture, "SESSION_OBSTRUCTED");
    assert.deepEqual(inspection.supportedAbiVersions, [1]);
    assert.deepEqual(inspection.bridge, supportedProbeManifest());
    assert.match(inspection.reason, /session open remains obstructed/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoAdapterProbe reports unsupported ABI explicitly", () => {
  const rootPath = tempJeditRoot();

  try {
    writeProbeManifest(rootPath, {
      ...supportedProbeManifest(),
      abiVersion: 99
    });
    const inspection = inspectLiveEchoAdapterProbe({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.bridgePosture, "ABI_UNSUPPORTED");
    assert.equal(inspection.probePosture, "UNSUPPORTED");
    assert.equal(inspection.sessionProbePosture, "NOT_OPENED");
    assert.match(inspection.reason, /Unsupported Echo adapter ABI/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoAdapterProbe obstructs malformed descriptors", () => {
  const rootPath = tempJeditRoot();

  try {
    writeProbeManifest(rootPath, {
      schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
      bridgeKind: "echo"
    });
    const inspection = inspectLiveEchoAdapterProbe({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.bridgePosture, "PROBE_OBSTRUCTED");
    assert.equal(inspection.probePosture, "OBSTRUCTED");
    assert.equal(inspection.sessionProbePosture, "NOT_OPENED");
    assert.match(inspection.reason, /abiVersion/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

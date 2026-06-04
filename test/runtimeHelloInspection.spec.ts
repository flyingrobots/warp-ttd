import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  LIVE_ECHO_ADAPTER_PROBE_MANIFEST,
  LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION
} from "../src/app/echoAdapterProbe.ts";
import {
  defaultLiveTargetDescriptors,
  type ContinuumDebugTargetDescriptor
} from "../src/app/liveTargetInspection.ts";
import {
  CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION,
  inspectRuntimeHello
} from "../src/app/runtimeHelloInspection.ts";
import { createFixture } from "./helpers/gitWarpFixture.ts";

function writeEchoProbeManifest(rootPath: string, value: object): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_ADAPTER_PROBE_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(value));
}

test("inspectRuntimeHello reports missing roots as unavailable", async () => {
  const inspections = await inspectRuntimeHello(defaultLiveTargetDescriptors({
    jeditRoot: path.join(process.cwd(), "test", "missing-jedit"),
    graftRoot: path.join(process.cwd(), "test", "missing-graft")
  }));

  assert.deepEqual(
    inspections.map((inspection) => [
      inspection.target,
      inspection.helloPosture,
      inspection.evidencePosture,
      inspection.nativeContinuumWitness
    ]),
    [
      ["jedit", "UNAVAILABLE", "UNAVAILABLE", false],
      ["graft", "UNAVAILABLE", "UNAVAILABLE", false]
    ]
  );
  assert.ok(inspections.every((inspection) => inspection.hello === undefined));
  assert.ok(
    inspections.every((inspection) => (inspection.reason ?? "").includes("root is missing"))
  );
});

test("inspectRuntimeHello reports present git-warp roots as translated substrate", async () => {
  const fixture = await createFixture("runtime-hello-graft", "graft-ast");

  try {
    const inspections = await inspectRuntimeHello([
      {
        id: "graft",
        label: "graft local witness",
        appKind: "live git-warp app",
        connection: {
          mode: "git-warp",
          rootPath: fixture.tempDir,
          graphName: fixture.graphName
        }
      }
    ]);

    const graft = inspections[0];
    assert.ok(graft !== undefined);
    const hello = graft.hello;
    assert.ok(hello !== undefined);
    assert.equal(graft.schemaVersion, "warp-ttd.continuum-runtime-hello-inspection.v1");
    assert.equal(graft.helloPosture, "PRESENT");
    assert.equal(graft.evidencePosture, "TRANSLATED_SUBSTRATE");
    assert.equal(graft.nativeContinuumWitness, false);
    assert.equal(hello.schemaVersion, CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION);
    assert.equal(hello.runtime.runtimeKind, "git-warp");
    assert.equal(hello.posture.evidence, "TRANSLATED_SUBSTRATE");
    assert.equal(hello.posture.nativeContinuumWitness, false);
    assert.equal("evidence" in hello, false);
  } finally {
    await fixture.cleanup();
  }
});

test("inspectRuntimeHello obstructs unopenable git-warp roots", async () => {
  const graftRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-empty-graft-"));

  try {
    const inspections = await inspectRuntimeHello([
      {
        id: "graft",
        label: "empty graft witness",
        appKind: "live git-warp app",
        connection: {
          mode: "git-warp",
          rootPath: graftRoot,
          graphName: "graft-ast"
        }
      }
    ]);

    const graft = inspections[0];
    assert.ok(graft !== undefined);
    assert.equal(graft.helloPosture, "OBSTRUCTED");
    assert.equal(graft.evidencePosture, "UNAVAILABLE");
    assert.equal(graft.nativeContinuumWitness, false);
    assert.equal(graft.hello, undefined);
    assert.match(graft.reason ?? "", /git-warp session could not be opened/);
  } finally {
    fs.rmSync(graftRoot, { recursive: true, force: true });
  }
});

test("inspectRuntimeHello preserves unsupported Echo adapter probe posture", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeEchoProbeManifest(jeditRoot, {
      schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
      bridgeKind: "echo",
      abiVersion: 99,
      transport: "wasm"
    });

    const inspections = await inspectRuntimeHello([
      {
        id: "jedit",
        label: "jedit local witness",
        appKind: "live Echo app",
        connection: { mode: "echo-root", rootPath: jeditRoot }
      }
    ]);

    const jedit = inspections[0];
    assert.ok(jedit !== undefined);
    assert.equal(jedit.helloPosture, "UNSUPPORTED");
    assert.equal(jedit.evidencePosture, "UNAVAILABLE");
    assert.equal(jedit.nativeContinuumWitness, false);
    assert.equal(jedit.hello, undefined);
    assert.match(jedit.reason ?? "", /Unsupported Echo adapter ABI/);
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("inspectRuntimeHello surfaces obstructed Echo adapter probe reasons", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeEchoProbeManifest(jeditRoot, {
      schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
      bridgeKind: "not-echo",
      abiVersion: 1,
      transport: "wasm"
    });

    const inspections = await inspectRuntimeHello([
      {
        id: "jedit",
        label: "jedit local witness",
        appKind: "live Echo app",
        connection: { mode: "echo-root", rootPath: jeditRoot }
      }
    ]);

    const jedit = inspections[0];
    assert.ok(jedit !== undefined);
    assert.equal(jedit.helloPosture, "OBSTRUCTED");
    assert.equal(jedit.evidencePosture, "UNAVAILABLE");
    assert.equal(jedit.nativeContinuumWitness, false);
    assert.equal(jedit.hello, undefined);
    assert.match(jedit.reason ?? "", /bridgeKind echo/);
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("inspectRuntimeHello keeps unsupported and obstructed descriptors visible", async () => {
  const descriptors: readonly ContinuumDebugTargetDescriptor[] = [
    {
      id: "vendor-runtime",
      label: "Vendor runtime",
      appKind: "Continuum-compatible app",
      connection: {
        mode: "descriptor-only",
        reason: "No runtime hello producer yet."
      }
    },
    {
      id: "blocked-runtime",
      label: "Blocked runtime",
      connection: {
        mode: "descriptor-only",
        adapterPosture: "OBSTRUCTED",
        reason: "Runtime endpoint returned malformed hello JSON."
      }
    }
  ];

  const inspections = await inspectRuntimeHello({ descriptors });

  assert.deepEqual(
    inspections.map((inspection) => [
      inspection.target,
      inspection.helloPosture,
      inspection.evidencePosture,
      inspection.reason
    ]),
    [
      ["vendor-runtime", "UNSUPPORTED", "UNAVAILABLE", "No runtime hello producer yet."],
      [
        "blocked-runtime",
        "OBSTRUCTED",
        "UNAVAILABLE",
        "Runtime endpoint returned malformed hello JSON."
      ]
    ]
  );
  assert.ok(inspections.every((inspection) => inspection.hello === undefined));
});

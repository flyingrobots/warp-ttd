import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  defaultLiveTargetDescriptors,
  type ContinuumDebugTargetDescriptor
} from "../src/app/liveTargetInspection.ts";
import {
  CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION,
  inspectRuntimeHello
} from "../src/app/runtimeHelloInspection.ts";

test("inspectRuntimeHello reports default targets without upgrading evidence", () => {
  const inspections = inspectRuntimeHello(defaultLiveTargetDescriptors({
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
      ["jedit", "ABSENT", "UNAVAILABLE", false],
      ["graft", "PRESENT", "TRANSLATED_SUBSTRATE", false]
    ]
  );

  const graft = inspections.find((inspection) => inspection.target === "graft");
  assert.ok(graft !== undefined);
  const hello = graft.hello;
  assert.ok(hello !== undefined);
  assert.equal(graft.schemaVersion, "warp-ttd.continuum-runtime-hello-inspection.v1");
  assert.equal(hello.schemaVersion, CONTINUUM_RUNTIME_HELLO_SCHEMA_VERSION);
  assert.equal(hello.runtime.runtimeKind, "git-warp");
  assert.equal(hello.evidence.posture, "TRANSLATED_SUBSTRATE");
  assert.equal(hello.evidence.nativeContinuumWitness, false);
});

test("inspectRuntimeHello keeps unsupported and obstructed descriptors visible", () => {
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

  const inspections = inspectRuntimeHello({ descriptors });

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

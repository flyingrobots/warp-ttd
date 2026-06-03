import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  defaultLiveTargetDescriptors,
  inspectLiveTargets,
  liveTargetDescriptorsFromEnv,
  type ContinuumDebugTargetDescriptor
} from "../src/app/liveTargetInspection.ts";

test("inspectLiveTargets emits default Continuum witness descriptors", () => {
  const jeditRoot = path.join(process.cwd(), "test", "missing-jedit");
  const graftRoot = path.join(process.cwd(), "test", "missing-graft");
  const targets = inspectLiveTargets(defaultLiveTargetDescriptors({
    jeditRoot,
    graftRoot
  }));

  assert.deepEqual(
    targets.map((target) => [
      target.target,
      target.targetLabel,
      target.connectionMode,
      target.appKind
    ]),
    [
      ["jedit", "jedit local witness", "echo-root", "live Echo app"],
      ["graft", "graft local witness", "git-warp", "live git-warp app"]
    ]
  );

  assert.equal(targets.length, 2);
  const [jedit, graft] = targets;
  assert.ok(jedit !== undefined);
  assert.ok(graft !== undefined);
  assert.equal(jedit.rootPosture, "MISSING");
  assert.equal(jedit.adapterPosture, "UNAVAILABLE");
  assert.deepEqual(jedit.capabilities, [
    "ECHO_ADAPTER_PROBE",
    "SESSION_FAMILY_FACTS"
  ]);
  assert.equal(graft.rootPosture, "MISSING");
  assert.equal(graft.adapterPosture, "CONFIGURED");
  assert.deepEqual(graft.capabilities, ["GIT_WARP_SESSION"]);
});

test("inspectLiveTargets emits a descriptor-only target without app-specific code", () => {
  const descriptors: readonly ContinuumDebugTargetDescriptor[] = [
    {
      id: "vendor-demo",
      label: "Vendor demo runtime",
      appKind: "Continuum-compatible app",
      connection: {
        mode: "descriptor-only",
        reason: "Vendor runtime handshake is not implemented in this slice."
      }
    }
  ];

  const targets = inspectLiveTargets({ descriptors });

  assert.equal(targets.length, 1);
  const target = targets[0];
  assert.ok(target !== undefined);
  assert.equal(target.target, "vendor-demo");
  assert.equal(target.targetLabel, "Vendor demo runtime");
  assert.equal(target.connectionMode, "descriptor-only");
  assert.equal(target.hostKind, "CONTINUUM");
  assert.equal(target.appKind, "Continuum-compatible app");
  assert.equal(target.rootPosture, "NOT_APPLICABLE");
  assert.equal(target.adapterPosture, "UNSUPPORTED");
  assert.deepEqual(target.capabilities, ["DESCRIPTOR_ONLY"]);
  assert.match(target.reason, /Vendor runtime handshake/);
});

test("live target env descriptors keep unsupported and malformed entries visible", () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  const vendorRoot = path.join(process.cwd(), "test", "missing-vendor");
  process.env["WARP_TTD_TARGETS_JSON"] = JSON.stringify([
    {
      id: "vendor-runtime",
      connection: { mode: "vendor-continuum", rootPath: vendorRoot }
    },
    {
      label: "missing id",
      connection: { mode: "echo-root" }
    }
  ]);

  try {
    const targets = inspectLiveTargets(liveTargetDescriptorsFromEnv());

    assert.equal(targets.length, 2);
    const [unsupported, obstructed] = targets;
    assert.ok(unsupported !== undefined);
    assert.ok(obstructed !== undefined);
    assert.equal(unsupported.target, "vendor-runtime");
    assert.equal(unsupported.connectionMode, "descriptor-only");
    assert.equal(unsupported.adapterPosture, "UNSUPPORTED");
    assert.equal(unsupported.rootPath, vendorRoot);
    assert.match(unsupported.reason, /vendor-continuum/);
    assert.equal(obstructed.target, "warp-ttd-target-descriptor-1");
    assert.equal(obstructed.connectionMode, "descriptor-only");
    assert.equal(obstructed.adapterPosture, "OBSTRUCTED");
    assert.match(obstructed.reason, /id.*non-empty string/);
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
  }
});

test("live target env descriptors obstruct duplicate ids deterministically", () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  process.env["WARP_TTD_TARGETS_JSON"] = JSON.stringify([
    {
      id: "same-runtime",
      connection: { mode: "descriptor-only" }
    },
    {
      id: "same-runtime",
      connection: { mode: "descriptor-only" }
    }
  ]);

  try {
    const targets = inspectLiveTargets(liveTargetDescriptorsFromEnv());

    assert.deepEqual(targets.map((target) => target.target), [
      "same-runtime",
      "same-runtime"
    ]);
    assert.deepEqual(targets.map((target) => target.adapterPosture), [
      "OBSTRUCTED",
      "OBSTRUCTED"
    ]);
    assert.ok(targets.every((target) => target.reason.includes("Duplicate target descriptor id")));
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
  }
});

test("live target env git-warp descriptors require graphName", () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  const vendorRoot = path.join(process.cwd(), "test", "missing-git-warp-vendor");
  process.env["WARP_TTD_TARGETS_JSON"] = JSON.stringify([
    {
      id: "vendor-git-warp",
      connection: { mode: "git-warp", rootPath: vendorRoot }
    }
  ]);

  try {
    const targets = inspectLiveTargets(liveTargetDescriptorsFromEnv());

    assert.equal(targets.length, 1);
    const target = targets[0];
    assert.ok(target !== undefined);
    assert.equal(target.target, "vendor-git-warp");
    assert.equal(target.connectionMode, "descriptor-only");
    assert.equal(target.adapterPosture, "OBSTRUCTED");
    assert.match(target.reason, /git-warp.*graphName/);
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
  }
});

test("live target env descriptor parse errors are obstructed target facts", () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  process.env["WARP_TTD_TARGETS_JSON"] = "[";

  try {
    const targets = inspectLiveTargets(liveTargetDescriptorsFromEnv());

    assert.equal(targets.length, 1);
    const target = targets[0];
    assert.ok(target !== undefined);
    assert.equal(target.target, "warp-ttd-targets-json");
    assert.equal(target.connectionMode, "descriptor-only");
    assert.equal(target.adapterPosture, "OBSTRUCTED");
    assert.match(target.reason, /could not be parsed/);
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
  }
});

test("live target env descriptor non-array JSON is an obstructed target fact", () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  process.env["WARP_TTD_TARGETS_JSON"] = "{}";

  try {
    const targets = inspectLiveTargets(liveTargetDescriptorsFromEnv());

    assert.equal(targets.length, 1);
    const target = targets[0];
    assert.ok(target !== undefined);
    assert.equal(target.target, "warp-ttd-targets-json");
    assert.equal(target.targetLabel, "WARP_TTD_TARGETS_JSON");
    assert.equal(target.connectionMode, "descriptor-only");
    assert.equal(target.adapterPosture, "OBSTRUCTED");
    assert.match(target.reason, /must be a JSON array/);
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  LIVE_ECHO_FAMILY_FACTS_MANIFEST,
  inspectLiveEchoFamilyIntake
} from "../src/app/liveEchoFamilyIntake.ts";

function tempJeditRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));
}

function writeManifest(rootPath: string, publishedFields: readonly string[]): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_FAMILY_FACTS_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: "warp-ttd.live-echo-family-intake.v1",
      publishedFields
    })
  );
}

test("inspectLiveEchoFamilyIntake reports unavailable facts when jedit root is missing", () => {
  const rootPath = path.join(os.tmpdir(), "warp-ttd-missing-jedit-root");
  const inspection = inspectLiveEchoFamilyIntake({
    rootPath,
    rootPosture: "MISSING"
  });

  assert.equal(inspection.target, "jedit");
  assert.equal(inspection.readOnly, true);
  assert.equal(inspection.intakePosture, "UNAVAILABLE");
  assert.equal(inspection.manifestPosture, "MISSING");
  assert.deepEqual(
    inspection.facts.map((fact) => [fact.field, fact.posture, fact.origin]),
    [
      ["neighborhoodCore", "ABSENT", "UNAVAILABLE"],
      ["reintegrationDetail", "ABSENT", "UNAVAILABLE"],
      ["receiptShell", "ABSENT", "UNAVAILABLE"]
    ]
  );
});

test("inspectLiveEchoFamilyIntake reports host-published manifest fields", () => {
  const rootPath = tempJeditRoot();

  try {
    writeManifest(rootPath, ["neighborhoodCore", "receiptShell"]);
    const inspection = inspectLiveEchoFamilyIntake({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.intakePosture, "PRESENT");
    assert.equal(inspection.manifestPosture, "PRESENT");
    assert.deepEqual(
      inspection.facts.map((fact) => [fact.field, fact.posture, fact.origin]),
      [
        ["neighborhoodCore", "PRESENT", "HOST_PUBLISHED"],
        ["reintegrationDetail", "ABSENT", "UNAVAILABLE"],
        ["receiptShell", "PRESENT", "HOST_PUBLISHED"]
      ]
    );
    assert.equal(
      inspection.generatedFamilyConsumption.consumerPosture,
      "LOCAL_MIRROR_FALLBACK"
    );
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoFamilyIntake obstructs malformed manifests", () => {
  const rootPath = tempJeditRoot();

  try {
    writeManifest(rootPath, ["neighborhoodCore", "unknown-field"]);
    const inspection = inspectLiveEchoFamilyIntake({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.intakePosture, "OBSTRUCTED");
    assert.equal(inspection.manifestPosture, "OBSTRUCTED");
    assert.equal(inspection.facts[0]?.posture, "OBSTRUCTED");
    assert.match(inspection.reason, /publishedFields/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

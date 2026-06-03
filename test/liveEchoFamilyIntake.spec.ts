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

const GENERATED_ARTIFACT_ROOT = "dist/generated/continuum-echo-inspect";
const REQUIRED_GENERATED_FILES = [
  "schemas.generated.ts",
  "ops.generated.ts",
  "client.generated.ts"
] as const;

function generatedArtifactDescriptor(): object {
  return {
    family: "continuum",
    target: "echo-inspect",
    schemaVersion: "continuum.echo.inspect-ir/v1",
    artifactRoot: GENERATED_ARTIFACT_ROOT,
    requiredFiles: REQUIRED_GENERATED_FILES
  };
}

function writeGeneratedArtifacts(rootPath: string): void {
  for (const file of REQUIRED_GENERATED_FILES) {
    const filePath = path.join(rootPath, GENERATED_ARTIFACT_ROOT, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// generated fixture\n");
  }
}

function writeManifest(
  rootPath: string,
  publishedFields: readonly string[],
  extra: object = {}
): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_FAMILY_FACTS_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: "warp-ttd.live-echo-family-intake.v1",
      publishedFields,
      ...extra
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
    assert.equal(inspection.generatedFamilyConsumption.artifactPosture, "ABSENT");
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoFamilyIntake reports present Wesley-generated Echo family artifacts", () => {
  const rootPath = tempJeditRoot();

  try {
    writeGeneratedArtifacts(rootPath);
    writeManifest(rootPath, ["neighborhoodCore"], {
      generatedFamilyArtifacts: [generatedArtifactDescriptor()]
    });
    const inspection = inspectLiveEchoFamilyIntake({
      rootPath,
      rootPosture: "PRESENT"
    });

    const consumption = inspection.generatedFamilyConsumption;
    assert.equal(consumption.consumerPosture, "GENERATED_FAMILY_PRESENT");
    assert.equal(consumption.artifactPosture, "PRESENT");
    assert.deepEqual(
      consumption.artifacts.map((artifact) => [
        artifact.family,
        artifact.target,
        artifact.artifactPosture,
        artifact.missingFiles
      ]),
      [
        [
          "continuum",
          "echo-inspect",
          "PRESENT",
          []
        ]
      ]
    );
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoFamilyIntake reports unavailable generated artifacts when declared files are missing", () => {
  const rootPath = tempJeditRoot();

  try {
    writeManifest(rootPath, ["neighborhoodCore"], {
      generatedFamilyArtifacts: [generatedArtifactDescriptor()]
    });
    const inspection = inspectLiveEchoFamilyIntake({
      rootPath,
      rootPosture: "PRESENT"
    });

    const consumption = inspection.generatedFamilyConsumption;
    assert.equal(consumption.consumerPosture, "GENERATED_FAMILY_UNAVAILABLE");
    assert.equal(consumption.artifactPosture, "OBSTRUCTED");
    assert.deepEqual(consumption.artifacts[0]?.missingFiles, REQUIRED_GENERATED_FILES);
    assert.match(consumption.reason, /missing generated/);
  } finally {
    fs.rmSync(rootPath, { recursive: true, force: true });
  }
});

test("inspectLiveEchoFamilyIntake obstructs invalid generated artifact descriptors", () => {
  const rootPath = tempJeditRoot();

  try {
    writeManifest(rootPath, ["neighborhoodCore"], {
      generatedFamilyArtifacts: [
        {
          ...generatedArtifactDescriptor(),
          artifactRoot: "/tmp/generated"
        }
      ]
    });
    const inspection = inspectLiveEchoFamilyIntake({
      rootPath,
      rootPosture: "PRESENT"
    });

    assert.equal(inspection.intakePosture, "OBSTRUCTED");
    assert.equal(inspection.manifestPosture, "OBSTRUCTED");
    assert.match(inspection.reason, /target-root-relative/);
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

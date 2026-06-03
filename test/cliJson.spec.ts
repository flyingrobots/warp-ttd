/**
 * CLI --json output contract tests.
 *
 * Pins the JSONL output format: every line must be valid JSON with
 * an "envelope" field identifying the protocol type.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { inspectLiveTargets } from "../src/app/liveTargetInspection.ts";
import {
  LIVE_ECHO_ADAPTER_PROBE_MANIFEST,
  LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION
} from "../src/app/echoAdapterProbe.ts";
import { LIVE_ECHO_FAMILY_FACTS_MANIFEST } from "../src/app/liveEchoFamilyIntake.ts";
import {
  requireArray,
  requireRecord,
  type JsonObject,
  type JsonValue
} from "./helpers/jsonTestUtils.ts";

const exec = promisify(execFile);

const CLI = "./src/cli.ts";
const NODE_ARGS = ["--experimental-strip-types", CLI];
const GENERATED_ARTIFACT_ROOT = "dist/generated/continuum-echo-inspect";
const REQUIRED_GENERATED_FILES = [
  "schemas.generated.ts",
  "ops.generated.ts",
  "client.generated.ts"
] as const;

interface EnvelopeLine {
  envelope: string;
  data?: JsonObject;
  label?: string;
}

interface JeditFamilyIntakeExpectation {
  intakePosture: string;
  consumerPosture?: string;
  artifactPosture?: string;
}

async function runJson(command: string): Promise<string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, command, "--json"]);
  const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
  return lines;
}

async function runJsonWithEnv(command: string, env: NodeJS.ProcessEnv): Promise<string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, command, "--json"], {
    env: { ...process.env, ...env }
  });
  const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
  return lines;
}

function parseLine(line: string): EnvelopeLine {
  const parsed = JSON.parse(line) as EnvelopeLine;
  assert.equal(typeof parsed.envelope, "string", `Missing envelope field in: ${line}`);
  return parsed;
}

function requireLine(lines: string[], index: number): string {
  const line = lines[index];
  assert.ok(line !== undefined, `Expected line at index ${index.toString()}`);
  return line;
}

function targetLabel(target: JsonObject): string {
  const value = target["target"];
  return typeof value === "string" ? value : "target";
}

function requireString(value: JsonValue | object | undefined, label: string): string {
  assert.equal(typeof value, "string", `${label} must be a string`);
  return value as string;
}

function assertAdmissionFact(value: JsonValue | object | undefined, label: string): JsonObject {
  const fact = requireRecord(value, label);
  assert.equal(typeof fact["field"], "string", `${label}.field`);
  const posture = fact["posture"];
  if (typeof posture !== "string") {
    assert.fail(`${label}.posture must be a string`);
  }
  assert.ok(
    ["ABSENT", "PRESENT", "OBSTRUCTED"].includes(posture),
    `${label}.posture must be a known posture`
  );

  if (posture === "PRESENT") {
    assert.ok("value" in fact, `${label}.value must be present`);
  } else {
    assert.equal(typeof fact["reason"], "string", `${label}.reason`);
  }

  return fact;
}

function assertAdmissionChainFact(
  value: JsonValue | object | undefined,
  label: string
): JsonObject {
  const fact = requireRecord(value, label);
  assert.equal(typeof fact["key"], "string", `${label}.key`);
  assert.equal(typeof fact["label"], "string", `${label}.label`);
  assert.equal("posture" in fact, false, `${label}.posture must be nested on value`);

  const nested = assertAdmissionFact(fact["value"], `${label}.value`);
  assert.equal(nested["field"], fact["key"], `${label}.value.field`);
  assertGeneratedFamilyFact(fact["sourceFamily"], `${label}.sourceFamily`);
  return fact;
}

function assertGeneratedFamilyFact(
  value: JsonValue | object | undefined,
  label: string
): JsonObject {
  const fact = requireRecord(value, label);
  const posture = requireString(fact["posture"], `${label}.posture`);
  const origin = requireString(fact["origin"], `${label}.origin`);
  const scope = requireString(fact["scope"], `${label}.scope`);
  assert.ok(
    ["ABSENT", "PRESENT", "OBSTRUCTED"].includes(posture),
    `${label}.posture`
  );
  assert.ok(
    ["GENERATED_PAYLOAD", "HOST_PUBLISHED", "TRANSLATED_SUBSTRATE", "LOCAL_FALLBACK", "UNAVAILABLE"]
      .includes(origin),
    `${label}.origin`
  );
  assert.ok(["SESSION", "COORDINATE", "TARGET"].includes(scope));
  const source = requireRecord(fact["source"], `${label}.source`);
  assert.equal(typeof source["family"], "string", `${label}.source.family`);
  if (posture === "PRESENT") return fact;
  assert.equal(typeof fact["reason"], "string", `${label}.reason`);
  return fact;
}

function assertJeditFamilyIntake(
  value: JsonValue | object | undefined,
  expectation: JeditFamilyIntakeExpectation
): JsonObject {
  const consumerPosture = expectation.consumerPosture ?? "LOCAL_MIRROR_FALLBACK";
  const artifactPosture = expectation.artifactPosture ?? "ABSENT";
  const intake = requireRecord(value, "jedit.sessionFamilyIntake");
  assert.equal(intake["schemaVersion"], "warp-ttd.live-echo-family-intake.v1");
  assert.equal(intake["target"], "jedit");
  assert.equal(intake["readOnly"], true);
  assert.equal(intake["intakePosture"], expectation.intakePosture);
  const facts = requireArray(intake["facts"], "jedit.sessionFamilyIntake.facts");
  assert.deepEqual(
    facts.map((fact) => requireRecord(fact, "intakeFact")["field"]),
    ["neighborhoodCore", "reintegrationDetail", "receiptShell"]
  );
  const generated = requireRecord(
    intake["generatedFamilyConsumption"],
    "jedit.sessionFamilyIntake.generatedFamilyConsumption"
  );
  assert.equal(generated["consumerPosture"], consumerPosture);
  assert.equal(generated["artifactPosture"], artifactPosture);
  requireArray(generated["artifacts"], "jedit.generatedFamilyConsumption.artifacts");
  return intake;
}

function assertEchoAdapterProbe(
  value: JsonValue | object | undefined,
  expectedBridgePosture: string,
  expectedProbePosture: string
): JsonObject {
  const probe = requireRecord(value, "jedit.echoAdapterProbe");
  assert.equal(probe["schemaVersion"], LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION);
  assert.equal(probe["target"], "jedit");
  assert.equal(probe["hostKind"], "ECHO");
  assert.equal(probe["readOnly"], true);
  assert.equal(probe["bridgePosture"], expectedBridgePosture);
  assert.equal(probe["probePosture"], expectedProbePosture);
  assert.equal(Array.isArray(probe["supportedAbiVersions"]), true);
  assert.equal(typeof probe["reason"], "string");
  return probe;
}

function assertMissingGraftLiveTargetInspection(
  graft: JsonObject | undefined
): void {
  assert.ok(graft !== undefined);
  assert.equal(graft["target"], "graft");
  assert.equal(graft["targetLabel"], "graft local witness");
  assert.equal(graft["connectionMode"], "git-warp");
  assert.equal(graft["hostKind"], "GIT_WARP");
  assert.equal(graft["appKind"], "live git-warp app");
  assert.equal(graft["readOnly"], true);
  assert.equal(graft["rootPosture"], "MISSING");
  assert.equal(graft["adapterPosture"], "CONFIGURED");
  assert.equal(graft["graphName"], "graft-ast");
  assert.deepEqual(graft["capabilities"], ["GIT_WARP_SESSION"]);
  assert.equal(graft["admissionChainPosture"], "UNAVAILABLE");
  const graftEvidence = requireRecord(
    graft["runtimeBoundaryEvidence"],
    "graft.runtimeBoundaryEvidence"
  );
  assert.equal(graftEvidence["posture"], "TRANSLATED_SUBSTRATE");
  assert.equal(graftEvidence["substrate"], "git-warp");
  assert.equal(graftEvidence["evidenceKind"], "warp-index");
  assert.equal(graftEvidence["nativeContinuumWitness"], false);
}

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

function writeJeditManifest(
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

function writeEchoAdapterProbeManifest(rootPath: string): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_ADAPTER_PROBE_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION,
      bridgeKind: "echo",
      abiVersion: 1,
      transport: "wasm"
    })
  );
}

function assertAdmissionChainKeys(factRecords: readonly JsonObject[]): void {
  assert.deepEqual(
    factRecords.map((fact) => fact["key"]),
    [
      "basis",
      "artifactRegistration",
      "opticArtifactHandle",
      "opticAdmissionRequirements",
      "capabilityGrant",
      "capabilityPresentation",
      "admissionTicket",
      "lawWitness",
      "receipts",
      "reading"
    ]
  );
}

function assertAdmissionChainPostures(factRecords: readonly JsonObject[]): void {
  assert.deepEqual(
    factRecords.map((fact) => requireRecord(fact["value"], "AdmissionChainFact.value")["posture"]),
    [
      "PRESENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "ABSENT",
      "PRESENT"
    ]
  );
}

function assertSourceFamilyFacts(
  data: JsonObject,
  factRecords: readonly JsonObject[]
): void {
  const sourceFamilyFacts = requireArray(data["sourceFamilyFacts"], "sourceFamilyFacts");
  assert.deepEqual(
    sourceFamilyFacts.map((fact) =>
      requireRecord(fact, "AdmissionChainSourceFamilyFact")["field"]
    ),
    factRecords.map((fact) => fact["key"])
  );
}

function assertAdmissionChainSourceFamilies(
  data: JsonObject,
  factRecords: readonly JsonObject[]
): void {
  assertSourceFamilyFacts(data, factRecords);
  const capabilityGrantSource = assertGeneratedFamilyFact(
    factRecords[4]?.["sourceFamily"],
    "capabilityGrant.sourceFamily"
  );
  assert.equal(
    requireRecord(capabilityGrantSource["source"], "capabilityGrant.source")["family"],
    "authority"
  );
  assert.equal(capabilityGrantSource["posture"], "ABSENT");
  assert.equal(capabilityGrantSource["origin"], "UNAVAILABLE");
  const readingSource = assertGeneratedFamilyFact(
    factRecords[9]?.["sourceFamily"],
    "reading.sourceFamily"
  );
  assert.equal(requireRecord(readingSource["source"], "reading.source")["artifact"], "ReadingEnvelope");
  assert.equal(readingSource["posture"], "PRESENT");
  assert.equal(readingSource["origin"], "LOCAL_FALLBACK");
}

test("hello --json outputs a single HostHello JSONL line", async () => {
  const lines = await runJson("hello");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "HostHello");
  assert.ok(obj.data !== undefined);
  assert.equal(obj.data["protocolVersion"], "0.7.0");
});

test("catalog --json outputs a single LaneCatalog JSONL line", async () => {
  const lines = await runJson("catalog");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "LaneCatalog");
  assert.ok(obj.data !== undefined);
});

test("frame --json outputs PlaybackHeadSnapshot, PlaybackFrame, and ReceiptSummary lines", async () => {
  const lines = await runJson("frame");
  assert.ok(lines.length >= 2, "Expected at least head + frame lines");

  const envelopes = lines.map((l) => parseLine(l).envelope);
  assert.ok(envelopes.includes("PlaybackHeadSnapshot"));
  assert.ok(envelopes.includes("PlaybackFrame"));
});

test("step --json outputs exact sequence: before, stepped, after, receipts", async () => {
  const lines = await runJson("step");
  const parsed = lines.map((l) => parseLine(l));
  const sequence = parsed.map((p) => `${p.envelope}${p.label !== undefined ? `:${p.label}` : ""}`);

  // Pin exact sequence: head(before), frame(stepped), head(after), then receipts
  assert.equal(sequence[0], "PlaybackHeadSnapshot:before");
  assert.equal(sequence[1], "PlaybackFrame:stepped");
  assert.equal(sequence[2], "PlaybackHeadSnapshot:after");

  // Remaining lines (if any) must all be ReceiptSummary
  for (const entry of sequence.slice(3)) {
    assert.equal(entry, "ReceiptSummary");
  }
});

test("--json stdout contains no human-readable text", async () => {
  const lines = await runJson("hello");

  for (const line of lines) {
    assert.ok(line.startsWith("{"), `Non-JSON line found: ${line}`);
    JSON.parse(line);
  }
});

test("demo --json outputs multiple envelope lines", async () => {
  const lines = await runJson("demo");
  assert.ok(lines.length >= 5, "Demo should produce multiple envelope lines");

  for (const line of lines) {
    parseLine(line);
  }
});

test("effects --json at frame 0 returns no envelopes (correct: no emissions at frame 0)", async () => {
  const lines = await runJson("effects");
  assert.equal(lines.length, 0);
});

test("deliveries --json at frame 0 returns no envelopes (correct: no deliveries at frame 0)", async () => {
  const lines = await runJson("deliveries");
  assert.equal(lines.length, 0);
});

test("demo --json includes EffectEmissionSummary and DeliveryObservationSummary after stepping", async () => {
  const lines = await runJson("demo");
  const envelopes = lines.map((l) => parseLine(l).envelope);

  assert.ok(
    envelopes.includes("EffectEmissionSummary"),
    "Demo should include effect emissions after stepping"
  );
  assert.ok(
    envelopes.includes("DeliveryObservationSummary"),
    "Demo should include delivery observations after stepping"
  );
});

test("context --json outputs a single ExecutionContext line", async () => {
  const lines = await runJson("context");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "ExecutionContext");
  assert.ok(obj.data !== undefined);
});

test("session --json outputs a single SerializedSession line", async () => {
  const lines = await runJson("session");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "SerializedSession");
  assert.ok(obj.data !== undefined);
  assert.equal(typeof obj.data["sessionId"], "string");
  assert.equal(obj.data["activeHeadId"], "head:main");
  const snapshot = requireRecord(obj.data["snapshot"], "SerializedSession.snapshot");
  const sessionFamilyFacts = requireArray(
    snapshot["sessionFamilyFacts"],
    "SerializedSession.snapshot.sessionFamilyFacts"
  );
  const neighborhoodFact = sessionFamilyFacts
    .map((fact) => requireRecord(fact, "sessionFamilyFact"))
    .find((fact) => fact["field"] === "neighborhoodCore");
  assert.ok(neighborhoodFact !== undefined);
  const neighborhoodCore = assertGeneratedFamilyFact(
    neighborhoodFact,
    "sessionFamilyFacts.neighborhoodCore"
  );
  assert.equal(neighborhoodCore["origin"], "HOST_PUBLISHED");
  assert.ok(Array.isArray(obj.data["pins"]));
});

test("admission-chain --json outputs the versioned read model", async () => {
  const lines = await runJson("admission-chain");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "AdmissionChainReadModel");
  const data = requireRecord(obj.data, "AdmissionChainReadModel.data");
  assert.equal(data["schemaVersion"], "warp-ttd.admission-chain.v1");

  const facts = requireArray(data["facts"], "facts");
  const factRecords = facts.map((fact, index) =>
    assertAdmissionChainFact(fact, `AdmissionChainFact[${index.toString()}]`)
  );
  assertAdmissionChainKeys(factRecords);
  assertAdmissionChainPostures(factRecords);
  assertAdmissionChainSourceFamilies(data, factRecords);
  assert.equal(
    requireRecord(data["artifactRegistration"], "artifactRegistration")["posture"],
    "ABSENT"
  );
  assert.equal(requireRecord(data["reading"], "reading")["posture"], "PRESENT");
});

test("targets --json names jedit and graft as read-only live target inspections", async () => {
  const lines = await runJsonWithEnv("targets", {
    WARP_TTD_JEDIT_ROOT: path.join(process.cwd(), "test", "missing-jedit"),
    WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
  });
  assert.equal(lines.length, 2);

  const parsed = lines.map((line) => parseLine(line));
  assert.deepEqual(parsed.map((entry) => entry.envelope), [
    "LiveTargetInspection",
    "LiveTargetInspection"
  ]);

  const [jedit, graft] = parsed.map((entry) => entry.data);
  assert.ok(jedit !== undefined);
  assert.ok(graft !== undefined);
  assert.equal(jedit["target"], "jedit");
  assert.equal(jedit["targetLabel"], "jedit local witness");
  assert.equal(jedit["connectionMode"], "echo-root");
  assert.equal(jedit["hostKind"], "ECHO");
  assert.equal(jedit["appKind"], "live Echo app");
  assert.equal(jedit["readOnly"], true);
  assert.equal(jedit["rootPosture"], "MISSING");
  assert.equal(jedit["adapterPosture"], "UNAVAILABLE");
  assert.equal(jedit["admissionChainPosture"], "UNAVAILABLE");
  assert.deepEqual(jedit["capabilities"], [
    "ECHO_ADAPTER_PROBE",
    "SESSION_FAMILY_FACTS"
  ]);
  assertEchoAdapterProbe(jedit["echoAdapterProbe"], "ROOT_UNAVAILABLE", "UNAVAILABLE");
  const jeditEvidence = requireRecord(
    jedit["runtimeBoundaryEvidence"],
    "jedit.runtimeBoundaryEvidence"
  );
  assert.equal(jeditEvidence["posture"], "UNAVAILABLE");
  assert.equal(jeditEvidence["nativeContinuumWitness"], false);
  assertJeditFamilyIntake(jedit["sessionFamilyIntake"], {
    intakePosture: "UNAVAILABLE"
  });

  assertMissingGraftLiveTargetInspection(graft);
});

test("targets --json reports a descriptor-only Continuum target", async () => {
  const lines = await runJsonWithEnv("targets", {
    WARP_TTD_TARGETS_JSON: JSON.stringify([
      {
        id: "vendor-demo",
        label: "Vendor demo runtime",
        appKind: "Continuum-compatible app",
        connection: {
          mode: "descriptor-only",
          reason: "Vendor runtime handshake is not implemented in this slice."
        }
      }
    ])
  });
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "LiveTargetInspection");
  const target = requireRecord(obj.data, "vendor-demo target");
  assert.equal(target["target"], "vendor-demo");
  assert.equal(target["targetLabel"], "Vendor demo runtime");
  assert.equal(target["connectionMode"], "descriptor-only");
  assert.equal(target["hostKind"], "CONTINUUM");
  assert.equal(target["appKind"], "Continuum-compatible app");
  assert.equal(target["rootPosture"], "NOT_APPLICABLE");
  assert.equal(target["adapterPosture"], "UNSUPPORTED");
  assert.deepEqual(target["capabilities"], ["DESCRIPTOR_ONLY"]);
  assert.match(requireString(target["reason"], "vendor-demo.reason"), /Vendor runtime/);
});

test("targets --json reports jedit live Echo family intake manifest", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeJeditManifest(jeditRoot, ["neighborhoodCore"]);
    const lines = await runJsonWithEnv("targets", {
      WARP_TTD_JEDIT_ROOT: jeditRoot,
      WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
    });
    const jedit = lines
      .map((line) => requireRecord(parseLine(line).data, "target"))
      .find((target) => target["target"] === "jedit");

    assert.ok(jedit !== undefined);
    assert.equal(jedit["rootPosture"], "PRESENT");
    assert.equal(jedit["adapterPosture"], "UNAVAILABLE");
    assertEchoAdapterProbe(jedit["echoAdapterProbe"], "BRIDGE_ABSENT", "UNAVAILABLE");
    const intake = assertJeditFamilyIntake(jedit["sessionFamilyIntake"], {
      intakePosture: "PRESENT"
    });
    const facts = requireArray(intake["facts"], "jedit.sessionFamilyIntake.facts")
      .map((fact) => requireRecord(fact, "intakeFact"));
    assert.equal(facts[0]?.["posture"], "PRESENT");
    assert.equal(facts[1]?.["posture"], "ABSENT");
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("targets --json reports jedit Wesley-generated Echo family artifact posture", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeGeneratedArtifacts(jeditRoot);
    writeJeditManifest(jeditRoot, ["neighborhoodCore"], {
      generatedFamilyArtifacts: [generatedArtifactDescriptor()]
    });
    const lines = await runJsonWithEnv("targets", {
      WARP_TTD_JEDIT_ROOT: jeditRoot,
      WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
    });
    const jedit = lines
      .map((line) => requireRecord(parseLine(line).data, "target"))
      .find((target) => target["target"] === "jedit");

    assert.ok(jedit !== undefined);
    const intake = assertJeditFamilyIntake(
      jedit["sessionFamilyIntake"],
      {
        intakePosture: "PRESENT",
        consumerPosture: "GENERATED_FAMILY_PRESENT",
        artifactPosture: "PRESENT"
      }
    );
    const consumption = requireRecord(
      intake["generatedFamilyConsumption"],
      "jedit.generatedFamilyConsumption"
    );
    const artifacts = requireArray(
      consumption["artifacts"],
      "jedit.generatedFamilyConsumption.artifacts"
    ).map((artifact) => requireRecord(artifact, "generated artifact"));
    assert.deepEqual(
      artifacts.map((artifact) => [
        artifact["family"],
        artifact["target"],
        artifact["artifactPosture"]
      ]),
      [["continuum", "echo-inspect", "PRESENT"]]
    );
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("targets --json reports supported jedit Echo adapter probe separately from family intake", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeEchoAdapterProbeManifest(jeditRoot);
    const lines = await runJsonWithEnv("targets", {
      WARP_TTD_JEDIT_ROOT: jeditRoot,
      WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
    });
    const jedit = lines
      .map((line) => requireRecord(parseLine(line).data, "target"))
      .find((target) => target["target"] === "jedit");

    assert.ok(jedit !== undefined);
    assert.equal(jedit["rootPosture"], "PRESENT");
    assert.equal(jedit["adapterPosture"], "CONFIGURED");
    const probe = assertEchoAdapterProbe(
      jedit["echoAdapterProbe"],
      "BRIDGE_PRESENT",
      "PRESENT"
    );
    assert.equal(probe["sessionProbePosture"], "SESSION_OBSTRUCTED");
    assertJeditFamilyIntake(jedit["sessionFamilyIntake"], {
      intakePosture: "UNAVAILABLE"
    });
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("targets --json never reports native Continuum evidence without native witnesshood", async () => {
  const lines = await runJsonWithEnv("targets", {
    WARP_TTD_JEDIT_ROOT: path.join(process.cwd(), "test", "missing-jedit"),
    WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
  });
  const parsed = lines.map((line) => parseLine(line));

  for (const entry of parsed) {
    const data = requireRecord(entry.data, `${entry.envelope}.data`);
    const evidence = requireRecord(
      data["runtimeBoundaryEvidence"],
      `${targetLabel(data)}.runtimeBoundaryEvidence`
    );

    if (evidence["posture"] === "CONTINUUM_NATIVE") {
      assert.equal(evidence["nativeContinuumWitness"], true);
    } else {
      assert.equal(evidence["nativeContinuumWitness"], false);
    }
  }
});

test("target-session --json reports live target session posture", async () => {
  const lines = await runJsonWithEnv("target-session", {
    WARP_TTD_JEDIT_ROOT: path.join(process.cwd(), "test", "missing-jedit"),
    WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
  });
  assert.equal(lines.length, 2);

  const jeditObj = parseLine(requireLine(lines, 0));
  assert.equal(jeditObj.envelope, "LiveTargetSessionInspection");
  const jedit = requireRecord(jeditObj.data, "jedit LiveTargetSessionInspection.data");
  assert.equal(jedit["target"], "jedit");
  assert.equal(jedit["targetLabel"], "jedit local witness");
  assert.equal(jedit["connectionMode"], "echo-root");
  assert.equal(jedit["hostKind"], "ECHO");
  assert.equal(jedit["readOnly"], true);
  assert.equal(jedit["adapterPosture"], "UNAVAILABLE");
  assert.equal(jedit["sessionPosture"], "OBSTRUCTED");
  assertEchoAdapterProbe(jedit["echoAdapterProbe"], "ROOT_UNAVAILABLE", "UNAVAILABLE");
  assertJeditFamilyIntake(jedit["sessionFamilyIntake"], {
    intakePosture: "UNAVAILABLE"
  });

  const obj = parseLine(requireLine(lines, 1));
  assert.equal(obj.envelope, "LiveTargetSessionInspection");

  const data = requireRecord(obj.data, "LiveTargetSessionInspection.data");
  assert.equal(data["target"], "graft");
  assert.equal(data["targetLabel"], "graft local witness");
  assert.equal(data["connectionMode"], "git-warp");
  assert.equal(data["hostKind"], "GIT_WARP");
  assert.equal(data["readOnly"], true);
  assert.equal(data["rootPosture"], "MISSING");
  assert.equal(data["adapterPosture"], "CONFIGURED");
  assert.equal(data["sessionPosture"], "OBSTRUCTED");
  assert.equal(typeof data["reason"], "string");
  assert.equal("session" in data, false);
});

test("target-session --json reports descriptor-only Continuum target as obstructed", async () => {
  const lines = await runJsonWithEnv("target-session", {
    WARP_TTD_TARGETS_JSON: JSON.stringify([
      {
        id: "vendor-demo",
        label: "Vendor demo runtime",
        appKind: "Continuum-compatible app",
        connection: {
          mode: "descriptor-only",
          reason: "Vendor runtime handshake is not implemented in this slice."
        }
      }
    ])
  });
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "LiveTargetSessionInspection");
  const target = requireRecord(obj.data, "vendor-demo LiveTargetSessionInspection.data");
  assert.equal(target["target"], "vendor-demo");
  assert.equal(target["targetLabel"], "Vendor demo runtime");
  assert.equal(target["connectionMode"], "descriptor-only");
  assert.equal(target["hostKind"], "CONTINUUM");
  assert.equal(target["appKind"], "Continuum-compatible app");
  assert.equal(target["readOnly"], true);
  assert.equal(target["adapterPosture"], "UNSUPPORTED");
  assert.equal(target["sessionPosture"], "OBSTRUCTED");
  assert.match(requireString(target["reason"], "vendor-demo.reason"), /runtime handshake/);
  assert.equal("session" in target, false);
});

test("target-session --json preserves descriptor obstruction reasons", async () => {
  const lines = await runJsonWithEnv("target-session", {
    WARP_TTD_TARGETS_JSON: JSON.stringify([
      {
        id: "blocked-demo",
        label: "Blocked demo runtime",
        connection: {
          mode: "descriptor-only",
          adapterPosture: "OBSTRUCTED",
          reason: "Runtime endpoint refused the witnessed hello."
        }
      }
    ])
  });
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "LiveTargetSessionInspection");
  const target = requireRecord(obj.data, "blocked-demo LiveTargetSessionInspection.data");
  assert.equal(target["target"], "blocked-demo");
  assert.equal(target["targetLabel"], "Blocked demo runtime");
  assert.equal(target["connectionMode"], "descriptor-only");
  assert.equal(target["hostKind"], "CONTINUUM");
  assert.equal(target["adapterPosture"], "OBSTRUCTED");
  assert.equal(target["sessionPosture"], "OBSTRUCTED");
  assert.match(
    requireString(target["reason"], "blocked-demo.reason"),
    /refused the witnessed hello/
  );
  assert.equal("session" in target, false);
});

test("target-session --json keeps jedit session obstructed when Echo bridge probe is present", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));

  try {
    writeEchoAdapterProbeManifest(jeditRoot);
    const lines = await runJsonWithEnv("target-session", {
      WARP_TTD_JEDIT_ROOT: jeditRoot,
      WARP_TTD_GRAFT_ROOT: path.join(process.cwd(), "test", "missing-graft")
    });
    const jeditObj = parseLine(requireLine(lines, 0));
    const jedit = requireRecord(jeditObj.data, "jedit LiveTargetSessionInspection.data");

    assert.equal(jedit["target"], "jedit");
    assert.equal(jedit["adapterPosture"], "CONFIGURED");
    assert.equal(jedit["sessionPosture"], "OBSTRUCTED");
    const probe = assertEchoAdapterProbe(
      jedit["echoAdapterProbe"],
      "BRIDGE_PRESENT",
      "PRESENT"
    );
    assert.equal(probe["sessionProbePosture"], "SESSION_OBSTRUCTED");
    assert.match(requireString(jedit["reason"], "jedit.reason"), /session adapter is not wired/);
  } finally {
    fs.rmSync(jeditRoot, { recursive: true, force: true });
  }
});

test("live target evidence posture cannot be poisoned by mutating a prior inspection", () => {
  const roots = {
    jeditRoot: path.join(process.cwd(), "test", "missing-jedit"),
    graftRoot: path.join(process.cwd(), "test", "missing-graft")
  };
  const firstGraft = inspectLiveTargets(roots)
    .find((target) => target.target === "graft");
  assert.ok(firstGraft !== undefined, "graft target must be present");

  Object.assign(firstGraft.runtimeBoundaryEvidence, {
    posture: "CONTINUUM_NATIVE",
    nativeContinuumWitness: true
  });

  const secondGraft = inspectLiveTargets(roots)
    .find((target) => target.target === "graft");
  assert.ok(secondGraft !== undefined, "graft target must be present");
  assert.equal(secondGraft.runtimeBoundaryEvidence.posture, "TRANSLATED_SUBSTRATE");
  assert.equal(secondGraft.runtimeBoundaryEvidence.nativeContinuumWitness, false);
});

test("invalid command --json writes JSON error to stderr", async () => {
  try {
    await exec("node", [...NODE_ARGS, "badcommand", "--json"]);
    assert.fail("Expected command to fail");
  } catch (err) {
    const execErr = err as { stderr: string; stdout: string };
    // stdout should be empty
    assert.equal(execErr.stdout.trim(), "");
    // stderr should be valid JSON with error field
    const errLine = execErr.stderr.trim();
    assert.ok(errLine.startsWith("{"), `Expected JSON error on stderr, got: ${errLine}`);
    const parsed = JSON.parse(errLine) as { error: string };
    assert.equal(typeof parsed.error, "string");
    assert.ok(parsed.error.includes("badcommand"));
  }
});

test("unknown flag without command --json writes JSON error to stderr", async () => {
  await assert.rejects(
    () => exec("node", [...NODE_ARGS, "--bogus", "--json"]),
    (err) => {
      const execErr = err as { stderr: string; stdout: string };
      assert.equal(execErr.stdout.trim(), "");

      const errLine = execErr.stderr.trim();
      assert.ok(errLine.startsWith("{"), `Expected JSON error on stderr, got: ${errLine}`);
      const parsed = JSON.parse(errLine) as { error: string };
      assert.equal(typeof parsed.error, "string");
      assert.ok(parsed.error.includes("--bogus"));
      return true;
    }
  );
});

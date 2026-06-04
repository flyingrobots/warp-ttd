import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";
import { LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION } from "../src/app/echoAdapterProbe.ts";
import { LIVE_ECHO_FAMILY_FACTS_MANIFEST } from "../src/app/liveEchoFamilyIntake.ts";
import {
  MCP_ADMISSION_TOOL_NAMES,
  createMcpAdmissionChainServer
} from "../src/mcp/admissionChainSurface.ts";
import type { HostHello, PlaybackFrame } from "../src/protocol.ts";
import {
  requireArray,
  requireRecord,
  type JsonObject
} from "./helpers/jsonTestUtils.ts";

const HEAD_ID = "head:main";
const MCP_INSPECT_LIVE_TARGETS_TOOL = "warp_ttd.inspect_live_targets";
const MCP_INSPECT_RUNTIME_HELLO_TOOL = "warp_ttd.inspect_runtime_hello";
const GENERATED_ARTIFACT_ROOT = "dist/generated/continuum-echo-inspect";
const REQUIRED_GENERATED_FILES = [
  "schemas.generated.ts",
  "ops.generated.ts",
  "client.generated.ts"
] as const;

interface JeditLiveTargetIntakeExpectation {
  intakePosture?: string;
  consumerPosture?: string;
  artifactPosture?: string;
}

interface RequiredJeditLiveTargetIntakeExpectation {
  intakePosture: string;
  consumerPosture: string;
  artifactPosture: string;
}

function targetLabel(target: JsonObject): string {
  const value = target["target"];
  return typeof value === "string" ? value : "target";
}

function assertAdmissionChainFactOrder(chain: JsonObject): void {
  const facts = requireArray(chain["facts"], "facts").map((fact) =>
    requireRecord(fact, "fact")
  );
  assert.deepEqual(
    facts.map((fact) => fact["key"]),
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
  assertAdmissionChainSourceFamilyOrder(chain, facts);
  assertAdmissionChainNestedFactShape(chain, facts);
}

function assertAdmissionChainSourceFamilyOrder(
  chain: JsonObject,
  facts: readonly JsonObject[]
): void {
  const sourceFamilyFacts = requireArray(
    chain["sourceFamilyFacts"],
    "sourceFamilyFacts"
  ).map((fact) => requireRecord(fact, "sourceFamilyFact"));

  assert.deepEqual(
    sourceFamilyFacts.map((fact) => fact["field"]),
    facts.map((fact) => fact["key"])
  );
}

function assertAdmissionChainNestedFactShape(
  chain: JsonObject,
  facts: readonly JsonObject[]
): void {
  const basisFact = requireRecord(facts[0], "basis fact");
  const artifactRegistrationFact = requireRecord(facts[1], "artifactRegistration fact");
  const readingSourceFamily = requireRecord(facts[9]?.["sourceFamily"], "reading source");

  assert.equal("posture" in basisFact, false);
  assert.equal("posture" in artifactRegistrationFact, false);
  assert.equal(readingSourceFamily["posture"], "PRESENT");
  assert.equal(readingSourceFamily["origin"], "LOCAL_FALLBACK");
  assert.equal(
    requireRecord(readingSourceFamily["source"], "reading source family")["family"],
    "continuum"
  );
  assert.equal(requireRecord(basisFact["value"], "basis.value")["posture"], "PRESENT");
  assert.equal(
    requireRecord(artifactRegistrationFact["value"], "artifactRegistration.value")["posture"],
    "ABSENT"
  );
  assert.equal(
    requireRecord(artifactRegistrationFact["value"], "artifactRegistration.value")["field"],
    "artifactRegistration"
  );
  assert.deepEqual(
    requireRecord(chain["artifactRegistration"], "artifactRegistration"),
    requireRecord(artifactRegistrationFact["value"], "artifactRegistration fact value")
  );
}

function normalizeJeditLiveTargetIntakeExpectation(
  expectation: JeditLiveTargetIntakeExpectation = {}
): RequiredJeditLiveTargetIntakeExpectation {
  return {
    intakePosture: expectation.intakePosture ?? "UNAVAILABLE",
    consumerPosture: expectation.consumerPosture ?? "LOCAL_MIRROR_FALLBACK",
    artifactPosture: expectation.artifactPosture ?? "ABSENT"
  };
}

function assertJeditLiveTargetIntake(
  targets: readonly object[],
  expectation?: JeditLiveTargetIntakeExpectation
): void {
  const expected = normalizeJeditLiveTargetIntakeExpectation(expectation);
  const jedit = targets
    .map((target) => requireRecord(target, "target"))
    .find((target) => target["target"] === "jedit");
  assert.ok(jedit !== undefined, "jedit target must be present");

  const jeditIntake = requireRecord(
    jedit["sessionFamilyIntake"],
    "jedit.sessionFamilyIntake"
  );
  assert.equal(jeditIntake["schemaVersion"], "warp-ttd.live-echo-family-intake.v1");
  assert.equal(jeditIntake["intakePosture"], expected.intakePosture);
  const generated = requireRecord(
    jeditIntake["generatedFamilyConsumption"],
    "jedit.generatedFamilyConsumption"
  );
  assert.equal(generated["consumerPosture"], expected.consumerPosture);
  assert.equal(generated["artifactPosture"], expected.artifactPosture);
  requireArray(generated["artifacts"], "jedit.generatedFamilyConsumption.artifacts");

  const jeditProbe = requireRecord(
    jedit["echoAdapterProbe"],
    "jedit.echoAdapterProbe"
  );
  assert.equal(jeditProbe["schemaVersion"], LIVE_ECHO_ADAPTER_PROBE_SCHEMA_VERSION);
  const bridgePosture = jeditProbe["bridgePosture"];
  if (typeof bridgePosture !== "string") {
    assert.fail("jedit.echoAdapterProbe.bridgePosture must be a string");
  }
  assert.ok(
    ["ROOT_UNAVAILABLE", "BRIDGE_ABSENT"].includes(bridgePosture),
    "jedit probe should be unavailable without a supported bridge"
  );
  assert.equal(jeditProbe["probePosture"], "UNAVAILABLE");
  assert.equal(jeditProbe["sessionProbePosture"], "NOT_OPENED");
}

function assertDefaultRuntimeHelloInspection(runtimeHello: readonly JsonObject[]): void {
  assert.deepEqual(
    runtimeHello.map((entry) => [
      entry["target"],
      entry["helloPosture"],
      entry["evidencePosture"],
      entry["nativeContinuumWitness"]
    ]),
    [
      ["jedit", "ABSENT", "UNAVAILABLE", false],
      ["graft", "PRESENT", "TRANSLATED_SUBSTRATE", false]
    ]
  );

  const graft = runtimeHello.find((entry) => entry["target"] === "graft");
  assert.ok(graft !== undefined);
  const hello = requireRecord(graft["hello"], "graft.hello");
  assert.equal(hello["schemaVersion"], "continuum.debug.hello.v1");
  assert.equal(requireRecord(hello["runtime"], "graft.hello.runtime")["runtimeKind"], "git-warp");
  assert.equal(
    requireRecord(hello["evidence"], "graft.hello.evidence")["nativeContinuumWitness"],
    false
  );
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

function writeJeditManifest(rootPath: string): void {
  const manifestPath = path.join(rootPath, LIVE_ECHO_FAMILY_FACTS_MANIFEST);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: "warp-ttd.live-echo-family-intake.v1",
      publishedFields: ["neighborhoodCore"],
      generatedFamilyArtifacts: [generatedArtifactDescriptor()]
    })
  );
}

async function connectMcp(
  adapter = new EchoFixtureAdapter()
): Promise<{ client: Client; server: McpServer }> {
  const server = createMcpAdmissionChainServer({ adapter, headId: HEAD_ID });
  const client = new Client({ name: "warp-ttd-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server };
}

async function closeMcp(client: Client, server: McpServer): Promise<void> {
  await client.close();
  await server.close();
}

function structuredContent(result: Awaited<ReturnType<Client["callTool"]>>): JsonObject {
  return requireRecord(
    result.structuredContent as object | undefined,
    "structuredContent"
  );
}

class UnexpectedHelloCallError extends Error {
  public constructor() {
    super("hello should be cached after session creation");
    this.name = "UnexpectedHelloCallError";
  }
}

class UnexpectedControlCallError extends Error {
  public constructor(methodName: string) {
    super(`${methodName} must not be called by read-only MCP tools`);
    this.name = "UnexpectedControlCallError";
  }
}

class TransientHelloAdapter extends EchoFixtureAdapter {
  #helloCalls = 0;

  public get helloCalls(): number {
    return this.#helloCalls;
  }

  public override async hello(): Promise<HostHello> {
    this.#helloCalls += 1;
    if (this.#helloCalls > 1) {
      throw new UnexpectedHelloCallError();
    }
    return super.hello();
  }
}

class SlowHelloAdapter extends EchoFixtureAdapter {
  #helloCalls = 0;

  public get helloCalls(): number {
    return this.#helloCalls;
  }

  public override async hello(): Promise<HostHello> {
    this.#helloCalls += 1;
    await new Promise<void>((resolve) => setImmediate(resolve));
    return super.hello();
  }
}

class NoControlAdapter extends EchoFixtureAdapter {
  public override stepForward(): Promise<PlaybackFrame> {
    throw new UnexpectedControlCallError("stepForward");
  }

  public override stepBackward(): Promise<PlaybackFrame> {
    throw new UnexpectedControlCallError("stepBackward");
  }

  public override seekToFrame(): Promise<PlaybackFrame> {
    throw new UnexpectedControlCallError("seekToFrame");
  }
}

test("MCP admission tools are read-only inspection tools", async () => {
  const { client, server } = await connectMcp();

  try {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, Object.values(MCP_ADMISSION_TOOL_NAMES).sort());

    for (const tool of listed.tools) {
      const annotations = tool.annotations;
      assert.ok(annotations !== undefined, tool.name);
      assert.equal(annotations.readOnlyHint, true, tool.name);
      assert.equal(annotations.destructiveHint, false, tool.name);
      assert.equal(annotations.openWorldHint, false, tool.name);
      assert.doesNotMatch(tool.name, /step|seek|fork|grant|admit|mutat|present/i);
    }
  } finally {
    await closeMcp(client, server);
  }
});

test("MCP live-target inspection exposes runtime-boundary evidence posture", async () => {
  const { client, server } = await connectMcp();

  try {
    const result = structuredContent(
      await client.callTool({
        name: MCP_INSPECT_LIVE_TARGETS_TOOL,
        arguments: {}
      })
    );
    const targets = requireArray(result["targets"], "targets");

    assertJeditLiveTargetIntake(targets.map((entry) => requireRecord(entry, "target")));

    const graft = targets
      .map((target) => requireRecord(target, "target"))
      .find((target) => target["target"] === "graft");
    assert.ok(graft !== undefined, "graft target must be present");

    const graftEvidence = requireRecord(
      graft["runtimeBoundaryEvidence"],
      "graft.runtimeBoundaryEvidence"
    );
    assert.equal(graftEvidence["posture"], "TRANSLATED_SUBSTRATE");
    assert.equal(graftEvidence["substrate"], "git-warp");
    assert.equal(graftEvidence["evidenceKind"], "warp-index");
    assert.equal(graftEvidence["nativeContinuumWitness"], false);

    for (const target of targets.map((entry) => requireRecord(entry, "target"))) {
      const evidence = requireRecord(
        target["runtimeBoundaryEvidence"],
        `${targetLabel(target)}.runtimeBoundaryEvidence`
      );
      if (evidence["posture"] === "CONTINUUM_NATIVE") {
        assert.equal(evidence["nativeContinuumWitness"], true);
      } else {
        assert.equal(evidence["nativeContinuumWitness"], false);
      }
    }
  } finally {
    await closeMcp(client, server);
  }
});

test("MCP live-target inspection exposes Wesley-generated Echo family artifact posture", async () => {
  const jeditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "warp-ttd-jedit-"));
  const previousJeditRoot = process.env["WARP_TTD_JEDIT_ROOT"];
  const { client, server } = await connectMcp();

  try {
    writeGeneratedArtifacts(jeditRoot);
    writeJeditManifest(jeditRoot);
    process.env["WARP_TTD_JEDIT_ROOT"] = jeditRoot;

    const result = structuredContent(
      await client.callTool({
        name: MCP_INSPECT_LIVE_TARGETS_TOOL,
        arguments: {}
      })
    );
    const targets = requireArray(result["targets"], "targets");

    assertJeditLiveTargetIntake(
      targets.map((entry) => requireRecord(entry, "target")),
      {
        intakePosture: "PRESENT",
        consumerPosture: "GENERATED_FAMILY_PRESENT",
        artifactPosture: "PRESENT"
      }
    );
  } finally {
    if (previousJeditRoot === undefined) {
      delete process.env["WARP_TTD_JEDIT_ROOT"];
    } else {
      process.env["WARP_TTD_JEDIT_ROOT"] = previousJeditRoot;
    }
    fs.rmSync(jeditRoot, { recursive: true, force: true });
    await closeMcp(client, server);
  }
});

test("MCP live-target inspection exposes descriptor-only Continuum targets", async () => {
  const previousTargetsJson = process.env["WARP_TTD_TARGETS_JSON"];
  const { client, server } = await connectMcp();

  try {
    process.env["WARP_TTD_TARGETS_JSON"] = JSON.stringify([
      {
        id: "vendor-demo",
        label: "Vendor demo runtime",
        appKind: "Continuum-compatible app",
        connection: {
          mode: "descriptor-only",
          reason: "Vendor runtime handshake is not implemented in this slice."
        }
      }
    ]);

    const result = structuredContent(
      await client.callTool({
        name: MCP_INSPECT_LIVE_TARGETS_TOOL,
        arguments: {}
      })
    );
    const targets = requireArray(result["targets"], "targets")
      .map((entry) => requireRecord(entry, "target"));

    assert.equal(targets.length, 1);
    const target = targets[0];
    assert.ok(target !== undefined);
    assert.equal(target["target"], "vendor-demo");
    assert.equal(target["targetLabel"], "Vendor demo runtime");
    assert.equal(target["connectionMode"], "descriptor-only");
    assert.equal(target["hostKind"], "CONTINUUM");
    assert.equal(target["rootPosture"], "NOT_APPLICABLE");
    assert.equal(target["adapterPosture"], "UNSUPPORTED");
    assert.deepEqual(target["capabilities"], ["DESCRIPTOR_ONLY"]);
  } finally {
    if (previousTargetsJson === undefined) {
      delete process.env["WARP_TTD_TARGETS_JSON"];
    } else {
      process.env["WARP_TTD_TARGETS_JSON"] = previousTargetsJson;
    }
    await closeMcp(client, server);
  }
});

test("MCP runtime hello inspection exposes the CLI-equivalent read model", async () => {
  const previousJeditRoot = process.env["WARP_TTD_JEDIT_ROOT"];
  const previousGraftRoot = process.env["WARP_TTD_GRAFT_ROOT"];
  const { client, server } = await connectMcp();

  try {
    process.env["WARP_TTD_JEDIT_ROOT"] = path.join(process.cwd(), "test", "missing-jedit");
    process.env["WARP_TTD_GRAFT_ROOT"] = path.join(process.cwd(), "test", "missing-graft");

    const result = structuredContent(
      await client.callTool({
        name: MCP_INSPECT_RUNTIME_HELLO_TOOL,
        arguments: {}
      })
    );
    const runtimeHello = requireArray(result["runtimeHello"], "runtimeHello")
      .map((entry) => requireRecord(entry, "runtimeHello entry"));

    assertDefaultRuntimeHelloInspection(runtimeHello);
  } finally {
    if (previousJeditRoot === undefined) {
      delete process.env["WARP_TTD_JEDIT_ROOT"];
    } else {
      process.env["WARP_TTD_JEDIT_ROOT"] = previousJeditRoot;
    }
    if (previousGraftRoot === undefined) {
      delete process.env["WARP_TTD_GRAFT_ROOT"];
    } else {
      process.env["WARP_TTD_GRAFT_ROOT"] = previousGraftRoot;
    }
    await closeMcp(client, server);
  }
});

test("MCP tools expose cached session and reading facts", async () => {
  const adapter = new TransientHelloAdapter();
  const { client, server } = await connectMcp(adapter);

  try {
    const capabilities = structuredContent(
      await client.callTool({
        name: MCP_ADMISSION_TOOL_NAMES.inspectAdapterCapabilities,
        arguments: {}
      })
    );
    const hostHello = requireRecord(capabilities["hostHello"], "hostHello");
    assert.equal(hostHello["protocolVersion"], "0.7.0");
    assert.ok(Array.isArray(capabilities["capabilities"]));

    const readings = structuredContent(
      await client.callTool({
        name: MCP_ADMISSION_TOOL_NAMES.inspectReadings,
        arguments: {}
      })
    );
    assert.equal(readings["basisRef"], "head:main@frame:0");
    assert.equal(readings["readingPosture"], "PRESENT");
    assert.equal(readings["runtimeSource"], "LIVE");
    assert.equal(
      requireRecord(readings["budgetPosture"], "budgetPosture")["posture"],
      "ABSENT"
    );

    assert.equal(adapter.helloCalls, 1);
  } finally {
    await closeMcp(client, server);
  }
});

test("MCP concurrent first inspection calls share one session initialization", async () => {
  const adapter = new SlowHelloAdapter();
  const { client, server } = await connectMcp(adapter);

  try {
    const [sessionResult, readingsResult] = await Promise.all([
      client.callTool({
        name: MCP_ADMISSION_TOOL_NAMES.inspectSession,
        arguments: {}
      }),
      client.callTool({
        name: MCP_ADMISSION_TOOL_NAMES.inspectReadings,
        arguments: {}
      })
    ]);
    const session = requireRecord(
      structuredContent(sessionResult)["session"],
      "session"
    );
    const readings = structuredContent(readingsResult);

    assert.equal(adapter.helloCalls, 1);
    assert.equal(session["activeHeadId"], HEAD_ID);
    assert.equal(readings["basisRef"], "head:main@frame:0");
  } finally {
    await closeMcp(client, server);
  }
});

test("MCP admission-chain tool exposes absent posture for unavailable facts", async () => {
  const { client, server } = await connectMcp();

  try {
    const chain = structuredContent(
      await client.callTool({
        name: MCP_ADMISSION_TOOL_NAMES.inspectAdmissionChain,
        arguments: {}
      })
    );
    assert.equal(
      requireRecord(chain["artifactRegistration"], "artifactRegistration")["posture"],
      "ABSENT"
    );
    assert.equal(chain["schemaVersion"], "warp-ttd.admission-chain.v1");
    assertAdmissionChainFactOrder(chain);
    assert.equal(
      requireRecord(chain["capabilityGrant"], "capabilityGrant")["posture"],
      "ABSENT"
    );
    assert.equal(
      requireRecord(chain["admissionTicket"], "admissionTicket")["posture"],
      "ABSENT"
    );
    assert.equal(
      requireRecord(chain["lawWitness"], "lawWitness")["posture"],
      "ABSENT"
    );
    assert.equal(requireRecord(chain["reading"], "reading")["posture"], "PRESENT");
  } finally {
    await closeMcp(client, server);
  }
});

test("MCP inspection tools do not invoke debugger control methods", async () => {
  const { client, server } = await connectMcp(new NoControlAdapter());

  try {
    for (const name of Object.values(MCP_ADMISSION_TOOL_NAMES)) {
      const result = await client.callTool({ name, arguments: {} });
      assert.notEqual(result.isError, true, name);
    }
  } finally {
    await closeMcp(client, server);
  }
});

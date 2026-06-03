import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function readRepoText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

function repoPathExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapedPattern(value: string): RegExp {
  return new RegExp(escapeRegexLiteral(value));
}

function mermaidFencePattern(firstStatement: string): RegExp {
  return new RegExp("```mermaid\\r?\\n" + escapeRegexLiteral(firstStatement));
}

function assertMermaidFencePresent(
  content: string,
  firstStatement: string,
): void {
  assert.match(content, mermaidFencePattern(firstStatement));
}

function assertAllTextPresent(content: string, values: readonly string[]): void {
  for (const value of values) {
    assert.match(content, escapedPattern(value));
  }
}

function assertContinuumMockupsExist(mockups: readonly string[]): void {
  for (const mockup of mockups) {
    assert.equal(repoPathExists(mockup), true);
    assert.match(readRepoText(mockup), /<svg/);
  }
}

const SHARED_FAMILY_BOUNDARY_DESIGN =
  "docs/design/0026-debugger-native-shared-family-boundary/debugger-native-shared-family-boundary.md";
const SHARED_FAMILY_BOUNDARY_BACKLOG =
  "docs/method/backlog/up-next/PROTO_debugger-native-vs-shared-family-boundary.md";
const SHARED_FAMILY_BOUNDARY_GRAVEYARD =
  "docs/method/graveyard/PROTO_debugger-native-vs-shared-family-boundary.md";
const MANUAL = "MANUAL.md";
const MANUAL_INDEX = "docs/manual/README.md";
const GENERATED_FAMILY_INGRESS_MANUAL =
  "docs/manual/001-generated-family-ingress-seam.md";
const GENERATED_FAMILY_INGRESS_DESIGN =
  "docs/design/0027-generated-family-ingress-seam/generated-family-ingress-seam.md";
const HOST_PUBLISHED_FAMILY_FACTS_MANUAL =
  "docs/manual/002-host-published-family-facts.md";
const HOST_PUBLISHED_FAMILY_FACTS_DESIGN =
  "docs/design/0028-host-published-family-facts/host-published-family-facts.md";
const LIVE_ECHO_FAMILY_INTAKE_MANUAL =
  "docs/manual/003-live-echo-family-intake.md";
const LIVE_ECHO_FAMILY_INTAKE_DESIGN =
  "docs/design/0029-live-echo-family-intake/live-echo-family-intake.md";
const GENERATED_FAMILY_CONSUMPTION_MANUAL =
  "docs/manual/004-generated-family-consumption.md";
const GENERATED_FAMILY_CONSUMPTION_DESIGN =
  "docs/design/0030-generated-family-consumption/generated-family-consumption.md";
const JEDIT_ECHO_SMOKE_MANUAL =
  "docs/manual/005-jedit-echo-smoke.md";
const JEDIT_ECHO_SMOKE_DESIGN =
  "docs/design/0031-jedit-echo-smoke/jedit-echo-smoke.md";
const ECHO_ADAPTER_PROBE_MANUAL =
  "docs/manual/006-echo-adapter-probe-boundary.md";
const ECHO_ADAPTER_PROBE_DESIGN =
  "docs/design/0032-echo-adapter-probe-boundary/echo-adapter-probe-boundary.md";
const WESLEY_GENERATED_ECHO_FAMILY_MANUAL =
  "docs/manual/007-wesley-generated-echo-family-consumer.md";
const WESLEY_GENERATED_ECHO_FAMILY_DESIGN =
  "docs/design/0033-wesley-generated-echo-family-consumer/wesley-generated-echo-family-consumer.md";
const CONTINUUM_TARGET_DISCOVERY_MANUAL =
  "docs/manual/008-continuum-target-discovery-contract.md";
const CONTINUUM_TARGET_DISCOVERY_DESIGN =
  "docs/design/0076-continuum-target-discovery-contract/continuum-target-discovery-contract.md";
const CONTINUUM_CAUSAL_DEBUGGER_MANUAL =
  "docs/manual/009-continuum-causal-debugger-design-thinking.md";
const CONTINUUM_CAUSAL_DEBUGGER_DESIGN =
  "docs/design/0081-continuum-causal-debugger-design-thinking/continuum-causal-debugger-design-thinking.md";

function assertSharedFamilyBoundaryLifecycle(): void {
  assert.equal(repoPathExists(SHARED_FAMILY_BOUNDARY_DESIGN), true);
  assert.equal(repoPathExists(SHARED_FAMILY_BOUNDARY_BACKLOG), false);
  assert.equal(repoPathExists(SHARED_FAMILY_BOUNDARY_GRAVEYARD), true);
}

function assertSharedFamilyBoundaryHeadings(content: string): void {
  assertAllTextPresent(content, [
    "## Ownership Matrix",
    "## Debugger-Native Protocol Families",
    "## Shared-Family Projections",
    "## Host-Specific Adapter Residue",
    "## Promotion Rules",
    "## Schema Decision",
    "## Acceptance Checklist",
  ]);
}

function assertSharedFamilyBoundaryTerms(content: string): void {
  assertAllTextPresent(content, [
    "DebuggerSession",
    "InvestigationIntent",
    "playback cursor",
    "admission-chain read-model posture wrappers",
    "OpticRegistrationDescriptor",
    "CapabilityGrant",
    "CapabilityPresentation",
    "AdmissionTicket",
    "LawWitness",
    "ReadingEnvelope",
    "ObserverPlan",
    "ContinuumEvidenceStatus",
    "patch SHA",
    "graph name",
  ]);
}

function assertSharedFamilyBoundaryRules(content: string): void {
  assert.match(
    content,
    /WARP TTD owns the act of investigation\. It does not own the app, authority,\s+admission, witness, or shared semantic family being investigated\./,
  );
  assert.match(
    content,
    /Keep `AdapterCapability` distinct from `CapabilityGrant` and\s+`CapabilityPresentation`\./,
  );
  assert.match(
    content,
    /Reject new control paths that issue grants, present authority, admit runtime\s+invocations, mutate apps, or create strands\./,
  );
}

function assertManualFilesExist(): void {
  assert.equal(repoPathExists(MANUAL), true);
  assert.equal(repoPathExists(MANUAL_INDEX), true);
  assert.equal(repoPathExists(GENERATED_FAMILY_INGRESS_MANUAL), true);
  assert.equal(repoPathExists(GENERATED_FAMILY_INGRESS_DESIGN), true);
  assert.equal(repoPathExists(HOST_PUBLISHED_FAMILY_FACTS_MANUAL), true);
  assert.equal(repoPathExists(HOST_PUBLISHED_FAMILY_FACTS_DESIGN), true);
  assert.equal(repoPathExists(LIVE_ECHO_FAMILY_INTAKE_MANUAL), true);
  assert.equal(repoPathExists(LIVE_ECHO_FAMILY_INTAKE_DESIGN), true);
  assert.equal(repoPathExists(GENERATED_FAMILY_CONSUMPTION_MANUAL), true);
  assert.equal(repoPathExists(GENERATED_FAMILY_CONSUMPTION_DESIGN), true);
  assert.equal(repoPathExists(JEDIT_ECHO_SMOKE_MANUAL), true);
  assert.equal(repoPathExists(JEDIT_ECHO_SMOKE_DESIGN), true);
  assert.equal(repoPathExists(ECHO_ADAPTER_PROBE_MANUAL), true);
  assert.equal(repoPathExists(ECHO_ADAPTER_PROBE_DESIGN), true);
  assert.equal(repoPathExists(WESLEY_GENERATED_ECHO_FAMILY_MANUAL), true);
  assert.equal(repoPathExists(WESLEY_GENERATED_ECHO_FAMILY_DESIGN), true);
  assert.equal(repoPathExists(CONTINUUM_TARGET_DISCOVERY_MANUAL), true);
  assert.equal(repoPathExists(CONTINUUM_TARGET_DISCOVERY_DESIGN), true);
  assert.equal(repoPathExists(CONTINUUM_CAUSAL_DEBUGGER_MANUAL), true);
  assert.equal(repoPathExists(CONTINUUM_CAUSAL_DEBUGGER_DESIGN), true);
}

function assertManualFrontDoors(): void {
  assertAllTextPresent(readRepoText("README.md"), [
    "[Manual](./MANUAL.md)",
    "Durable operator and maintainer chapters compiled from design cycles.",
  ]);
  assertAllTextPresent(readRepoText("GUIDE.md"), [
    "[MANUAL.md](./MANUAL.md)",
    "compiled manual for durable design knowledge",
  ]);
  assertAllTextPresent(readRepoText("METHOD.md"), [
    "**`MANUAL.md`**",
    "Green --> Manualize: manual chapter",
    "**Manualize**",
  ]);
}

function assertManualIndexContent(): void {
  assertAllTextPresent(readRepoText(MANUAL), [
    "# WARP TTD Manual",
    "## Manual Rule",
    "001. Generated Family Ingress Seam",
    "002. Host-Published Family Facts",
    "003. Live Echo Family Intake",
    "004. Generated Family Consumption Boundary",
    "005. Jedit Echo Smoke",
    "006. Echo Adapter Probe Boundary",
    "007. Wesley-Generated Echo Family Consumer",
    "008. Continuum Target Discovery Contract",
    "009. Continuum Causal Debugger Design Thinking",
  ]);
  assertAllTextPresent(readRepoText(MANUAL_INDEX), [
    "# WARP TTD Manual Index",
    "## Chapters",
    "## Source Design Cycles",
    "0027-generated-family-ingress-seam",
    "0028-host-published-family-facts",
    "0029-live-echo-family-intake",
    "0030-generated-family-consumption",
    "0031-jedit-echo-smoke",
    "0032-echo-adapter-probe-boundary",
    "0033-wesley-generated-echo-family-consumer",
    "0076-continuum-target-discovery-contract",
    "0081-continuum-causal-debugger-design-thinking",
  ]);
}

function assertGeneratedFamilyIngressManual(content: string): void {
  assertAllTextPresent(content, [
    "# Generated Family Ingress Seam",
    "## Reader Contract",
    "## The Seam",
    "## Ownership Rule",
    "## First Ingress Shape",
    "## Landed Implementation",
    "## Fallback Discipline",
    "src/app/generatedFamilyIngress.ts",
    "origin: \"LOCAL_FALLBACK\"",
    "GeneratedFamilyFact",
    "GeneratedFamilyOrigin",
    "ABSENT",
    "PRESENT",
    "OBSTRUCTED",
    "No grant issuance.",
    "No runtime admission.",
    "No strand creation.",
  ]);
}

function assertGeneratedFamilyIngressDesign(content: string): void {
  assertAllTextPresent(content, [
    "status: landed",
    "# Generated Family Ingress Seam",
    "## Manual Chapter",
    "## Hill",
    "## Implementation Witness",
    "## Playback Questions",
    "../../manual/001-generated-family-ingress-seam.md",
    "GeneratedFamilyPosture",
    "GeneratedFamilyOrigin",
    "src/app/admissionChainReadModel.ts",
    "source-family metadata",
    "No replacement of `src/protocol.ts`.",
  ]);
}

function assertHostPublishedFamilyFactsManual(content: string): void {
  assertAllTextPresent(content, [
    "# Host-Published Family Facts",
    "## Reader Contract",
    "## Port Rule",
    "## Session Rule",
    "## First Landed Cut",
    "READ_SESSION_FAMILY_FACTS",
    "sessionFamilyFacts",
    "origin: \"HOST_PUBLISHED\"",
    "origin: \"LOCAL_FALLBACK\"",
    "No runtime admission.",
    "No strand creation.",
  ]);
}

function assertHostPublishedFamilyFactsDesign(content: string): void {
  assertAllTextPresent(content, [
    "status: landed",
    "# Host-Published Family Facts",
    "## Manual Chapter",
    "## Hill",
    "## Implementation Witness",
    "../../manual/002-host-published-family-facts.md",
    "TtdHostAdapter.sessionFamilyFacts",
    "DebuggerSession.snapshot.sessionFamilyFacts",
    "READ_SESSION_FAMILY_FACTS",
  ]);
}

function assertLiveEchoFamilyIntakeManual(content: string): void {
  assertAllTextPresent(content, [
    "# Live Echo Family Intake",
    "## Manifest Rule",
    ".warp-ttd/live-echo-family-facts.json",
    "intakePosture: \"UNAVAILABLE\"",
    "intakePosture: \"PRESENT\"",
    "intakePosture: \"OBSTRUCTED\"",
    "No runtime admission.",
    "No strand creation.",
  ]);
}

function assertGeneratedFamilyConsumptionManual(content: string): void {
  assertAllTextPresent(content, [
    "# Generated Family Consumption Boundary",
    "src/app/sharedFamilyHydration.ts",
    "consumerPosture: \"LOCAL_MIRROR_FALLBACK\"",
    "Continuum owns",
    "Do not extend `src/protocol.ts`",
    "No runtime admission.",
  ]);
}

function assertJeditEchoSmokeManual(content: string): void {
  assertAllTextPresent(content, [
    "# Jedit Echo Smoke",
    "target-session --json",
    "adapterPosture: \"UNAVAILABLE\"",
    "sessionPosture: \"OBSTRUCTED\"",
    "sessionFamilyIntake",
    "No host mutation.",
  ]);
}

function assertEchoAdapterProbeManual(content: string): void {
  assertAllTextPresent(content, [
    "# Echo Adapter Probe Boundary",
    ".warp-ttd/echo-adapter-probe.json",
    "echoAdapterProbe",
    "bridgePosture: \"ROOT_UNAVAILABLE\"",
    "bridgePosture: \"BRIDGE_ABSENT\"",
    "bridgePosture: \"BRIDGE_PRESENT\"",
    "bridgePosture: \"ABI_UNSUPPORTED\"",
    "bridgePosture: \"PROBE_OBSTRUCTED\"",
    "adapterPosture",
    "sessionPosture: \"OBSTRUCTED\"",
    "No Echo session open.",
    "No runtime admission.",
    "No host mutation.",
  ]);
}

function assertEchoAdapterProbeDesign(content: string): void {
  assertAllTextPresent(content, [
    "status: landed",
    "# Echo Adapter Probe Boundary",
    "## Probe Contract",
    "## Posture Rules",
    "## Implementation Witness",
    "../../manual/006-echo-adapter-probe-boundary.md",
    "src/app/echoAdapterProbe.ts",
    "LiveTargetInspection.echoAdapterProbe",
    "LiveEchoTargetSessionInspection.echoAdapterProbe",
    "No Echo session open.",
  ]);
}

function assertWesleyGeneratedEchoFamilyManual(content: string): void {
  assertAllTextPresent(content, [
    "# Wesley-Generated Echo Family Consumer",
    ".warp-ttd/live-echo-family-facts.json",
    "generatedFamilyArtifacts",
    "consumerPosture: \"GENERATED_FAMILY_PRESENT\"",
    "consumerPosture: \"GENERATED_FAMILY_UNAVAILABLE\"",
    "consumerPosture: \"LOCAL_MIRROR_FALLBACK\"",
    "artifactPosture: \"PRESENT\"",
    "artifactPosture: \"ABSENT\"",
    "artifactPosture: \"OBSTRUCTED\"",
    "No generated modules are executed.",
    "No runtime admission.",
    "No host mutation.",
    "No native Continuum witnesshood inferred from file presence.",
  ]);
}

function assertWesleyGeneratedEchoFamilyDesign(content: string): void {
  assertAllTextPresent(content, [
    "format: \"warp-design-v1\"",
    "# Wesley-Generated Echo Family Consumer",
    "https://github.com/flyingrobots/warp-ttd/issues/68",
    "GENERATED_FAMILY_PRESENT",
    "generatedFamilyArtifacts",
    "No generated artifacts are checked into WARP TTD.",
    "No generated modules are executed",
  ]);
}

function assertContinuumTargetDiscoveryManual(content: string): void {
  assertAllTextPresent(content, [
    "# Continuum Target Discovery Contract",
    "WARP TTD debugs Continuum-compatible targets.",
    "Target identity, app identity, runtime vendor, and substrate are facts.",
    "jedit",
    "graft",
    "WARP_TTD_TARGETS_JSON",
    "descriptor-only",
    "adapterPosture: \"UNSUPPORTED\"",
    "adapterPosture: \"OBSTRUCTED\"",
    "duplicate ids",
    "connectionMode",
    "capabilities",
    "No runtime control.",
    "No authority issuance.",
    "No runtime admission.",
    "No host mutation.",
    "No native Continuum witnesshood inferred from app names or descriptor",
  ]);
}

function assertContinuumTargetDiscoveryInspectionFields(content: string): void {
  const start = content.indexOf("## Agent Inspectability / Explainability Posture");
  const end = content.indexOf("## Security / Redaction / Consent Posture");
  const section = content.slice(start, end);
  assertAllTextPresent(section, [
    "hostKind",
    "admissionChainPosture",
    "graphName",
    "echoAdapterProbe",
    "sessionFamilyIntake",
  ]);
}

function assertContinuumTargetDiscoveryDesign(content: string): void {
  assertAllTextPresent(content, [
    "format: \"warp-design-v1\"",
    "# Continuum Target Discovery Contract",
    "https://github.com/flyingrobots/warp-ttd/issues/76",
    "ContinuumDebugTargetDescriptor",
    "ContinuumDebugTargetInspection",
    "descriptor-only",
    "\"appKind\": \"live Echo app\"",
    "\"appKind\": \"live git-warp app\"",
    "{ mode: \"git-warp\"; rootPath: string; graphName: string }",
    "Duplicate ids are obstructed deterministically.",
    "unsupported, malformed, and duplicate-id",
    "synthetic third target",
    "target id, app label, runtime vendor, and substrate are reported facts",
    "No generated modules are executed",
  ]);
  assertContinuumTargetDiscoveryInspectionFields(content);
}

function assertContinuumCausalDebuggerManual(content: string): void {
  assertAllTextPresent(content, [
    "# Continuum Causal Debugger Design Thinking",
    "WARP TTD is a Continuum causal debugger.",
    "It is not just a time-travel",
    "controller.",
    "Perfect replay gives the investigator a stable history.",
    "counterfactual branches",
    "effect breakpoint",
    "admission breakpoint",
    "reading breakpoint",
    "absence breakpoint",
    "invariant breakpoint",
    "causal breakpoint",
    "counterfactual breakpoint",
    "No host mutation through inspection.",
    "No counterfactual presented as actual history.",
    "No visual-only debugger truth.",
  ]);
}

function assertContinuumCausalDebuggerDesign(content: string): void {
  assertAllTextPresent(content, [
    "format: \"warp-design-v1\"",
    "# Continuum Causal Debugger Design Thinking",
    "https://github.com/flyingrobots/warp-ttd/issues/81",
    "Perfect replay is evidence, not authority.",
    "Counterfactual branches are",
    "debugger-local hypotheses",
    "## User Experience / Product Shape",
    "### Feature Catalog",
    "### Breakpoint Model",
    "Counterfactual workbench",
    "Evidence ledger",
    "Agent Inspectability / Explainability Posture",
    "No host mutation through inspection.",
    "No inferred authority.",
  ]);
  assertMermaidFencePresent(content, "journey");
  assertMermaidFencePresent(content, "flowchart TD");
  assertMermaidFencePresent(content, "classDiagram");
}

function assertNextFiveDesigns(): void {
  assertAllTextPresent(readRepoText(LIVE_ECHO_FAMILY_INTAKE_DESIGN), [
    "status: landed",
    "../../manual/003-live-echo-family-intake.md",
    "LiveTargetInspection.sessionFamilyIntake",
    "No runtime admission.",
  ]);
  assertAllTextPresent(readRepoText(GENERATED_FAMILY_CONSUMPTION_DESIGN), [
    "status: landed",
    "../../manual/004-generated-family-consumption.md",
    "src/app/sharedFamilyHydration.ts",
    "LOCAL_MIRROR_FALLBACK",
  ]);
  assertAllTextPresent(readRepoText(JEDIT_ECHO_SMOKE_DESIGN), [
    "status: landed",
    "../../manual/005-jedit-echo-smoke.md",
    "LiveEchoTargetSessionInspection",
    "sessionPosture: \"OBSTRUCTED\"",
  ]);
  assertEchoAdapterProbeDesign(readRepoText(ECHO_ADAPTER_PROBE_DESIGN));
  assertWesleyGeneratedEchoFamilyDesign(readRepoText(WESLEY_GENERATED_ECHO_FAMILY_DESIGN));
  assertContinuumTargetDiscoveryDesign(readRepoText(CONTINUUM_TARGET_DISCOVERY_DESIGN));
  assertContinuumCausalDebuggerDesign(readRepoText(CONTINUUM_CAUSAL_DEBUGGER_DESIGN));
}

test("Mermaid fence assertions tolerate CRLF line endings", () => {
  for (const firstStatement of ["classDiagram", "erDiagram", "sequenceDiagram"]) {
    const content = "```mermaid\r\n" + firstStatement + "\r\n";

    assertMermaidFencePresent(content, firstStatement);
  }
});

test("repo doctrine makes WARP TTD agent-native and agent-first", () => {
  const agents = readRepoText("AGENTS.md");
  const method = readRepoText("METHOD.md");
  const bearing = readRepoText("docs/BEARING.md");
  const mcp = readRepoText("docs/MCP.md");
  const doctrine = readRepoText("docs/design/doctrine.md");

  assert.match(agents, /AGENT-NATIVE/);
  assert.match(agents, /AGENT-FIRST/);
  assert.match(agents, /LLM agents are primary users/);

  assert.match(method, /AGENT-NATIVE, AGENT-FIRST/);
  assert.match(method, /structured MCP\/CLI\/read-model surface before TUI/i);

  assert.match(bearing, /Agent-Native \/ Agent-First/);
  assert.match(
    bearing,
    /primary way for LLMs to inspect and interact with\s+Continuum apps/i,
  );

  assert.match(mcp, /preferred LLM-facing interface/);
  assert.match(mcp, /TUI.*must not be the first or only implementation/i);

  assert.match(doctrine, /Agent-Native \/ Agent-First/);
  assert.match(
    doctrine,
    /If an LLM agent cannot use a feature through structured outputs/i,
  );
});

test("top-level agent doctrine avoids ambiguous capability vocabulary", () => {
  const topLevelDoctrine = [
    "AGENTS.md",
    "METHOD.md",
    "docs/BEARING.md",
    "docs/MCP.md",
    "docs/CLI.md",
    "docs/design/doctrine.md",
  ].map((relativePath) => readRepoText(relativePath).replace(/\r\n/g, "\n"));

  for (const content of topLevelDoctrine) {
    assert.doesNotMatch(content, /\bcapability-gated\b/i);
    assert.doesNotMatch(content, /\bMCP capability\b/i);
    assert.doesNotMatch(content, /\badapter capability\b/i);
    assert.doesNotMatch(content, /\bcapability presentations\b/i);
  }
});

test("agent doctrine maps admission-chain facts to bearing obligations", () => {
  const doctrine = readRepoText("docs/design/doctrine.md").replace(/\s+/g, " ");

  assert.match(
    doctrine,
    /agent surface obligations are: absence, authority, admission, mutation, and evidence posture/i,
  );
  assert.match(
    doctrine,
    /Admission-chain visible facts refine those obligations/i,
  );
  assert.match(
    doctrine,
    /tickets, witnesses, and receipts are evidence posture/i,
  );
  assert.match(
    doctrine,
    /reading posture is evidence posture for observer-relative outputs/i,
  );
});

test("MCP parity design declares missing surface, tools, diagrams, examples, and schemas", () => {
  const designPath = "docs/design/0022-mcp-agent-parity/mcp-agent-parity.md";
  assert.equal(repoPathExists(designPath), true);

  const content = readRepoText(designPath);

  for (const heading of [
    "## What's Missing",
    "## What This Adds",
    "## Mermaid Class Diagram",
    "## Entity Relationship Diagram",
    "## Flow Diagrams",
    "## MCP API",
    "## Versioned JSON Schemas",
  ]) {
    assert.match(content, escapedPattern(heading));
  }

  for (const tool of [
    "warp_ttd.open_session",
    "warp_ttd.inspect_worldline",
    "warp_ttd.inspect_neighborhood_focus",
    "warp_ttd.pin_observation",
    "warp_ttd.seek_frame",
  ]) {
    assert.match(content, escapedPattern(tool));
  }

  assertMermaidFencePresent(content, "classDiagram");
  assertMermaidFencePresent(content, "erDiagram");
  assert.match(content, /"schemaVersion": "warp-ttd\.mcp\.v1"/);
  assert.match(content, /"\$id": "https:\/\/warp-ttd\.local\/schemas\/mcp\/v1\/McpToolResult\.schema\.json"/);
});

test("MCP parity design reserves capability vocabulary for authority objects", () => {
  const content = readRepoText(
    "docs/design/0022-mcp-agent-parity/mcp-agent-parity.md",
  );

  assert.doesNotMatch(content, /\bcapability-gated\b/i);
  assert.doesNotMatch(content, /\bcapability present\b/i);
  assert.doesNotMatch(content, /\bcapability absent\b/i);
  assert.doesNotMatch(content, /\bmissing capability\b/i);
  assert.doesNotMatch(content, /\badapter capability\b/i);
  assert.doesNotMatch(content, /\bcapability grant\b/i);
  assert.doesNotMatch(content, /\bcapability presentation\b/i);
  assert.doesNotMatch(content, /\bmissingCapability\b/);
  assert.match(content, /\bmissingAdapterCapability\b/);
  assert.match(content, /\bCapabilityGrant\b/);
  assert.match(content, /\bCapabilityPresentation\b/);
  assert.match(
    content,
    /Acceptance Checklist[\s\S]*reject ambiguous\s+adapter-support\s+phrasing[\s\S]*CapabilityGrant[\s\S]*CapabilityPresentation/,
  );
});

test("MCP parity design keeps playback obstruction inside PlaybackControlResult", () => {
  const content = readRepoText(
    "docs/design/0022-mcp-agent-parity/mcp-agent-parity.md",
  );

  assert.doesNotMatch(content, /\bObstructedResult\b/);
  assert.doesNotMatch(content, /Output schema: `PlaybackControlResult`\./);
  assert.match(
    content,
    /Output schema: `PlaybackControlResult` \(OK or OBSTRUCTED by top-level `posture`\)\./,
  );
  assert.match(content, /"oneOf": \[/);
  assert.match(content, /"title": "PlaybackControlObstructed"/);
  assert.match(content, /"required": \["reason", "missingAdapterCapability"\]/);
});

test("Continuum near-future design declares MCP and TUI surfaces with SVG mockups", () => {
  const designPath = "docs/design/0023-continuum-operator-surface/continuum-operator-surface.md";
  const mockups = [
    "docs/design/0023-continuum-operator-surface/assets/continuum-overview-tui.svg",
    "docs/design/0023-continuum-operator-surface/assets/reading-envelope-inspector-tui.svg",
    "docs/design/0023-continuum-operator-surface/assets/suffix-sync-inspector-tui.svg",
  ];

  assert.equal(repoPathExists(designPath), true);
  assertContinuumMockupsExist(mockups);

  const content = readRepoText(designPath);
  assertAllTextPresent(content, [
    "## Continuum Takeaways",
    "## Near-Future Additions",
    "## Agent MCP Surface",
    "## TUI Surface",
    "## Mock TUI Layouts",
    "## Mermaid Class Diagram",
    "## Entity Relationship Diagram",
    "## Sequence Diagrams",
  ]);

  assertAllTextPresent(content, [
    "IntentEnvelope",
    "TickResult",
    "ObserverPlan",
    "ObservationRequest",
    "ReadingEnvelope",
    "ContinuumEvidenceStatus",
    "WitnessedSuffixShell",
    "CausalSuffixBundle",
    "ImportOutcome",
  ]);

  assertAllTextPresent(content, [
    "warp_ttd.inspect_runtime_boundary",
    "warp_ttd.inspect_reading_envelopes",
    "warp_ttd.inspect_evidence_status",
    "warp_ttd.inspect_witnessed_suffix_shells",
    "warp_ttd.inspect_import_outcomes",
    "warp_ttd.trace_continuum_chain",
  ]);

  assert.match(content, /!\[Continuum overview TUI mockup\]/);
  assertMermaidFencePresent(content, "classDiagram");
  assertMermaidFencePresent(content, "erDiagram");
  assertMermaidFencePresent(content, "sequenceDiagram");
});

test("WARP app debugging intents stay debugger-local", () => {
  const designPath = "docs/design/0025-warp-app-debugging-intents/warp-app-debugging-intents.md";

  assert.equal(repoPathExists(designPath), true);

  const content = readRepoText(designPath);

  assertAllTextPresent(content, [
    "## Answer",
    "## Product Feel",
    "## Investigation Intent Model",
    "## Core Intents",
    "## What The User Can Do",
    "## Agent Surface",
    "## Playback Questions",
    "## Non-Goals",
  ]);

  assertAllTextPresent(content, [
    "InvestigationIntent",
    "Echo `IntentEnvelope` is a runtime/app fact",
    "WARP TTD `InvestigationIntent` is a debugger-session fact",
    "hostMutation: false",
    "admissionRequired: false",
    "ORIENT_TARGET",
    "TRACE_READING",
    "INSPECT_ADMISSION",
    "REQUEST_SPECULATION",
    "warp_ttd.resolve_investigation_intent",
    "warp_ttd.explain_outcome",
    "warp_ttd.compare_coordinates",
  ]);

  assertAllTextPresent(content, [
    "No Echo `IntentEnvelope` authoring.",
    "No grant issuance.",
    "No Echo runtime admission.",
    "No app mutation.",
    "No strand creation.",
    "No TUI-only investigation behavior.",
  ]);

  assertMermaidFencePresent(content, "sequenceDiagram");
});

test("debugger shared-family boundary classifies protocol ownership", () => {
  const content = readRepoText(SHARED_FAMILY_BOUNDARY_DESIGN);

  assertSharedFamilyBoundaryLifecycle();
  assertSharedFamilyBoundaryHeadings(content);
  assertSharedFamilyBoundaryTerms(content);
  assertSharedFamilyBoundaryRules(content);
});

test("manual starts generated family ingress cycle", () => {
  assertManualFilesExist();
  assertManualFrontDoors();
  assertManualIndexContent();
  assertGeneratedFamilyIngressManual(readRepoText(GENERATED_FAMILY_INGRESS_MANUAL));
  assertGeneratedFamilyIngressDesign(readRepoText(GENERATED_FAMILY_INGRESS_DESIGN));
  assertHostPublishedFamilyFactsManual(readRepoText(HOST_PUBLISHED_FAMILY_FACTS_MANUAL));
  assertHostPublishedFamilyFactsDesign(readRepoText(HOST_PUBLISHED_FAMILY_FACTS_DESIGN));
  assertLiveEchoFamilyIntakeManual(readRepoText(LIVE_ECHO_FAMILY_INTAKE_MANUAL));
  assertGeneratedFamilyConsumptionManual(readRepoText(GENERATED_FAMILY_CONSUMPTION_MANUAL));
  assertJeditEchoSmokeManual(readRepoText(JEDIT_ECHO_SMOKE_MANUAL));
  assertEchoAdapterProbeManual(readRepoText(ECHO_ADAPTER_PROBE_MANUAL));
  assertWesleyGeneratedEchoFamilyManual(readRepoText(WESLEY_GENERATED_ECHO_FAMILY_MANUAL));
  assertContinuumTargetDiscoveryManual(readRepoText(CONTINUUM_TARGET_DISCOVERY_MANUAL));
  assertContinuumCausalDebuggerManual(readRepoText(CONTINUUM_CAUSAL_DEBUGGER_MANUAL));
  assertNextFiveDesigns();
});

test("MCP admission-chain surface is closed as a landed cycle", () => {
  const graveyardPath = "docs/method/graveyard/DELIVERY_mcp-admission-chain-surface.md";

  assert.equal(
    repoPathExists("docs/method/backlog/asap/DELIVERY_mcp-admission-chain-surface.md"),
    false,
  );
  assert.equal(repoPathExists(graveyardPath), true);

  const design = readRepoText(
    "docs/design/0019-mcp-admission-chain-surface/mcp-admission-chain-surface.md",
  );
  const content = readRepoText(graveyardPath);

  assert.match(design, /status: landed/);
  assert.match(content, /\*\*Status:\*\* complete/);
  assert.doesNotMatch(content, /mirror the current structured CLI/i);
  assert.match(content, /MCP should not mirror CLI\./);
  assert.match(content, /MCP should expose the lawful admission chain\./);
  assert.match(content, /MCP is transport and inspection\./);
  assert.match(content, /It is not authority, admission, grants, or\s+mutation\./);
  assert.doesNotMatch(content, /present an invocation for admission/i);
  assert.match(content, /inspect capability presentation and invocation posture/i);

  for (const noun of [
    "registered optic handles",
    "artifact requirements",
    "grant posture",
    "admission ticket",
    "witness",
    "receipt",
    "reading envelope",
  ]) {
    assert.match(content, new RegExp(noun, "i"));
  }
});

test("bearing promotes admission-chain read model before strand speculation", () => {
  assert.equal(
    repoPathExists("docs/method/backlog/asap/D-strand-speculation.md"),
    false,
  );
  assert.equal(
    repoPathExists("docs/method/backlog/up-next/D-strand-speculation.md"),
    true,
  );

  const bearing = readRepoText("docs/BEARING.md");
  const strand = readRepoText("docs/method/backlog/up-next/D-strand-speculation.md");

  assert.match(bearing, /Admission-Chain Read Model/);
  assert.match(
    bearing,
    /docs\/design\/0024-admission-chain-read-model\/admission-chain-read-model\.md/,
  );
  assert.match(
    bearing,
    /docs\/method\/backlog\/up-next\/PROTO_admission-chain-inspector\.md/,
  );
  assert.doesNotMatch(
    bearing,
    /docs\/method\/backlog\/asap\/DELIVERY_mcp-admission-chain-surface\.md/,
  );
  assert.match(
    bearing,
    /MCP is not authority, admission, grant issuance, or\s+mutation\./,
  );
  assert.match(strand, /blocked by admission-chain representation/);
  assert.match(strand, /No strand creation before admission-chain representation exists\./);
});

test("admission-chain backlog keeps registration and handle as primary facts", () => {
  const content = readRepoText("docs/method/backlog/up-next/PROTO_admission-chain-inspector.md");

  assert.match(content, /- `OpticRegistrationDescriptor`/);
  assert.match(content, /- Echo-owned `OpticArtifactHandle`/);
  assert.match(content, /artifact registration, registration descriptor, handle/);
});

test("admission-chain read model cycle defines versioned ordered facts", () => {
  const content = readRepoText(
    "docs/design/0024-admission-chain-read-model/admission-chain-read-model.md",
  );

  assert.match(content, /schemaVersion: "warp-ttd\.admission-chain\.v1"/);
  assert.match(content, /The `facts` list is canonical order for agents/);
  assert.match(
    content,
    /`OpticArtifactHandle` remains a runtime registration handle, not authority/,
  );
  assert.match(content, /No Echo runtime admission/);
});

test("bearing keeps jedit and graft as witness targets, not debugger architecture", () => {
  const bearing = readRepoText("docs/BEARING.md");
  const backlog = readRepoText("docs/method/backlog/up-next/DELIVERY_dual-live-app-debugging.md");

  assertAllTextPresent(bearing, [
    "Continuum-Compatible Target Debugging",
    "Continuum-compatible targets",
    "default witness targets",
    "special debugger concepts",
  ]);

  for (const content of [bearing, backlog]) {
    assert.match(content, /jedit/i);
    assert.match(content, /live Echo app/i);
    assert.match(content, /graft/i);
    assert.match(content, /live git-warp app/i);
  }

  assert.match(
    backlog,
    /same debugger surface can inspect both apps without becoming either app's\s+domain model/i,
  );
});

test("README documents the Wesley sibling checkout needed by generation", () => {
  const content = readRepoText("README.md");

  assert.match(content, /sibling checkout/i);
  assert.match(content, /\.\.\/wesley\/crates\/wesley-cli\/Cargo\.toml/);
});

test("navigator design uses exact AdapterCapability enum literals", () => {
  const content = readRepoText("docs/design/0009-navigator-view/0013-navigator-view-design.md");

  assert.doesNotMatch(content, /`read:/);
  assert.match(content, /`READ_RECEIPTS`/);
  assert.match(content, /`READ_EFFECT_EMISSIONS`/);
  assert.match(content, /`READ_DELIVERY_OBSERVATIONS`/);
});

test("materialized reading inspector stays in CORE_VIEWS taxonomy", () => {
  const cvPath = "docs/method/backlog/up-next/CV_materialized-reading-inspector.md";
  const vizPath = "docs/method/backlog/up-next/VIZ_materialized-reading-inspector.md";

  assert.equal(repoPathExists(cvPath), true);
  assert.equal(repoPathExists(vizPath), false);
  assert.match(readRepoText(cvPath), /\*\*Legend:\*\* CORE_VIEWS/);
});

test("lint ratchet doctrine reflects zero ceiling", () => {
  assert.equal(readRepoText("lint-ceiling.txt").trim(), "0");
  assert.equal(
    repoPathExists("docs/method/backlog/bad-code/lint-ratchet-hot-files.md"),
    false,
  );
  assert.equal(
    repoPathExists("docs/method/graveyard/lint-ratchet-hot-files.md"),
    true,
  );

  const policy = readRepoText("docs/method/backlog/lint-ratchet.md");
  assert.match(policy, /\*\*Status:\*\* complete/);
  assert.doesNotMatch(policy, /does not yet comply/i);
});

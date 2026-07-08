---
format: "warp-design-v1"
title: "Continuum Runtime Discovery Command And Local Registry"
cycle: "0078"
legend: "PROTO"
issue: "https://github.com/flyingrobots/warp-ttd/issues/78"
status: "proposed"
base_commit: "73a6964fe57b2e7a6126db53e91927506f9186f1"
created: "2026-07-08"
updated: "2026-07-08"
proof_policy: "behavior-required"
agent_surfaces:
  - "CLI JSON: warp-ttd discover --json"
  - "MCP: warp_ttd.inspect_runtime_discovery"
  - "TypeScript read model: ContinuumRuntimeDiscoveryInspection"
human_surfaces:
  - "Manual chapter for runtime discovery"
  - "ROADMAP.md generated checklist"
targets:
  - "jedit"
  - "graft"
  - "descriptor-only Continuum targets"
manual: "required"
---

# Continuum Runtime Discovery Command And Local Registry

## Linked Issue

Parent goalpost: [#78 Continuum runtime discovery command and local registry](https://github.com/flyingrobots/warp-ttd/issues/78).

Design slice: [#146 [0078-S1] Method design for local runtime discovery registry](https://github.com/flyingrobots/warp-ttd/issues/146).

Follow-on implementation slices: [#147](https://github.com/flyingrobots/warp-ttd/issues/147), [#148](https://github.com/flyingrobots/warp-ttd/issues/148), [#149](https://github.com/flyingrobots/warp-ttd/issues/149), [#150](https://github.com/flyingrobots/warp-ttd/issues/150), and [#151](https://github.com/flyingrobots/warp-ttd/issues/151).

## Decision Summary

Add a deterministic local runtime discovery contract that reads an explicit registry, composes the existing target descriptor and runtime hello inspections, and reports one `ContinuumRuntimeDiscoveryInspection` envelope across CLI JSON and MCP. The first shipped command surface is `warp-ttd discover --json` exposed locally as `npm run discover -- --json`; the MCP parity surface is `warp_ttd.inspect_runtime_discovery`. Discovery remains read-only: it does not scan networks, issue authority, perform admission, mutate hosts, start background daemons, or parse raw Echo WAL.

The registry is a local JSON artifact with schema version `warp-ttd.runtime-registry.v1`. It contains ordered runtime entries, each with an id, optional labels, a target descriptor connection, and optional non-secret metadata. Runtime discovery normalizes those entries into `ABSENT`, `UNSUPPORTED`, `OBSTRUCTED`, and `REACHABLE` discovery postures with structured reasons.

## Sponsored Human

A maintainer can add a local registry entry for a Continuum-compatible runtime and ask WARP TTD what is discoverable without remembering whether the runtime is jedit, graft, a descriptor-only witness, or a future adapter. The answer is a stable JSON object that tells the maintainer whether the runtime is reachable, absent, unsupported, or obstructed and why.

## Sponsored Agent

An agent can call the CLI or MCP discovery surface before attempting runtime hello, consent/auth, capability discovery, causal query, or workbench behavior. The agent receives the same ordered records through both surfaces and can route next actions from machine-readable states and reason codes rather than scraping terminal text or inferring failure from thrown errors.

## Hill

Agents can run one local runtime discovery command and receive deterministic, secret-safe facts for every configured Continuum-compatible runtime, including why each runtime is reachable, absent, unsupported, or obstructed, before any endpoint consent/auth, capability discovery, or live debugger operation is attempted.

## Current Truth

The current repository already has a descriptor-backed target inspection model. `ContinuumDebugTargetDescriptor` names target id, app kind, label, and connection, while `LiveTargetInspection` reports connection mode, host kind, adapter posture, runtime boundary evidence, capabilities, and read-only posture at [src/app/liveTargetInspection.ts](https://github.com/flyingrobots/warp-ttd/blob/73a6964fe57b2e7a6126db53e91927506f9186f1/src/app/liveTargetInspection.ts#L97-L121). Existing descriptor ingestion can read `WARP_TTD_TARGETS_JSON` and converts parse failures into obstructed target facts instead of throwing through the public inspection surface at [src/app/liveTargetInspection.ts](https://github.com/flyingrobots/warp-ttd/blob/73a6964fe57b2e7a6126db53e91927506f9186f1/src/app/liveTargetInspection.ts#L583-L598).

Runtime hello already defines `continuum.debug.hello.v1` and an inspection wrapper with `PRESENT`, `ABSENT`, `UNAVAILABLE`, `UNSUPPORTED`, `OBSTRUCTED`, `RIGHTS_LIMITED`, and `REDACTED` hello posture values at [src/app/runtimeHelloInspection.ts](https://github.com/flyingrobots/warp-ttd/blob/73a6964fe57b2e7a6126db53e91927506f9186f1/src/app/runtimeHelloInspection.ts#L14-L108). The CLI currently exposes `targets`, `target-session`, and `runtime-hello`, but no runtime discovery command, at [src/cli.ts](https://github.com/flyingrobots/warp-ttd/blob/73a6964fe57b2e7a6126db53e91927506f9186f1/src/cli.ts#L15-L24). MCP currently exposes `warp_ttd.inspect_live_targets` and `warp_ttd.inspect_runtime_hello`, but no runtime discovery parity surface, at [src/mcp/admissionChainSurface.ts](https://github.com/flyingrobots/warp-ttd/blob/73a6964fe57b2e7a6126db53e91927506f9186f1/src/mcp/admissionChainSurface.ts#L29-L52).

The missing piece is not another app-specific branch. The missing piece is a registry-backed discovery read model that makes the configured runtime set explicit and then composes the existing target and hello facts in a deterministic order.

## Problem

WARP TTD can inspect hard-coded witness targets and descriptor JSON, and it can ask those targets for runtime hello posture. It cannot yet answer the operator and agent question, "what local Continuum-compatible runtimes are configured here, and what is the exact discovery posture of each one?" That gap keeps later work vague: endpoint consent/auth in #79 cannot know which endpoints need consent; capability discovery in #82 cannot know which runtime set to evaluate; browser/runtime work cannot rely on one neutral discovery surface.

The failure modes must be first-class. An absent root is different from an unsupported connection mode. A malformed registry is different from an obstructed descriptor. A reachable translated git-warp runtime is different from a native Continuum witness. These distinctions need stable reason codes before implementation begins.

## Scope

- Define `warp-ttd.runtime-registry.v1`, the local registry schema consumed by #147.
- Define `ContinuumRuntimeDiscoveryInspection`, the read model emitted by CLI and MCP.
- Define the discovery postures `REACHABLE`, `ABSENT`, `UNSUPPORTED`, and `OBSTRUCTED`.
- Define deterministic registry source selection and ordering.
- Define the CLI JSON surface `warp-ttd discover --json` and package script `npm run discover -- --json`.
- Define MCP parity as `warp_ttd.inspect_runtime_discovery`.
- Define fixture and test oracles for registry normalization, CLI JSON behavior, MCP parity, redaction, and roadmap closeout.

## Non-Goals

- No ambient network scanning.
- No endpoint probing outside explicitly configured local descriptors.
- No runtime mutation.
- No authority issuance.
- No runtime admission.
- No credential validation or token refresh; #79 owns consent/auth posture.
- No background daemon or watched registry.
- No raw Echo WAL parsing.
- No UI-only truth and no tests that assert Markdown prose.

## Agent-First Surface

The canonical surface is structured data. Agents should use CLI JSON or MCP and receive the same discovery records. Human-oriented text can be added later, but it is not the source of truth.

The first command is:

```bash
warp-ttd discover --json
```

In this repository's current script shape, #148 adds:

```bash
npm run discover -- --json
```

The first MCP tool is:

```text
warp_ttd.inspect_runtime_discovery
```

The output envelope contains `runtimeDiscovery`, an ordered array of `ContinuumRuntimeDiscoveryRecord` objects.

## Agent Interface

CLI JSON emits one JSONL envelope:

```json
{
  "schemaVersion": "warp-ttd.continuum-runtime-discovery-inspection.v1",
  "registry": {
    "schemaVersion": "warp-ttd.runtime-registry.v1",
    "source": {
      "kind": "DEFAULT" 
    },
    "entryCount": 2
  },
  "runtimeDiscovery": []
}
```

MCP returns the same payload shape under:

```json
{
  "runtimeDiscovery": {
    "schemaVersion": "warp-ttd.continuum-runtime-discovery-inspection.v1",
    "registry": {},
    "runtimeDiscovery": []
  }
}
```

The tool name follows the existing read-only naming convention: `warp_ttd.inspect_live_targets`, `warp_ttd.inspect_runtime_hello`, then `warp_ttd.inspect_runtime_discovery`.

## Agent DX

Agents should be able to branch on only these fields for the first pass:

- `discoveryPosture`: `REACHABLE`, `ABSENT`, `UNSUPPORTED`, or `OBSTRUCTED`.
- `reasons[].code`: stable machine-readable reason code.
- `target.targetId`: stable local id from the registry.
- `target.connectionMode`: descriptor connection mode.
- `hello.helloPosture`: optional runtime hello posture when discovery can compose hello facts.
- `redaction.redacted`: whether secret-like registry fields were removed from the emitted read model.

Agents should never need to parse the human message field. The message field is for operator context only.

## Runtime / API / Protocol Contract

### Registry

The first registry schema is:

```ts
interface ContinuumRuntimeRegistry {
  schemaVersion: "warp-ttd.runtime-registry.v1";
  runtimes: readonly ContinuumRuntimeRegistryEntry[];
}

interface ContinuumRuntimeRegistryEntry {
  id: string;
  label?: string;
  appKind?: string;
  connection: ContinuumDebugTargetConnection;
  metadata?: Record<string, string | number | boolean | null>;
}
```

Registry source selection is deterministic:

1. Explicit CLI `--registry <path>` when the CLI supports it.
2. `WARP_TTD_RUNTIME_REGISTRY_JSON` for hermetic tests and agent-supplied payloads.
3. `WARP_TTD_RUNTIME_REGISTRY_PATH` for an explicit local JSON file.
4. Built-in witness registry synthesized from the existing default target descriptors.

The implementation must not scan the current directory, home directory, network, process table, browser profile, or running daemons to discover additional runtimes.

### Discovery read model

```ts
type RuntimeDiscoveryPosture =
  | "REACHABLE"
  | "ABSENT"
  | "UNSUPPORTED"
  | "OBSTRUCTED";

interface ContinuumRuntimeDiscoveryInspection {
  schemaVersion: "warp-ttd.continuum-runtime-discovery-inspection.v1";
  registry: ContinuumRuntimeRegistryInspection;
  runtimeDiscovery: readonly ContinuumRuntimeDiscoveryRecord[];
}

interface ContinuumRuntimeDiscoveryRecord {
  target: {
    targetId: string;
    targetLabel?: string;
    appKind: string;
    connectionMode: LiveTargetConnectionMode;
  };
  discoveryPosture: RuntimeDiscoveryPosture;
  targetInspection: LiveTargetInspection;
  hello?: ContinuumRuntimeHelloInspection;
  evidencePosture: RuntimeHelloEvidencePosture | LiveTargetRuntimeBoundaryEvidencePosture;
  readOnly: true;
  consent: "NOT_REQUIRED" | "DESIGN_DEFERRED";
  auth: "NOT_REQUIRED" | "DESIGN_DEFERRED";
  redaction: {
    redacted: boolean;
    fields: readonly string[];
  };
  reasons: readonly RuntimeDiscoveryReason[];
}

interface RuntimeDiscoveryReason {
  code: string;
  message: string;
  source:
    | "REGISTRY"
    | "TARGET_DESCRIPTOR"
    | "RUNTIME_HELLO"
    | "ADAPTER_TRANSLATION"
    | "WARP_TTD";
}
```

### Posture mapping

`REACHABLE` means WARP TTD can deterministically compose a target inspection and a non-obstructed runtime hello inspection from the configured local descriptor. It does not mean WARP TTD has authority, admission, or mutable control.

`ABSENT` means the registry entry is well-formed but the configured local root, descriptor payload, or hello capability is not present.

`UNSUPPORTED` means the registry entry requests a mode, runtime family, ABI, or endpoint behavior that this slice does not support. Endpoint URLs are unsupported until #79 defines consent/auth posture.

`OBSTRUCTED` means WARP TTD cannot evaluate the entry because the registry is malformed, duplicate ids exist, a required field is missing, JSON cannot parse, a descriptor is malformed, or a local inspection dependency fails in a structured way.

## Evidence / Authority / Mutation Boundary

Discovery is read-only and evidence-preserving. It may read an explicit registry JSON value, read an explicit registry file path, inspect local path existence, and compose existing `inspectLiveTargets` and `inspectRuntimeHello` results. It may not open a mutable runtime session, write registry files, issue capability grants, admit artifacts, validate credentials, or infer hidden state from human views.

Runtime discovery output must carry `readOnly: true`, `authority: NOT_ISSUED` through composed hello posture where present, and no field that claims admission was performed. Where the hello read model already reports `mutation: NOT_SUPPORTED`, `authority: NOT_ISSUED`, and `admission: NOT_PERFORMED`, discovery preserves those values rather than duplicating or weakening them.

## Posture Matrix

| Registry/input condition | Discovery posture | Required reason code | Follow-on owner |
|---|---|---|---|
| Default graft descriptor with present git-warp root and hello translation | `REACHABLE` | `RUNTIME_HELLO_PRESENT` | #148/#149 |
| jedit or echo-root descriptor with missing root | `ABSENT` | `LOCAL_ROOT_MISSING` | #147/#148 |
| Descriptor-only entry with adapter posture `UNSUPPORTED` | `UNSUPPORTED` | `DESCRIPTOR_UNSUPPORTED` | #147/#148 |
| Endpoint URL entry before consent/auth design | `UNSUPPORTED` | `ENDPOINT_CONSENT_NOT_DESIGNED` | #79 |
| Registry JSON parse failure | `OBSTRUCTED` | `REGISTRY_JSON_PARSE_FAILED` | #147 |
| Duplicate registry ids | `OBSTRUCTED` | `REGISTRY_DUPLICATE_ID` | #147 |
| Credential-like field present in registry metadata | Same as underlying entry if otherwise valid | `REGISTRY_SECRET_FIELD_REDACTED` | #147/#150 |
| Runtime hello reports obstructed | `OBSTRUCTED` | `RUNTIME_HELLO_OBSTRUCTED` | #148/#149 |
| Runtime hello reports unsupported | `UNSUPPORTED` | `RUNTIME_HELLO_UNSUPPORTED` | #148/#149 |

## Host / Target Applicability

The first target set is jedit, graft, and descriptor-only Continuum targets. The registry must not special-case jedit or graft as debugger concepts. Their current witness value is that they exercise echo-root, git-warp, and descriptor-only pathways.

Browser runtime targets, remote endpoints, and VISOR bundle targets are downstream. They should enter through the same registry/read-model contract once their own target descriptors and consent/auth posture exist.

## Data / State Model

Runtime discovery is a pure read model over three inputs:

1. Registry source and normalized registry entries.
2. Live target inspection facts derived from target descriptors.
3. Runtime hello inspection facts derived from target inspection and session posture where applicable.

The read model does not own durable state. The registry file is an operator-authored input, not WARP TTD state. Generated discovery records are snapshots and can be regenerated from the same inputs.

Stable requirement IDs for implementation:

| Requirement | Contract |
|---|---|
| `R-0078-1` | Registry parsing accepts only `warp-ttd.runtime-registry.v1` and reports malformed JSON/schema as structured obstruction records. |
| `R-0078-2` | Registry entries normalize to deterministic ordered descriptors without hard-coded app-name dispatch. |
| `R-0078-3` | Discovery records distinguish `REACHABLE`, `ABSENT`, `UNSUPPORTED`, and `OBSTRUCTED` with stable reason codes. |
| `R-0078-4` | Discovery composes existing target inspection and runtime hello facts without authority, admission, mutation, or network scan. |
| `R-0078-5` | CLI JSON and MCP return the same discovery records for the same fixture inputs. |
| `R-0078-6` | Secret-like registry fields are never emitted; redaction is visible as structured posture. |
| `R-0078-7` | Endpoint entries remain unsupported until #79 defines consent/auth posture. |

## Protocol / Generated Family Placement

The initial TypeScript read model can live beside the current app inspection surfaces. It should not enter the Wesley-generated protocol until #113 resolves schema ownership. The schema version strings are still explicit so downstream consumers can detect incompatible output.

`ContinuumRuntimeDiscoveryInspection` composes existing `LiveTargetInspection` and `ContinuumRuntimeHelloInspection` shapes rather than redefining those contracts. Any later generated-family or protocol publication step must preserve that composition boundary.

## User Experience / Product Shape

The first user-facing shape is boring by design:

```bash
warp-ttd discover --json
```

Human text mode can summarize the same records, but it is not required for this goalpost. If added, it must be a rendering of the JSON facts and not a separate discovery engine.

Operators should be able to answer three questions from the output:

- Which local runtimes are configured?
- Which ones are reachable, absent, unsupported, or obstructed?
- Which exact reason code explains the next action?

## Accessibility Posture

No visual-only or TUI-only truth is introduced in this slice. All facts needed by later human surfaces are present in structured CLI/MCP output. Future UI work should render the same `discoveryPosture`, reason codes, redaction posture, and source references textually.

## Localization / Directionality Posture

Machine-readable codes are ASCII identifiers and are stable across locales. Human `message` text is supplemental. Future localization must not change codes, schema versions, target ids, connection modes, or posture values.

## Agent Inspectability / Explainability Posture

Every non-`REACHABLE` record must include at least one reason. Every `REACHABLE` record must include the positive reason `RUNTIME_HELLO_PRESENT` or another equally explicit support reason when a native Continuum target replaces translated hello posture. Agents can produce a transparent next action:

- `ABSENT` -> ask operator to configure local root or registry entry.
- `UNSUPPORTED` -> defer to the issue that owns the missing capability.
- `OBSTRUCTED` -> report the exact malformed or blocked input.
- `REACHABLE` -> proceed to consent/auth or capability discovery as allowed.

## Security / Redaction / Consent Posture

Registry metadata may not emit secret-like keys. The parser must treat keys containing `token`, `secret`, `password`, `credential`, `authorization`, `cookie`, or `privateKey` as redaction candidates regardless of case. Discovery output includes the redaction field names but not their values.

Endpoint URLs with credentials must not be emitted raw. Until #79 lands, endpoint-mode registry entries are `UNSUPPORTED` with `ENDPOINT_CONSENT_NOT_DESIGNED`. This preserves the #78 boundary: discovery can list configured local facts without becoming a consent/auth system.

## Determinism Contract

Discovery order is deterministic:

1. Registry entry order is preserved after normalization.
2. Duplicate ids are reported as obstruction records in first-seen order.
3. Default witness registry order remains jedit, then graft, matching existing target inspection behavior.
4. CLI and MCP use the same application function for normalization and discovery.
5. Error records include stable codes and deterministic messages for the same input.

No clocks, random ids, process lists, network broadcasts, or filesystem scans may influence output.

## Compatibility / Migration Contract

Existing `targets`, `target-session`, and `runtime-hello` surfaces remain valid. `discover` is an additive command. Existing `WARP_TTD_TARGETS_JSON` descriptor ingestion remains supported, but the registry schema becomes the preferred local runtime configuration for discovery.

The first implementation may internally adapt registry entries into `ContinuumDebugTargetDescriptor` records to reuse target and hello inspection. That adapter is an implementation detail; the public discovery contract is the registry schema plus discovery read model.

## Linked Invariants

- Agent-native first: CLI JSON and MCP are canonical.
- No app identity as dispatch boundary: jedit and graft are witness descriptors, not special debugger concepts.
- No ambient scanning: every runtime comes from explicit registry/default descriptors.
- No authority/admission/mutation in discovery.
- Secret-bearing inputs are redacted from every structured surface.
- No Markdown/prose-examination tests.

## Design Alternatives Considered

### Option A: Extend `targets` only

This would avoid adding another command, but it would blur target descriptor posture with runtime discovery. `targets` answers "what target descriptors are inspectable"; `discover` answers "which configured Continuum runtimes can I proceed with, and why?" Keeping those separate gives #79 and #82 a cleaner dependency.

### Option B: Full endpoint discovery now

This would make discovery feel more complete, but it crosses directly into consent, auth, secret redaction, retries, and network policy. That is #79's job. Pulling it into #78 would make the first registry slice much riskier and would violate the no ambient scanning boundary.

### Option C: Registry-backed local discovery first

This is the chosen path. It keeps the first registry deterministic, local, and read-only while still creating the contract later endpoint and capability work can extend.

## Decision

Adopt Option C. #147 implements registry schema and fixtures. #148 adds CLI JSON. #149 adds MCP parity. #150 updates Manual/topic evidence. #151 closes the goalpost after validation and roadmap sync.

## Implementation Slices

- #147: Add registry schema, registry normalization, fixture matrix, reason codes, redaction detection, and behavior tests for the data model.
- #148: Add `discover` to CLI command routing, package script `discover`, JSON output, exit behavior, and CLI fixture tests.
- #149: Add `warp_ttd.inspect_runtime_discovery` with parity tests against the CLI/read-model fixture matrix.
- #150: Add Manual/topic evidence for the shipped contract and keep documentation proof mapped to behavior tests.
- #151: Run final verification, update ROADMAP/DAG from GitHub issue state, remove stale labels, and close #78 only when all acceptance criteria are true.

## Tests To Write First

- [schema] `runtimeDiscoveryRegistry.spec.ts` rejects unsupported schema versions and malformed registry JSON with `REGISTRY_JSON_PARSE_FAILED` or schema-specific obstruction records.
- [behavior] `runtimeDiscoveryRegistry.spec.ts` preserves registry entry order, reports duplicate ids with `REGISTRY_DUPLICATE_ID`, and maps descriptor-only unsupported entries to `UNSUPPORTED`.
- [behavior] `runtimeDiscoveryInspection.spec.ts` maps missing roots to `ABSENT`, hello obstruction to `OBSTRUCTED`, unsupported endpoint entries to `UNSUPPORTED`, and translated git-warp hello to `REACHABLE`.
- [cli-json] `cliRuntimeDiscovery.spec.ts` proves `discover --json` emits one deterministic JSONL envelope with no human text on stdout.
- [mcp] `mcpRuntimeDiscoverySurface.spec.ts` proves `warp_ttd.inspect_runtime_discovery` returns the same records as the app read model for the fixture matrix.
- [behavior] Redaction tests prove secret-like registry metadata keys are omitted from output and represented only by field names in `redaction.fields`.
- [tooling] Roadmap check proves #146 closure unblocks #147 and keeps ROADMAP/DOT/SVG synchronized with GitHub issue state.

These tests assert software behavior and generated artifact consistency. They must not assert Markdown wording.

## Acceptance Criteria

- The 0078 Method design passes `npm run check:method`.
- Registry schema, discovery result states, CLI JSON surface, MCP surface, fixtures, and redaction/consent boundary are explicitly named.
- Downstream slices have stable requirement IDs and behavioral test oracles.
- No implementation slice needs private planning notes to begin.
- #147 can start with `R-0078-1`, `R-0078-2`, `R-0078-3`, `R-0078-6`, and `R-0078-7`.
- #148 can start with `R-0078-4` and `R-0078-5`.
- #149 can start with `R-0078-5`.

## Validation Plan

For this design slice:

```bash
npm run check:method
npm run docs:verify
npm run roadmap:generate
npm run roadmap:check
npm run roadmap:sync -- --check
git diff --check
```

For implementation slices, add the relevant behavior gates from the repo default verification set:

```bash
npm run test
npm run test:integration
npm run typecheck
npm run lint
npm run lint:check
```

## Playback / Witness

The design witness is the committed Method packet plus the generated roadmap state showing #146 complete and #147 unblocked. The first implementation witness for #147 is a fixture matrix that can be consumed without live Echo or browser targets. The first operator witness for #148/#149 is matching CLI/MCP output for the same registry fixture.

## Manual / Operator Contract

#150 must add or update Manual/topic documentation after behavior lands. That documentation should show the registry shape, command, MCP tool, posture values, redaction behavior, and the boundary with #79. This design slice does not claim the Manual chapter is current until implementation evidence exists.

## Risks

- Registry schema could duplicate target descriptor schema. Mitigation: adapt registry entries into existing target descriptors internally and keep discovery-specific fields focused on registry source, posture, and reasons.
- `REACHABLE` could be mistaken for authority or admitted control. Mitigation: require read-only and no-authority/no-admission posture in every reachable record.
- Endpoint registry entries could leak secrets before #79. Mitigation: mark endpoints unsupported and redact secret-like metadata.
- CLI/MCP parity could drift. Mitigation: both surfaces call the same read-model function and share fixture tests.

## Follow-On Issues

- #147: Local runtime registry schema and fixture matrix.
- #148: Runtime discovery CLI JSON surface.
- #149: Runtime discovery MCP parity surface.
- #150: Runtime discovery Manual and topic evidence update.
- #151: Runtime discovery validation and goalpost closeout.
- #79: Endpoint consent/auth posture for endpoint-mode entries.
- #82: Capability discovery after runtime discovery and consent/auth posture exist.
- #113: Protocol schema reconciliation before external generated protocol publication.

## Closeout Links

- PR: pending.
- Ready-for-review evidence: pending validation on this branch.
- Closeout issue update: #146 should be closed only after the design packet passes validation and the roadmap artifacts show the slice complete.

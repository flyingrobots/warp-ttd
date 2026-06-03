---
format: "warp-design-v1"
title: "Continuum Target Discovery Contract"
cycle: "0076-continuum-target-discovery-contract"
legend: "PROTO"
issue: "https://github.com/flyingrobots/warp-ttd/issues/76"
status: "landed"
base_commit: "bab9f273f5d6e7e442dca7b71c39e566424afd28"
created: "2026-06-03"
updated: "2026-06-03"
proof_policy: "behavior-required"
agent_surfaces:
  - "cli-json"
  - "mcp"
  - "read-model"
human_surfaces:
  - "manual"
targets:
  - "continuum-compatible-targets"
  - "default-jedit-witness"
  - "default-graft-witness"
manual: "required"
---

# Continuum Target Discovery Contract

## Linked Issue

- https://github.com/flyingrobots/warp-ttd/issues/76

## Decision Summary

WARP TTD will inspect Continuum-compatible debug targets from a descriptor
registry instead of from a hard-coded `jedit` and `graft` pair. `jedit` and
`graft` remain default witness descriptors for local development, but target id,
app label, runtime vendor, substrate, and source posture are facts on a target
record rather than app-layer dispatch boundaries.

## Sponsored Human

A runtime integrator wants to point WARP TTD at any Continuum-compatible app so
that vendor runtimes can become debuggable without a WARP TTD code change,
without pretending every target is one of the local sibling repos.

## Sponsored Agent

An agent needs CLI JSON and MCP target inspection to expose deterministic target
descriptor, connection, capability, and evidence-posture facts so it can choose
an inspectable target, without inferring support from app names, vendor names,
or visual-only UI state.

## Hill

By the end of this cycle, an agent can run `targets --json` or MCP
`warp_ttd.inspect_live_targets` and see registered Continuum-compatible targets
derived from descriptor data, including a synthetic third target, while existing
`jedit` and `graft` smokes still pass.

## Current Truth

- Live target names are a closed union of `jedit` and `graft`:
  [src/app/liveTargetInspection.ts#13:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetInspection.ts#L13).
- Live target roots are hard-coded as `jeditRoot` and `graftRoot`:
  [src/app/liveTargetInspection.ts#69:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetInspection.ts#L69).
- Live target inspection dispatches through `inspectJeditTarget` and
  `inspectGraftTarget`, then returns exactly those two entries:
  [src/app/liveTargetInspection.ts#124:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetInspection.ts#L124),
  [src/app/liveTargetInspection.ts#166:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetInspection.ts#L166).
- Live target session inspection also searches for literal `graft` and `jedit`
  target ids:
  [src/app/liveTargetSessionInspection.ts#63:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetSessionInspection.ts#L63),
  [src/app/liveTargetSessionInspection.ts#74:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/src/app/liveTargetSessionInspection.ts#L74).
- BEARING currently frames the product goal as debugging `jedit` and `graft`
  directly:
  [docs/BEARING.md#112:bab9f273f5d6e7e442dca7b71c39e566424afd28](https://github.com/flyingrobots/warp-ttd/blob/bab9f273f5d6e7e442dca7b71c39e566424afd28/docs/BEARING.md#L112).

## Problem

The target layer collapses three different facts into one implementation
boundary: app identity, runtime/substrate identity, and debugger capability.
That makes WARP TTD look compatible with only two blessed sibling repos instead
of with any target that can expose the Continuum debugger contract.

## Scope

This cycle includes:

- A descriptor-backed target registry for Continuum-compatible debug targets.
- Default witness descriptors for the existing `jedit` and `graft` local paths.
- Generic target ids in live target inspection records.
- A descriptor posture for unsupported or not-yet-connected target modes.
- CLI JSON and MCP parity through existing target inspection surfaces.
- A synthetic third target proof that does not require a new hard-coded app.
- Manual, BEARING, and design evidence updates.

## Non-Goals

This cycle does not include:

- Network service discovery.
- WebSocket, stdio, or HTTP runtime handshakes.
- Vendor authentication or consent flow.
- Runtime control, mutation, authority issuance, grant construction, or runtime
  admission.
- New Echo session behavior.
- New git-warp adapter behavior.
- App-specific editor, graph, or vendor semantics in the debugger core.
- No generated modules are executed.

## Agent-First Surface

The first structured surface is the existing target read model visible through
`npm run targets -- --json`, `npm run target-session -- --json`, and MCP
`warp_ttd.inspect_live_targets`. Those surfaces will report descriptor-derived
target records rather than a fixed pair.

## Runtime / API / Protocol Contract

The contract is `ContinuumDebugTargetDescriptor` and
`ContinuumDebugTargetInspection`.

First-cut descriptor fields:

```ts
interface ContinuumDebugTargetDescriptor {
  id: string;
  label?: string;
  appKind?: string;
  connection:
    | { mode: "echo-root"; rootPath: string }
    | { mode: "git-warp"; rootPath: string; graphName: string }
    | {
        mode: "descriptor-only";
        rootPath?: string;
        reason?: string;
        adapterPosture?: "UNSUPPORTED" | "OBSTRUCTED";
      };
}
```

The dispatch rule is:

- protocol/descriptor mode decides which adapter implementation can inspect the
  target in this cycle;
- target id, app label, runtime vendor, and substrate are reported facts;
- unsupported descriptor modes are returned as `UNSUPPORTED` or `OBSTRUCTED`
  posture, not silently ignored.

Default descriptors preserve current behavior:

```json
[
  {
    "id": "jedit",
    "label": "jedit local witness",
    "appKind": "live Echo app",
    "connection": { "mode": "echo-root", "rootPath": "../jedit" }
  },
  {
    "id": "graft",
    "label": "graft local witness",
    "appKind": "live git-warp app",
    "connection": {
      "mode": "git-warp",
      "rootPath": "../graft",
      "graphName": "graft-ast"
    }
  }
]
```

Tests and early integrations can replace the default descriptors with
`WARP_TTD_TARGETS_JSON`. The parser keeps input order, generates deterministic
obstruction records for malformed entries, marks unknown connection modes as
`UNSUPPORTED`, and marks duplicate ids as `OBSTRUCTED`.

## Evidence / Authority / Mutation Boundary

WARP TTD may read descriptor data, inspect target root posture, inspect manifest
metadata, and open existing read-only adapter sessions where that behavior
already exists. It must not infer native Continuum witnesshood from descriptor
presence, app labels, vendor names, root presence, or translated substrate
facts. It does not issue authority, construct grants, perform runtime admission,
mutate host state, or execute generated modules.

## Posture Matrix

| State | Meaning |
| :--- | :--- |
| `PRESENT` root posture | The descriptor root exists locally. |
| `MISSING` root posture | The descriptor root does not exist locally. |
| `CONFIGURED` adapter posture | The descriptor can use a read-only adapter path in this cycle. |
| `UNAVAILABLE` adapter posture | The descriptor has no usable adapter at this moment. |
| `UNSUPPORTED` adapter posture | The descriptor mode is known as future work but cannot be inspected in this cycle. |
| `OBSTRUCTED` adapter posture | The descriptor is malformed or cannot be safely interpreted. |
| `TRANSLATED_SUBSTRATE` evidence | Facts are projected from a substrate and are not native Continuum witnesshood. |
| `CONTINUUM_NATIVE` evidence | Reserved for runtimes that prove native Continuum witness facts. |

## Host / Target Applicability

All configured Continuum-compatible targets appear in `targets --json` and MCP
inspection. The existing `jedit` and `graft` entries remain default witness
descriptors. A synthetic descriptor-only target proves that additional targets
can appear without WARP TTD code knowing an app name.

## Data / State Model

| Data | Source of truth | Reset behavior |
| :--- | :--- | :--- |
| Target descriptors | Defaults plus optional caller-supplied registry args | Change descriptor list or environment defaults. |
| Target id | Descriptor `id` | Change descriptor. |
| Root posture | Filesystem metadata for descriptor root | Recomputed on every inspection. |
| Adapter posture | Derived from descriptor mode and probe/session result | Recomputed on every inspection. |
| Evidence posture | Adapter/descriptor-derived read model | Recomputed on every inspection. |

Invalid states include empty ids, duplicate ids, unsafe root paths when parsing a
descriptor file later, unknown connection modes without explicit unsupported
posture, and target records that omit deterministic reason strings.

## Protocol / Generated Family Placement

This is a debugger-local target discovery contract. It does not add shared
proof-family nouns to `src/protocol.ts`, and it does not claim to be the final
vendor-neutral `continuum.debug-targets.v1` runtime protocol. Later cycles may
promote a stable subset into a Continuum-wide descriptor or handshake schema.

## User Experience / Product Shape

No rendered UI changes. Human operators use existing CLI commands and Manual
documentation. TUI/browser surfaces continue to follow structured target facts.

## Accessibility Posture

No interactive UI changes. Target ids, labels, postures, capabilities, and
reasons are exposed as JSON facts for screen-reader-friendly rendered views and
agent inspection.

## Localization / Directionality Posture

No localized UI strings are added. Reason strings are English operator/debugger
text in CLI/MCP JSON. Future rendered views must wrap target labels and avoid
using label text as a stable id.

## Agent Inspectability / Explainability Posture

Agents can inspect:

- `target`
- `targetLabel`
- `hostKind`
- `appKind`
- `connectionMode`
- `rootPath`
- `rootPosture`
- `adapterPosture`
- `admissionChainPosture`
- `graphName`, when the target uses the git-warp adapter path
- `echoAdapterProbe`, when the target uses the Echo-root probe path
- `sessionFamilyIntake`, when the target uses the Echo-root family-intake path
- `capabilities`
- `runtimeBoundaryEvidence`
- `readOnly`
- `reason`

No pixel scraping or app-name inference is required.

## Security / Redaction / Consent Posture

The first cut reads only local descriptor values, filesystem existence, existing
manifest metadata, and existing read-only adapter surfaces. It does not read
arbitrary target file contents beyond current manifest behavior, does not scan
ports, does not discover remote hosts, does not collect secrets, and does not
export replay payloads.

## Determinism Contract

Default descriptors are emitted in fixed order. Caller-supplied descriptors are
emitted in input order. Duplicate ids are obstructed deterministically. No wall
clock, random id, network discovery, or runtime mutation is involved in the
target-list proof.

## Compatibility / Migration Contract

Existing `targets --json` and `target-session --json` consumers keep `target:
"jedit"` and `target: "graft"` default records. New generic fields are additive.
Existing environment variables `WARP_TTD_JEDIT_ROOT` and `WARP_TTD_GRAFT_ROOT`
remain compatibility aliases for the default descriptors.

## Linked Invariants

- Agent-native / agent-first
- Tests are the executable spec
- Evidence posture is explicit
- No inferred authority
- Target identity is fact data, not app-layer architecture
- Runtime truth wins

## Design Alternatives Considered

### Option A: Keep `jedit` and `graft` hard-coded until after neighborhood facts

Pros:

- Smallest immediate diff.
- Avoids target registry design before the next feature slice.

Cons:

- Deepens the wrong abstraction.
- Makes vendor compatibility depend on future cleanup.
- Encourages app-name dispatch in admission and reading work.

### Option B: Implement full vendor runtime discovery now

Pros:

- Directly addresses auto-discovery.
- Creates the final interop shape sooner.

Cons:

- Requires transport, auth, consent, and handshake decisions before the local
  app-layer seam is corrected.
- Increases security and compatibility risk.

### Option C: Descriptor-backed target registry first

Pros:

- Removes app-name architecture now.
- Preserves existing witness behavior.
- Creates a stable place for later WebSocket, stdio, and vendor discovery.

Cons:

- Does not yet auto-detect running vendor runtimes.
- Keeps Echo/git-warp implementation adapters internally for now.

## Decision

Choose Option C. This cycle makes target discovery descriptor-backed and
capability/posture-oriented while preserving current defaults. Runtime discovery
and vendor handshakes become explicit follow-on issues rather than hidden in a
hard-coded target refactor.

## Implementation Slices

- Sync to the merge target, branch from the issue title slug, write this design
  doc, commit, push, open the PR coordination surface allowed by the current
  repo instructions, and apply `work-in-progress` to the issue.
- Add target descriptor types, default descriptor construction, and generic
  target inspection.
- Add behavior tests for default witness compatibility and a synthetic third
  descriptor-only target.
- Update session inspection to consume target descriptors/inspections without
  hard-coded target pair assumptions where possible in this slice.
- Update Manual, BEARING, CHANGELOG, doctrine tests, retro, and PR closeout.

## Tests To Write First

- [x] [behavior] `inspectLiveTargets` emits default witness descriptors for
      `jedit` and `graft` with unchanged posture.
- [x] [behavior] `inspectLiveTargets` emits a synthetic descriptor-only target
      without a hard-coded app name.
- [x] [behavior] Env descriptors keep unsupported, malformed, and duplicate-id
      entries visible as deterministic posture records.
- [x] [cli-json] `targets --json` exposes descriptor-derived target facts.
- [x] [mcp] `warp_ttd.inspect_live_targets` exposes the same target list.
- [x] [docs] Manual and design vocabulary reject treating app names as debugger
      architecture.

## Acceptance Criteria

The work is done when:

- [x] Behavior/runtime/tooling proof is green when required.
- [x] Documentation/process assertions are not the only proof for implementation
      work.
- [x] Default `jedit` and `graft` target output remains compatible.
- [x] A synthetic third target can be registered and inspected without a new
      hard-coded app branch.
- [x] Malformed, unsupported, and duplicate env descriptors are visible as
      deterministic posture records.
- [x] Authority, admission, mutation, and native-witness boundaries remain
      explicit.
- [x] Issue and PR are linked.
- [ ] CI and local validation are green.

## Validation Plan

Commands expected before PR:

```sh
npm run check:method
node --experimental-strip-types --test test/liveTargetInspection.spec.ts test/cliJson.spec.ts test/mcpAdmissionChainSurface.spec.ts
npm test
npm run test:integration
npx tsc --noEmit
npm run lint
npm run lint:check
git diff --check
```

## Playback / Witness

Reviewers can run:

```sh
npm run targets -- --json
npm run target-session -- --json
node --experimental-strip-types --test test/liveTargetInspection.spec.ts
```

The synthetic target proof is in the focused behavior test and does not require
a third sibling repo.

## Manual / Operator Contract

This cycle adds a Manual chapter because it changes how operators and agents
should think about target identity. The Manual must say that WARP TTD debugs
Continuum-compatible targets and that `jedit`/`graft` are witness defaults, not
special debugger concepts.

## Risks

Known risks:

- Compatibility consumers may assume only two target records.
- Generic descriptors may hide useful substrate-specific facts.
- This first cut could overfit to current root-based defaults.

Mitigations:

- Keep default `jedit` and `graft` records and existing fields.
- Preserve source/evidence posture as inspectable metadata.
- Keep network discovery and handshakes out of this slice.

## Follow-On Issues

- Vendor-neutral `continuum.debug.hello.v1`:
  https://github.com/flyingrobots/warp-ttd/issues/80
- Explicit `warp-ttd discover --json` and local runtime registry discovery:
  https://github.com/flyingrobots/warp-ttd/issues/78
- Consent/auth posture when connecting to runtime endpoints:
  https://github.com/flyingrobots/warp-ttd/issues/79

## Closeout Links

- PR: https://github.com/flyingrobots/warp-ttd/pull/77
- Ready-for-review evidence: CI and local validation were green before merge.
- Retro:
  ../../method/retro/0076-continuum-target-discovery-contract/continuum-target-discovery-contract.md
- Witness:
  `node --experimental-strip-types --test test/liveTargetInspection.spec.ts test/cliJson.spec.ts test/mcpAdmissionChainSurface.spec.ts test/ontologyDoctrine.spec.ts`

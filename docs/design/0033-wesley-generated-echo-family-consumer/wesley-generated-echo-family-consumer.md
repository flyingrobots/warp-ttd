---
format: "warp-design-v1"
title: "Wesley-Generated Echo Family Consumer"
cycle: "0033-wesley-generated-echo-family-consumer"
legend: "PROTO"
issue: "https://github.com/flyingrobots/warp-ttd/issues/68"
status: "active"
base_commit: "56f3ac0b43d3bb001a0126454ce769de1b8d4982"
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
  - "jedit"
  - "graft"
manual: "required"
---

# Wesley-Generated Echo Family Consumer

## Linked Issue

- https://github.com/flyingrobots/warp-ttd/issues/68

## Decision Summary

WARP TTD will make live Echo family intake inspect optional
Wesley-generated Continuum/Echo proof-family artifacts declared by the `jedit`
manifest. The Echo path may report generated-family consumption only when the
manifest descriptor is valid and the required generated files exist under the
target root; fixtures, git-warp, absent descriptors, and missing generated files
remain explicit fallback or unavailable posture.

## Sponsored Human

A maintainer integrating `jedit` with Echo wants WARP TTD to tell whether the
Echo path can see generated family artifacts so that protocol cutover can
advance without extending local debugger mirrors, without having to inspect
target filesystem layout by hand.

## Sponsored Agent

An agent needs `targets --json`, MCP live-target output, and the live Echo
family intake read model to expose generated-artifact posture so it can decide
whether an Echo target is using generated family contracts, without inferring
that from a present root, a present adapter probe, or prose.

## Hill

By the end of this cycle, an agent can inspect `jedit.sessionFamilyIntake` and
see whether generated Continuum Echo inspect artifacts are present, absent, or
unavailable through `targets --json` and MCP, and the repo proves it with
focused live Echo family intake tests plus CLI/MCP regression coverage.

## Current Truth

- The shared-family consumption boundary currently has only
  `GENERATED_FAMILY_UNAVAILABLE` and `LOCAL_MIRROR_FALLBACK` posture types, and
  always returns `LOCAL_MIRROR_FALLBACK`:
  [src/app/sharedFamilyHydration.ts#19:56f3ac0b43d3bb001a0126454ce769de1b8d4982](https://github.com/flyingrobots/warp-ttd/blob/56f3ac0b43d3bb001a0126454ce769de1b8d4982/src/app/sharedFamilyHydration.ts#L19).
- Live Echo family intake already exposes
  `generatedFamilyConsumption`, but it calls the static repo-wide inspection
  instead of inspecting target-published generated artifacts:
  [src/app/liveEchoFamilyIntake.ts#222:56f3ac0b43d3bb001a0126454ce769de1b8d4982](https://github.com/flyingrobots/warp-ttd/blob/56f3ac0b43d3bb001a0126454ce769de1b8d4982/src/app/liveEchoFamilyIntake.ts#L222).
- The current 0033 bearing says this cycle should teach the Echo path to
  consume Wesley-generated Continuum/Echo proof-family TypeScript artifacts
  while preserving `LOCAL_MIRROR_FALLBACK` for fixtures, git-warp, and missing
  packages:
  [docs/BEARING.md#260:56f3ac0b43d3bb001a0126454ce769de1b8d4982](https://github.com/flyingrobots/warp-ttd/blob/56f3ac0b43d3bb001a0126454ce769de1b8d4982/docs/BEARING.md#L260).

## Problem

The live Echo intake surface can say that `jedit` publishes session-family
fields, but it cannot say whether those facts are backed by Wesley-generated
Continuum/Echo family artifacts or only by the local mirror boundary. That
keeps agents from distinguishing real generated-family readiness from the
fallback compatibility path.

## Scope

This cycle includes:

- A manifest extension for optional `generatedFamilyArtifacts`.
- Target-aware generated artifact inspection in `sharedFamilyHydration`.
- Live Echo family intake wiring for `jedit`.
- CLI JSON and MCP parity through existing live-target surfaces.
- Manual and design evidence updates.

## Non-Goals

This cycle does not include:

- Checking generated Continuum or Echo artifacts into WARP TTD.
- Executing generated modules.
- Replacing `src/protocol.ts`.
- Opening an Echo runtime session.
- Hydrating session payloads from generated codecs.
- Grant issuance, `CapabilityPresentation` construction, runtime admission, or
  host mutation.
- Any `jedit` editor-domain behavior.

## Agent-First Surface

The first structured surface is the existing live-target read model, visible
through `npm run targets -- --json` and MCP `warp_ttd.inspect_live_targets`.
The field is `jedit.sessionFamilyIntake.generatedFamilyConsumption`.

## Runtime / API / Protocol Contract

The contract is:

- `inspectSharedFamilyConsumption(args?)` accepts optional generated artifact
  descriptors.
- `SharedFamilyConsumerPosture` gains `GENERATED_FAMILY_PRESENT`.
- `SharedFamilyConsumptionInspection` reports artifact posture, inspected
  artifacts, missing files, and a deterministic reason.
- `inspectLiveEchoFamilyIntake()` reads optional manifest
  `generatedFamilyArtifacts` descriptors and passes them to the shared-family
  boundary.
- The manifest descriptor shape is:

```json
{
  "generatedFamilyArtifacts": [
    {
      "family": "continuum",
      "target": "echo-inspect",
      "schemaVersion": "continuum.echo.inspect-ir/v1",
      "artifactRoot": "dist/generated/continuum-echo-inspect",
      "requiredFiles": [
        "schemas.generated.ts",
        "ops.generated.ts",
        "client.generated.ts"
      ]
    }
  ]
}
```

Paths are target-root-relative and read-only.

## Evidence / Authority / Mutation Boundary

WARP TTD may read root-local manifest descriptors and test for generated file
presence. It must not load executable generated modules, call Echo, open a
session, issue authority, admit work, mutate host files, or infer native
Continuum witnesshood from generated artifact visibility.

## Posture Matrix

| State | Meaning |
| :--- | :--- |
| `GENERATED_FAMILY_PRESENT` | A valid descriptor exists and every required generated file is present. |
| `GENERATED_FAMILY_UNAVAILABLE` | A descriptor exists but generated files are missing or unusable. |
| `LOCAL_MIRROR_FALLBACK` | No descriptor is advertised, so WARP TTD stays on the local mirror boundary. |
| `PRESENT` artifact posture | All required files were observed under the target root. |
| `ABSENT` artifact posture | No generated artifact descriptor was advertised. |
| `OBSTRUCTED` artifact posture | Descriptor shape or paths are invalid, or declared files are missing. |

## Host / Target Applicability

`jedit` is the only target that can advertise Echo generated family artifacts in
this slice. `graft`, echo fixtures, scenario fixtures, and missing `jedit`
roots keep fallback or unavailable posture and do not claim generated-family
consumption.

## Data / State Model

| Data | Source of truth | Reset behavior |
| :--- | :--- | :--- |
| Published session fields | `live-echo-family-facts.json` `publishedFields` | Remove or edit manifest. |
| Generated artifact descriptor | Manifest `generatedFamilyArtifacts` | Remove descriptor to return to fallback. |
| File presence | Target-root-relative generated files | Recomputed on every inspection. |
| Consumer posture | Derived read model | No persisted WARP TTD state. |

Invalid states include absolute paths, `..` path traversal, unknown generated
family, unknown target, empty required file lists, non-string paths, and missing
declared files.

## Protocol / Generated Family Placement

Continuum and Echo own the generated proof-family artifacts. WARP TTD owns the
debugger read model that reports whether those artifacts are visible and usable.
This cycle does not move proof-family nouns into `src/protocol.ts`.

## User Experience / Product Shape

No rendered surface changes. Human operators inspect CLI JSON, MCP output, and
the Manual chapter. TUI/browser rendering is not changed.

## Accessibility Posture

No interactive UI is changed. The machine-readable fields are plain JSON keys
with explicit posture and reason strings.

## Localization / Directionality Posture

No localized user-facing UI strings are added. Reason strings are English
debugger/operator text in CLI/MCP JSON.

## Agent Inspectability / Explainability Posture

Agents can inspect:

- `consumerPosture`
- `artifactPosture`
- `generatedFamily`
- `artifacts[].artifactRoot`
- `artifacts[].requiredFiles`
- `artifacts[].presentFiles`
- `artifacts[].missingFiles`
- `reason`

No pixel scraping or prose-only inference is required.

## Security / Redaction / Consent Posture

The inspection reads only manifest JSON and file metadata under the target root.
It must reject absolute paths and path traversal. It does not read generated
file contents, execute modules, export replay payloads, or collect secrets.

## Determinism Contract

File checks are synchronous, read-only, sorted in manifest order, and derived
from fixture directories in tests. No wall clock, random id, network request, or
runtime host session is involved.

## Compatibility / Migration Contract

Existing manifests with only `publishedFields` remain valid and continue to
report `LOCAL_MIRROR_FALLBACK`. CLI JSON and MCP add fields under the existing
`generatedFamilyConsumption` object without removing the existing top-level
keys.

## Linked Invariants

- Agent-native / agent-first
- Tests are the executable spec
- Evidence posture is explicit
- No inferred authority
- Runtime truth wins
- WARP TTD does not own shared-family nouns

## Design Alternatives Considered

### Option A: Check generated artifacts into WARP TTD

Pros:

- Simple local imports.

Cons:

- Makes WARP TTD look like the owner of Continuum/Echo proof-family artifacts.
- Does not prove the live Echo target can publish the contract.

### Option B: Dynamic import generated modules

Pros:

- Closer to executable generated consumption.

Cons:

- Runs target code in a read-only inspection path.
- Expands the security boundary before Echo adapter/session admission exists.

### Option C: Manifest-declared generated artifact presence

Pros:

- Read-only and deterministic.
- Keeps target ownership visible.
- Lets agents distinguish generated-family readiness from fallback posture.

Cons:

- First cut proves artifact visibility, not generated codec hydration.

## Decision

Use Option C. This cycle makes generated artifact visibility a structured,
target-aware read model. A later cycle can hydrate payloads through generated
codecs after Echo publishes an admitted session surface.

## Implementation Slices

- Sync to the merge target, branch from the issue title slug, write this design
  doc, commit, push, open a draft PR, and apply `work-in-progress` to the issue.
- Add failing live Echo family intake tests for present, absent, unavailable,
  and obstructed generated artifact descriptors.
- Implement target-aware shared-family consumption inspection and manifest
  parsing.
- Add CLI/MCP regression coverage and Manual updates.
- Run validation, update closeout links, and convert the PR to ready-for-review.

## Tests To Write First

- [ ] [behavior] `inspectLiveEchoFamilyIntake` reports
      `GENERATED_FAMILY_PRESENT` only when the manifest descriptor is valid and
      all required generated files exist.
- [ ] [behavior] `inspectLiveEchoFamilyIntake` reports fallback when no
      generated artifact descriptor exists.
- [ ] [behavior] malformed or missing declared generated artifacts do not
      become generated-family success.
- [ ] [cli-json] `targets --json` exposes the generated-family consumer posture
      under `jedit.sessionFamilyIntake.generatedFamilyConsumption`.
- [ ] [mcp] `warp_ttd.inspect_live_targets` exposes the same posture.
- [ ] [docs] Manual and design evidence explain the boundary and non-goals.

## Acceptance Criteria

The work is done when:

- [ ] Live Echo intake tests prove present, fallback, unavailable, and
      obstructed generated artifact posture.
- [ ] CLI JSON and MCP expose the same read-only posture.
- [ ] Existing manifests remain compatible.
- [ ] No generated artifacts are checked into WARP TTD.
- [ ] Issue and PR are linked.
- [ ] CI and local validation are green.

## Validation Plan

Commands expected before PR:

```sh
npm run check:method
npm test
npm run test:integration
npx tsc --noEmit
npm run lint
npm run lint:check
git diff --check
```

Focused commands:

```sh
node --experimental-strip-types --test test/liveEchoFamilyIntake.spec.ts test/cliJson.spec.ts test/mcpAdmissionChainSurface.spec.ts
npm run targets -- --json
```

## Playback / Witness

Reviewers can run `npm run targets -- --json` with a fixture `WARP_TTD_JEDIT_ROOT`
that contains `.warp-ttd/live-echo-family-facts.json` and generated artifact
files. The JSON witness is
`jedit.sessionFamilyIntake.generatedFamilyConsumption`.

## Manual / Operator Contract

Add a Manual chapter for the generated Echo family consumer boundary because it
changes the durable operator contract for interpreting live Echo generated
artifact posture.

## Risks

Known risks:

- A manifest descriptor could overstate generated support.
- Path descriptors could accidentally escape the target root.
- Agents might treat generated artifact presence as native witnesshood.

Mitigations:

- Required files must exist.
- Absolute paths and traversal are rejected.
- Reason strings and non-goals state that artifact presence is not session
  open, authority, admission, payload hydration, or witnesshood.

## Follow-On Issues

- https://github.com/flyingrobots/warp-ttd/issues/62
- https://github.com/flyingrobots/warp-ttd/issues/64

## Closeout Links

- Draft PR: https://github.com/flyingrobots/warp-ttd/pull/75
- Ready-for-review PR: https://github.com/flyingrobots/warp-ttd/pull/75
- Retro: ../../method/retro/0033-wesley-generated-echo-family-consumer/wesley-generated-echo-family-consumer.md
- Witness: `node --experimental-strip-types --test test/liveEchoFamilyIntake.spec.ts test/cliJson.spec.ts test/mcpAdmissionChainSurface.spec.ts`

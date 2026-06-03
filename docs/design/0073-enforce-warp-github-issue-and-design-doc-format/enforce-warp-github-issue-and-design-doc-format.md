---
format: "warp-design-v1"
title: "Enforce WARP GitHub issue and design doc format"
cycle: "0073-enforce-warp-github-issue-and-design-doc-format"
legend: "PROCESS"
issue: "https://github.com/flyingrobots/warp-ttd/issues/73"
status: "active"
base_commit: "ed03a2973dfbfb4325e87abca3d9046c47f07808"
created: "2026-06-03"
updated: "2026-06-03"
proof_policy: "behavior-required"
agent_surfaces:
  - "npm-script"
  - "ci"
human_surfaces:
  - "github-issue-form"
  - "pull-request-template"
targets:
  - "warp-ttd"
manual: "not-applicable"
---

# Enforce WARP GitHub issue and design doc format

## Linked Issue

- https://github.com/flyingrobots/warp-ttd/issues/73

## Decision Summary

WARP TTD will enforce a GitHub-first work format and a `warp-design-v1` design
format through templates, a deterministic `npm run check:method` gate, CI, and
the existing pre-push hook. Cycle work starts from a synced merge target, an
issue-title branch, an initial issue/design commit, and a draft PR coordination
surface marked `work-in-progress`. The gate preserves historical design docs
through a legacy allowlist while requiring future design docs to name
agent-first surfaces, evidence posture, authority boundaries, executable proof,
and closeout links.

## Sponsored Human

A maintainer wants each new WARP cycle to start from a clear issue and design
contract so review can focus on behavior and boundaries, without having to
reverse-engineer intent from chat, old backlog cards, or broad prose.

## Sponsored Agent

An agent needs a deterministic issue/design validation command so it can catch
missing sections, weak proof, and stale tracker assumptions before opening a
PR, without inferring process state from undocumented conventions.

## Hill

By the end of this cycle, new design docs are rejected unless they use the WARP
format, implementation designs name at least one non-doc proof surface, and CI
proves the enforcement through `npm run check:method`.

## Current Truth

- `package.json` has no Method enforcement script before this cycle:
  [package.json#21:ed03a2973dfbfb4325e87abca3d9046c47f07808](https://github.com/flyingrobots/warp-ttd/blob/ed03a2973dfbfb4325e87abca3d9046c47f07808/package.json#L21).
- CI runs typecheck, tests, and lint ratchet but not Method format checks:
  [.github/workflows/ci.yml#30:ed03a2973dfbfb4325e87abca3d9046c47f07808](https://github.com/flyingrobots/warp-ttd/blob/ed03a2973dfbfb4325e87abca3d9046c47f07808/.github/workflows/ci.yml#L30).
- The local pre-push hook also lacks a Method enforcement gate:
  [scripts/hooks/pre-push#5:ed03a2973dfbfb4325e87abca3d9046c47f07808](https://github.com/flyingrobots/warp-ttd/blob/ed03a2973dfbfb4325e87abca3d9046c47f07808/scripts/hooks/pre-push#L5).
- `METHOD.md` still describes filesystem backlog lanes as live priority
  directories:
  [METHOD.md#28:ed03a2973dfbfb4325e87abca3d9046c47f07808](https://github.com/flyingrobots/warp-ttd/blob/ed03a2973dfbfb4325e87abca3d9046c47f07808/METHOD.md#L28).
- The previous design packet shape is concise and agent-native, but it has no
  machine-enforced `warp-design-v1` proof policy:
  [docs/design/0032-echo-adapter-probe-boundary/echo-adapter-probe-boundary.md#1:ed03a2973dfbfb4325e87abca3d9046c47f07808](https://github.com/flyingrobots/warp-ttd/blob/ed03a2973dfbfb4325e87abca3d9046c47f07808/docs/design/0032-echo-adapter-probe-boundary/echo-adapter-probe-boundary.md#L1).

## Problem

The repo has agreed that GitHub Issues are the live tracker and design docs are
evidence, but the repository does not yet enforce that policy. A future PR can
add a vague design doc, omit the agent-facing contract, or rely on
documentation assertions as fake proof without failing CI.

## Scope

This cycle includes:

- GitHub issue forms for Method work, bugs, and spikes.
- A PR proof checklist.
- A draft PR cycle-start policy.
- A WARP design template.
- A legacy design allowlist for pre-format design docs.
- A deterministic Method design check script.
- CI and pre-push hook wiring.
- Process docs that state GitHub Issues are live tracker and repo docs are
  evidence ledger.

## Non-Goals

This cycle does not include:

- Migrating every historical design doc to `warp-design-v1`.
- Retiring legacy filesystem backlog cards; issue #72 tracks that work.
- Validating live GitHub Issue labels from CI through the GitHub API.
- Replacing human review with static checks.
- Treating draft PRs as reviewable or complete work.

## Agent-First Surface

The first agent-facing surface is `npm run check:method`. It deterministically
checks local files without network access and reports missing templates,
missing frontmatter, missing headings, weak proof tags, and missing full-SHA
Current Truth permalinks.

## Runtime / API / Protocol Contract

The software contract is the `scripts/check-method-designs.mjs` command and the
`check:method` npm script. The command exits `0` with a pass message when the
repo satisfies the process contract and exits nonzero with bullet failures when
it does not.

## Evidence / Authority / Mutation Boundary

This is process/tooling enforcement only. It does not issue authority, perform
admission, mutate hosts, create strands, or inspect live app runtime state. It
does mutate repository files by adding templates, docs, and CI wiring.

## Posture Matrix

Not applicable. This cycle does not report runtime, adapter, admission,
witness, receipt, or reading posture. Its pass/fail posture is the process
check exit code.

## Host / Target Applicability

The target is the WARP TTD repository. `jedit`, `graft`, and fixtures are not
runtime targets for this process gate.

## Data / State Model

Source of truth:

| Data | Source |
| :--- | :--- |
| Live work | GitHub Issues and labels |
| Design evidence | `docs/design/**` |
| New design format | `docs/templates/design-cycle.md` |
| Legacy exemption | `docs/templates/legacy-design-docs.txt` |
| Enforcement result | `npm run check:method` exit code |

Invalid states include new design docs not on the legacy list and missing
`warp-design-v1` frontmatter, missing required headings, or
`behavior-required` designs without a non-doc proof tag.

## Protocol / Generated Family Placement

Not applicable. This process gate does not change WARP protocol, Wesley
generated artifacts, Echo-published families, or adapter residue.

## User Experience / Product Shape

Human contributors see GitHub issue forms, the PR checklist, the draft PR
coordination fields, and CI failures when the process contract is missing.
There is no rendered WARP TTD product UI change in this cycle.

## Accessibility Posture

The GitHub forms and PR template are plain markdown/YAML surfaces. The check
script emits plain text bullet failures suitable for terminal reading and
automation logs.

## Localization / Directionality Posture

No runtime UI strings are added. GitHub template prose and CLI failure text are
English-only maintainer process copy.

## Agent Inspectability / Explainability Posture

Agents can run `npm run check:method` and inspect deterministic stdout/stderr.
New designs must name their agent-facing surface and proof tags, giving agents
stable sections to parse before implementation starts.

## Security / Redaction / Consent Posture

Not applicable. The cycle does not collect secrets, export replay data, or
inspect live target payloads.

## Determinism Contract

The check is filesystem-only and sorted before comparison. It does not depend
on network access, GitHub API state, wall clock time, or local user identity.

## Compatibility / Migration Contract

Historical design docs remain valid through `docs/templates/legacy-design-docs.txt`.
Future design docs not on that list must use `warp-design-v1`. The old backlog
files remain in place until issue #72 retires or stubs them.

## Linked Invariants

- Agent-native / agent-first.
- Tests are the executable spec.
- GitHub Issues are the live tracker.
- Repo docs are the evidence ledger.
- Design docs are not implementation proof.
- No inferred authority.

## Design Alternatives Considered

### Option A: CI-only policy prose

Pros:

- Minimal repo change.
- Easy to explain.

Cons:

- Does not fail weak designs.
- Easy for agents to miss.

### Option B: Git hooks as authority

Pros:

- Fast local feedback.

Cons:

- Hooks are easy to bypass.
- CI would still accept bad process state.

### Option C: Layered gate

Pros:

- CI is authoritative.
- Hooks reuse the same command for fast feedback.
- Historical docs remain stable while new docs are enforced.

Cons:

- Requires a legacy allowlist until old docs are migrated.

## Decision

Use Option C. The repo gets templates, a deterministic check command, CI
wiring, and hook wiring. The legacy allowlist is temporary evidence; future
cycles should remove entries as historical docs are migrated or retired.

## Implementation Slices

- Add GitHub issue forms, PR template, WARP design template, draft PR cycle-start
  policy, and legacy allowlist.
- Add `scripts/check-method-designs.mjs` and `npm run check:method`.
- Add test coverage for the check command and wire CI/pre-push.
- Update process docs to name GitHub Issues as live tracker and docs as
  evidence ledger.

## Tests To Write First

- [ ] [tooling] `npm run check:method` fails if a new design doc omits
      `warp-design-v1` frontmatter, required headings, or behavior proof tags.
- [ ] [tooling] `npm run check:method` passes for this repository state after
      templates, allowlist, and this design doc are present.
- [ ] [docs] Process docs state GitHub Issues are the live tracker and repo docs
      are the evidence ledger.

## Acceptance Criteria

The work is done when:

- [ ] `npm run check:method` passes.
- [ ] `npm test` includes the Method design format gate.
- [ ] CI runs `npm run check:method`.
- [ ] The pre-push hook runs `npm run check:method`.
- [ ] New design docs not on the legacy list must use `warp-design-v1`.
- [ ] `behavior-required` designs must include at least one non-doc proof tag.
- [ ] Cycle-start doctrine allows draft PRs only after the initial issue/design
      commit and requires conversion to ready-for-review before final review.
- [ ] Issue #73 and this design doc are linked.

## Validation Plan

Commands expected before PR:

```sh
npm run check:method
npm test
npx tsc --noEmit
npm run lint
npm run lint:check
```

## Playback / Witness

Reviewers can run `npm run check:method` to reproduce the process gate and
`npm test` to verify the gate is part of the normal test suite.

## Manual / Operator Contract

No Manual chapter is required. This cycle changes repo work doctrine and
templates, so `METHOD.md`, `docs/method/process.md`, and PR/issue templates are
the operator contract.

## Risks

Known risks:

- The legacy allowlist can become a loophole if new entries are added casually.
- Static checks cannot prove design quality by themselves.

Mitigations:

- The allowlist says not to add new entries.
- PR review remains responsible for judging semantic quality.
- The fake-proof gate rejects docs-only proof for `behavior-required` designs.

## Follow-On Issues

- https://github.com/flyingrobots/warp-ttd/issues/72

## Closeout Links

- PR:
- Retro:
- Witness:

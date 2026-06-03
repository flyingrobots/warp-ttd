---
format: "warp-design-v1"
title: "<Short Title>"
cycle: "<issue-number>-<title-slug>"
legend: "PROTO|DELIVERY|CV|VIZ|PROCESS"
issue: "https://github.com/flyingrobots/warp-ttd/issues/<number>"
status: "draft|active|landed|superseded|abandoned"
base_commit: "<full SHA used for Current Truth>"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
proof_policy: "behavior-required|docs-only|process-only"
agent_surfaces:
  - "cli-json"
human_surfaces:
  - "tui"
targets:
  - "jedit"
manual: "required|not-applicable|updated"
---

# <Short Title>

## Linked Issue

- https://github.com/flyingrobots/warp-ttd/issues/<number>

## Decision Summary

One short paragraph describing the decision this document makes. Say what will
exist, what it will do, and what boundary it owns.

## Sponsored Human

A <type of operator> wants <capability/outcome> so that <reason>, without
having to <current pain or unsafe workaround>.

## Sponsored Agent

An agent needs <inspectable contract/tool/surface> so it can <operation>,
without inferring <unstable/private/visual-only state>.

## Hill

By the end of this cycle, <human/agent> can <observable outcome> through
<surface/API/command>, and the repo proves it with <tests/witnesses>.

## Current Truth

Describe what exists today. Cite evidence with stable file, command, issue,
PR, or fully qualified commit links.

Required evidence style:

```markdown
[<repo-relative-path>#<line-number>:<full-sha>](https://github.com/flyingrobots/warp-ttd/blob/<full-sha>/<repo-relative-path>#L<line-number>)
```

## Problem

State the actual problem in concrete terms.

## Scope

This cycle includes:

- 

## Non-Goals

This cycle does not include:

- 

## Agent-First Surface

Name the first structured surface. Prefer MCP tools, CLI `--json` / JSONL,
read models, schemas, generated artifacts, or deterministic fixtures before
TUI/browser rendering.

## Agent Interface

List the concrete agent-facing interfaces this cycle creates, changes, or
depends on. Include command names, MCP tool names, JSON/JSONL envelopes,
schemas, exported types, stable ids, and machine-readable errors.

If the cycle is docs-only, list the future agent interfaces the design is
standardizing and say no runtime interface changes in this cycle.

## Agent DX

Describe the agent development experience. Explain the expected agent workflow,
what an agent can discover without guessing, how failures are reported, how to
retry or narrow the operation, and what proof an agent should collect.

## Runtime / API / Protocol Contract

Name the software contract: exported functions/types, command output, schema
input/output, facts emitted, state transitions, error behavior, or compatibility
aliases.

## Evidence / Authority / Mutation Boundary

State what WARP TTD may inspect, what it must not infer, and whether mutation,
authority issuance, grant construction, runtime admission, or host writes are
in scope.

## Posture Matrix

If runtime facts are reported, list `PRESENT`, `ABSENT`, `UNAVAILABLE`,
`UNSUPPORTED`, `OBSTRUCTED`, `LOCAL_MIRROR_FALLBACK`, translated substrate, and
native witness behavior. Otherwise state "Not applicable" and explain why.

## Host / Target Applicability

State behavior for relevant targets such as `jedit`, `graft`, fixtures, or
missing hosts. Otherwise state "Not applicable" and explain why.

## Data / State Model

Describe source of truth, derived state, invalid states, reset behavior,
serialization, and deterministic runtime assumptions. Otherwise state "Not
applicable" and explain why.

## Protocol / Generated Family Placement

State whether facts belong in debugger-local wrappers, authored protocol,
Wesley-generated shared-family artifacts, Echo-published payloads, or adapter
residue. Otherwise state "Not applicable" and explain why.

## User Experience / Product Shape

Describe what a human sees or does. Include UI flows or mockups only when the
cycle changes a rendered surface. If the task has TUI, browser, visual, or other
rendered UX implications, include the relevant Bijou-style product detail:
user journey, lower modes, wide/narrow mockups, accessibility, localization,
directionality, and interaction states. Otherwise state "Not applicable" and
explain why.

## Accessibility Posture

State semantic labels or facts, focus ownership, hidden/visual-only information,
keyboard behavior, and redaction behavior. Otherwise state "Not applicable" and
explain why.

## Localization / Directionality Posture

State visible strings, catalog keys, locales, directionality assumptions, and
wrapping behavior. Otherwise state "Not applicable" and explain why.

## Agent Inspectability / Explainability Posture

Describe stable ids, metadata fields, emitted facts, deterministic pipe output,
registry entries, schema descriptions, command ids, or machine-readable witness
output.

## Security / Redaction / Consent Posture

State secret, sensitive data, replay export, consent, or redaction behavior.
Otherwise state "Not applicable" and explain why.

## Determinism Contract

Name clocks, ordering, fixture inputs, content-addressed refs, and what makes
the proof reproducible. Otherwise state "Not applicable" and explain why.

## Compatibility / Migration Contract

State CLI JSON, MCP, schema, fixture, docs-path, or generated-artifact migration
behavior. Otherwise state "Not applicable" and explain why.

## Linked Invariants

- Agent-native / agent-first
- Tests are the executable spec
- Evidence posture is explicit
- No inferred authority

## Design Alternatives Considered

### Option A: <name>

Pros:

- 

Cons:

- 

### Option B: <name>

Pros:

- 

Cons:

- 

## Decision

State the chosen option and why. If temporary, name the expiration or migration
window.

## Implementation Slices

- Sync to the merge target, branch from the issue title slug, write this design
  doc, commit, push, open a normal PR, and apply `work-in-progress` to the issue.
- <Smallest testable slice>
- <Next slice>

## Tests To Write First

Use proof tags. Implementation cycles with `proof_policy: "behavior-required"`
must include at least one non-doc proof tag.

- [ ] [behavior] <test that exercises real behavior>
- [ ] [docs] <evidence-ledger assertion, if relevant>

Accepted non-doc tags include `[behavior]`, `[runtime]`, `[api]`,
`[cli-json]`, `[mcp]`, `[schema]`, `[integration]`, `[render]`,
`[accessibility]`, and `[tooling]`.

## Acceptance Criteria

The work is done when:

- [ ] Behavior/runtime/tooling proof is green when required.
- [ ] Documentation/process assertions are not the only proof for implementation
      work.
- [ ] Issue and PR are linked.
- [ ] CI and local validation are green.

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

Describe what a reviewer can run or inspect. Include commands, fixtures,
target root setup, route, key sequence, or terminal size when relevant.

## Manual / Operator Contract

State whether this cycle adds or updates `MANUAL.md` and why.

## Risks

Known risks:

- 

Mitigations:

- 

## Follow-On Issues

- 

## Closeout Links

- PR:
- Ready-for-review evidence:
- Retro:
- Witness:

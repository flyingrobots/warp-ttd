# WARP TTD Topic Documentation Standard — Editor’s Edition

## Purpose

`docs/topics/` is the living contract graph for landed WARP TTD behavior.

A topic shelf must help a reader do four jobs:

1. **Orient** — understand what the topic owns, why it exists, and where its boundaries are.
2. **Operate** — use or diagnose the behavior without reverse-engineering the implementation.
3. **Change** — find the safe edit path, affected contracts, and required verification.
4. **Verify** — trace normative claims to executable evidence.

A shelf is successful when a capable newcomer or agent can complete those jobs without guessing. A shelf is not successful merely because it follows a template.

## Sources of truth

Different artifacts own different kinds of truth:

| Question | Canonical source |
|---|---|
| What does the system execute? | Source code and generated artifacts |
| What behavior is enforced? | Tests, schemas, fixtures, and contract checks |
| What is the supported contract at HEAD? | Topic shelf README and evidence map |
| Why was this design chosen? | `rationale.md` or an accepted design record |
| How is the implementation structured? | `architecture.md` and source code |
| What work is currently planned or active? | GitHub Issues and Milestones |

Do not manually copy volatile facts—open issues, recent pull requests, generated API inventories, timestamps, reverse dependencies, or test results—into prose when they can be linked or generated.

## When a shelf is required

Create or update a shelf for a nontrivial change to observable behavior, a public or agent-facing surface, a protocol or schema, a workflow contract, a failure posture, or a release-critical validation rule.

Do not require a shelf edit for formatting, dependency-only maintenance with no observable effect, typo fixes, or internal refactors that preserve the documented contract and executable evidence.

Before implementation, identify the owning shelf and affected neighboring shelves. The documentation and evidence must be current before merge, not necessarily before the first exploratory edit.

## Shelf package

Each indexed topic has a directory containing:

```text
docs/topics/<topic>/
  topic.yaml          # canonical machine metadata
  README.md           # concise orientation and operational contract
  test-plan.md        # requirement-to-evidence map
  architecture.md     # optional structural and data-flow depth
  rationale.md        # optional tradeoffs and rejected alternatives
  examples/           # optional executable or copy/paste examples
```

During migration, validated README frontmatter may stand in for `topic.yaml`. Once `topic.yaml` exists, it is canonical and registry metadata is generated from it.

## Documentation profiles

Every shelf declares one documentation profile. Risk changes the required depth; it must not be decorative metadata.

| Profile | Use for | Required content |
|---|---|---|
| `reference` | Small, stable projections or lookup surfaces | At-a-glance contract, ownership, dependencies, evidence map |
| `behavior` | Stateful behavior, workflows, and operator-facing features | Reference requirements plus safe-change path, principal failure modes, impact notes |
| `contract` | Protocols, schemas, compatibility boundaries, security/release-critical behavior | Behavior requirements plus architecture, migration semantics, compatibility policy, exhaustive changed-contract evidence, owner approval |

`architecture.md` and `rationale.md` are required for `contract` profiles and high-risk topics. For `behavior` and `reference`, they stay optional and should appear when they materially improve navigability (for example, when a reader repeatedly asks for mechanism details or cross-module impact boundaries).

`risk_level: low|medium|high` controls review strictness and verification scope. `documentation_maturity: draft|current|verified` describes documentation quality independently of runtime lifecycle.

## Canonical topic metadata

`topic.yaml` contains only durable, machine-useful fields:

```yaml
schema_version: 1
id: adapter-port-and-registry
title: Adapter Port and Registry
family: adapter
profile: behavior
risk_level: medium
lifecycle: active
documentation_maturity: current
owners:
  - id: james
owns:
  - src/app/adapterRegistry.ts
  - test/adapterRegistry*.spec.ts
depends_on:
  - protocol-contract
entrypoints:
  onboarding: README.md#entry-onboarding
  edit: README.md#entry-edit
  triage: README.md#entry-triage
  impact: README.md#entry-impact
test_plan: test-plan.md
```

Rules:

- Topic IDs, paths, owner IDs, and dependency IDs must resolve.
- `used_by` is derived from `depends_on`; do not author both directions.
- Registry counts, family maps, and reverse edges are generated.
- Entry-point anchors are explicit, stable IDs, not implicit renderer-generated slugs.
- Dates such as `date_last_updated`, copied verification timestamps, and review-due arithmetic are generated or tracked outside prose.

## README responsibility

The README is the smallest useful doorway into the topic. It is not the architecture dump, changelog, issue tracker, or complete code inventory.

### Required sections

Use these stable entry points; headings beneath them may be adapted to the topic.

```markdown
<a id="entry-onboarding"></a>
## At a glance

<a id="entry-edit"></a>
## Safe change path

<a id="entry-triage"></a>
## Failure modes

<a id="entry-impact"></a>
## Dependencies and impact

## Evidence
```

A `reference` shelf may omit `entry-triage` or `entry-impact` when those jobs genuinely do not exist. Its manifest must omit the corresponding entry point.

### At a glance

The opening section must be a compact table so a reader can answer, in plain language:

```markdown
| Question | Answer |
|---|---|
| What this topic owns | ... |
| What it does not own | ... |
| How it works | ... |
| Why this matters | ... |
| First prerequisite | ... |
| What changes propagate | ... |
```

The section should be short and deterministic:

- include a concrete mechanism sentence in `How it works`;
- include a concrete boundary statement in `What it does not own`;
- include at least one explicit prerequisite in `First prerequisite`;
- include the cross-shelf consequence in `What changes propagate`.

Prefer a concrete example over an analogy. An analogy is useful only when it reduces explanation rather than decorating it.

### Safe change path

For `behavior` and `contract` shelves, provide:

- the normal edit sequence;
- the highest-risk compatibility boundary;
- one focused verification command that gives fast feedback;
- the full verification command or CI job required before merge;
- links to the relevant requirement rows in `test-plan.md`.

Do not block documentation or evidence-repair edits because evidence is incomplete. Missing evidence blocks the associated behavior change, not the act of fixing the documentation system.

### Failure modes

Document principal, actionable failure modes—not every theoretically possible exception.

Use a compact table:

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|

A failure-propagation diagram is optional. Include one only when the path itself is difficult to infer from the table and prose.

### Dependencies and impact

Use a compact table to keep boundary navigation explicit:

```markdown
| Edge | Details |
|---|---|
| Depends on | upstream shelves or files that provide inputs used by this topic |
| Used by | direct consumers that rely on this topic’s behavior |
| Cross-shelf impact | what contract changes here can break or invalidate |
```

Explain only relationships that change how a reader edits, diagnoses, or releases the topic. Include only durable, actionable impact language.

Do not duplicate the full dependency graph in prose. The registry owns graph enumeration.

### Evidence

README prose may cite stable requirement IDs such as `[R-AR-2]` for normative claims. Avoid hand-maintained citation IDs for routine explanatory prose.

Source anchors should use stable paths and symbols or exact test names, for example:

```text
src/app/adapterRegistry.ts#resolveAdapter
test/adapterRegistry.spec.ts::rejects unknown adapter kinds
```

Line numbers and Git SHAs may be emitted in generated audit reports. They are not manually maintained as the primary citation mechanism because they become stale under harmless edits.

## `test-plan.md` responsibility

`test-plan.md` is an executable proof map, not a list of nearby test files.

Its primary artifact is this table:

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-AR-1 | Registry resolves each supported adapter kind deterministically. | `test/adapterRegistry.spec.ts::resolves supported kinds` | supported-kind table | exact adapter class and default head for every row | covered |

Rules:

1. Requirement IDs are stable and unique within the topic.
2. Every changed normative behavior maps to at least one requirement row.
3. Evidence identifies a concrete test case, schema check, fixture assertion, or executable contract check—not merely a directory or broad test file when a narrower anchor exists.
4. An oracle names an observable value, transition, error class, ordering rule, or invariant. “Stable,” “correct,” and “deterministic” are not sufficient by themselves.
5. One test may support multiple requirements, but each mapping must explain which assertion is relevant.
6. Planned work is not evidence. A planned row requires an owner, issue, trigger condition, and target milestone; otherwise remove it.
7. Requirements with no executable evidence are marked `gap` and prevent the affected behavior from being called verified.

## Diagrams, tables, and examples

Visuals are tools, not ceremony.

- A diagram is optional unless spatial, temporal, or relational structure is materially harder to understand in prose.
- Every diagram must answer one stated reader question and have a one-sentence takeaway.
- Mermaid must parse.
- The README should normally contain no more than three diagrams. Detailed class, ER, and multi-branch diagrams belong in `architecture.md`.
- A diagram with more than roughly twelve nodes or twelve edges should be simplified, split, generated, or moved out of the README.
- Do not require a prose tour of every arrow or class. Explain only transitions and entities that carry contract meaning.
- Prefer executable examples and exact input/output pairs over decorative diagrams.
- Do not add captions to trivial tables merely to satisfy a rule; add context when the table’s purpose is not obvious.

## Glossaries and terminology

Use the project glossary for shared vocabulary. Add a local glossary only for topic-specific terms that a reader cannot reasonably infer or find centrally.

Define a term at first use when that is faster than sending the reader to an appendix.

## Registry and agent entry points

`docs/topics/README.md` is a generated discovery surface built from topic manifests.

It must provide:

- a unique list of active shelves;
- family grouping;
- validated dependency edges;
- documentation maturity and lifecycle;
- stable task entry points for onboarding, edit, triage, and impact where applicable.

Agent entry points are navigation routes, not authority grants and not a reason for an agent to refuse safe documentation repair. Before a behavior edit, tooling checks the relevant requirement/evidence rows. When the check fails, it reports the missing proof and blocks that behavior change while permitting evidence remediation.

## Maintenance rules

- Update behavior, tests, and the owning shelf in the same pull request when contract truth changes.
- Keep the README concise; move structural depth to `architecture.md` and tradeoffs to `rationale.md`.
- Link to live issue queries instead of copying issue lists.
- Preserve decision links only when they explain a non-obvious contract or tradeoff.
- Deprecate or retire shelves explicitly; do not leave apparently current documents for removed behavior.
- A shelf becomes `verified` only after its manifest, links, evidence map, and task-based review pass.
- Standard changes use a versioned migration. Touched shelves must not be forced through unrelated mass rewrites merely because the prose template changed.

## Verification model

Machines should hard-gate facts they can determine reliably. They should not pretend to grade prose taste.

### Command surface

Use a fixed verification surface split by signal type:

```text
docs:check
  - manifests
  - required files by profile
  - links and explicit entry anchors
  - generated registry cleanliness
  - dependency graph policy
  - markdown and mermaid syntax

docs:evidence
  - stable requirement IDs
  - changed behavior mapped to requirements
  - exact evidence anchors
  - fixtures and measurable oracles
  - planned-gap governance

docs:impact
  - changed source paths -> owning shelves
  - changed contracts -> dependent shelves
  - missing docs/evidence update
  - explicit docs-impact:none rationale

docs:eval
  - task-based onboarding/edit/triage/reference evaluations
  - retrieval precision and duplication signals
  - advisory readability/readability-risk checks
```

`docs:check`, `docs:evidence`, and relevant parts of `docs:impact` are blocking by default.
`docs:eval` is advisory unless a project profile explicitly promotes selected checks.

### Verifier strictness configuration

Pass/fail strictness is also configurable via:

```text
.docs-verify.config.json
```

Example:

```json
{
  "no_warnings": false
}
```

Rules:

- `no_warnings: true` forces `docs:eval` warnings to be treated as blocking
  violations.
- `no_warnings: false` keeps `docs:eval` advisory.
- The command-line flag `--no-warnings` overrides the config file value for that
  run.

### Blocking checks

Blocking checks are deterministic:

- topic manifest schema and unique IDs;
- required files for the declared profile;
- explicit entry-point anchors and internal links;
- registry generation with no uncommitted drift;
- dependency validity and cycle policy;
- requirement/evidence completeness for changed behavior;
- referenced test files, test names, source files, and symbols exist;
- Mermaid syntax;
- generated documentation artifacts are current;
- no new violations relative to the repository baseline for unchanged shelves;
- all touched `current` or `verified` shelves satisfy their declared profile.

### Advisory checks

These create review comments or reports, not automatic merge blocks unless a project explicitly promotes a rule:

- README length and duplication;
- diagram size and density;
- readability heuristics;
- missing examples;
- review age;
- external-link health;
- possible stale claims after nearby source changes.

## Preflight and migration gates

Preflight rules are policy-first but do not deadlock documentation repair:

- Establish impact and baseline before behavior merge gates run.
- Block contract-bearing behavior edits that lack evidence updates.
- Always permit documentation, manifest, and evidence remediation work.
- Treat missing optional local tooling as warnings with reproducible install commands.
- Treat missing required toolchain in hermetic CI as hard failures.

Use baseline-delta enforcement:

- no new failures may be introduced;
- shelves touched directly or by impact must satisfy their declared profile;
- unrelated legacy defects remain visible in full-corpus reports but do not block unrelated PRs;
- a separate migration plan burns down baseline defects over time.

### Human or agent editorial review

A reviewer performs task-based acceptance rather than template inspection:

1. Can a newcomer explain the topic’s ownership and boundary after the opening section?
2. Can they find the focused verification command and correct source area without guessing?
3. Can they classify one representative failure and identify a first response?
4. Can they trace a normative claim to a concrete oracle?
5. Can an agent retrieve only the relevant section without loading the entire shelf?
6. Is any section present only because the template demanded it? If so, delete or move it.

## Gate placement

Use different gates for different costs:

| Stage | Scope | Purpose |
|---|---|---|
| Pre-commit | staged/changed files; fast schema, links, formatting | immediate feedback |
| Pull-request CI | changed shelves plus computed impact set | authoritative merge gate |
| Nightly | full corpus, external links, staleness, retrieval evaluations | debt discovery |
| Release | high-risk and contract profiles | compatibility assurance |

CI is authoritative. Git hooks are convenience, not governance, because hooks can be absent or bypassed.

Legacy debt uses a baseline-delta model: do not introduce new failures, and require touched shelves to meet their declared profile. Existing unrelated defects remain visible in the full report without blocking every improvement.

A missing local optional tool should produce an actionable warning and a reproducible command. A missing tool in hermetic CI is a hard failure. Tool output grammar and exit-code details belong in the verifier’s own contract tests, not in this authoring standard.

## Change-impact gate

The documentation tool computes affected shelves from manifest `owns` patterns, dependencies, public exports, schema ownership, and changed requirement IDs.

A pull request that changes contract-bearing code must do one of the following:

- update the owning shelf and evidence map;
- show that existing requirements and evidence still cover the change; or
- declare `docs-impact: none` with a brief rationale, subject to owner review for medium- and high-risk topics.

The impact gate should report likely affected shelves. It should not force shotgun edits to every downstream document when no contract claim changed.

## Definition of done

A topic shelf is `current` when:

- its manifest and registry entry are valid;
- the README supports the applicable reader jobs;
- changed contract claims map to executable evidence;
- focused and required verification commands are accurate;
- principal failure modes are actionable;
- dependencies and entry points resolve;
- no copied volatile status data is presented as current truth.

A topic shelf is `verified` when it also passes a task-based editorial review and the full-corpus verifier.

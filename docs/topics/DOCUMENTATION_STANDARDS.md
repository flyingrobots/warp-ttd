# WARP TTD Topic Documentation Standards

## Scope

This document defines the required format, quality bar, and maintenance model for `docs/topics/` shelves. It is the canonical guide for topic shelf `README.md`, `test-plan.md`, and map maintenance.

## Mandatory shelf quality

1. Before implementing nontrivial behavior, identify the owning shelf in `docs/topics`.
2. If no shelf exists, create it before changing behavior where possible.
3. Every topic shelf `README.md` must be usable by a reader with no project context.
4. Every shelf must have `test-plan.md` with executable evidence before land.
5. Keep `docs/topics/README.md` as the navigation map and update it for every new or removed shelf.
6. Preserve an explicit evidence map from claims to tests/fixtures/oracles in `test-plan.md`.

## Required topic README format

Topic shelf READMEs are authoritative onboarding and contract artifacts and must follow one consistent format.

1. YAML frontmatter is required at the top of each file and must include at least:
   - `title` (human-readable document title)
   - `topic` (canonical slug)
   - `topics` (taxonomy list for discovery/search)
   - `date_created`
   - `date_last_updated`
   - `status_last_reviewed`
   - `author`
   - `code_owners` as a non-empty list of canonical owners (`Name <email>`)
   - `status`
   - `schema_version`
   - `risk_level` (`low|medium|high`)
   - `change_impact` (for contract edits, use explicit compatibility language)
   - `depends_on` (upstream dependencies)
   - `used_by` (downstream dependencies)
   - `verification` (commands + last run notes)
   - `review_interval_days`
   - `test_plan` (typically `test-plan.md`)
   - optional: `supersedes`, `superseded_by`, `review_due`
2. Frontmatter is machine-readable metadata; rationale is prose, not embedded YAML.
3. The file must begin with `## Overview` as the opening prose section.
4. Overview must include:
   - `### Code owners` with contacts and escalation expectation.
   - `### Related topics` with a table and a relation column explaining how each topic connects.
   - a compact related-topics mind-map when relationship direction is useful.
5. Include `## Reader pathways` (or equivalent) near the top that answers:
   - how to make a contract edit,
   - how to triage a protocol failure,
   - how to review cross-shelf consequences.
   - the edit pathway must include a one-minute verification command snippet (copy/paste) that the next contributor can run before touching behavior.
6. Include a dedicated glossary appendix after citations.
7. Include a plain-language **mental model paragraph** in `## Overview` that maps the topic to a familiar engineering concept before introducing topic-specific vocabulary.
8. Use prose-first progression (orientation, motivation, examples, mechanics, edge behavior).
   - Prefer prose over bullet-heavy narrative.
   - Introduce new terminology in **bold** on first occurrence.
   - Avoid philosophy-first exposition in README; move that to `rationale.md`.
   - If this is the first topic visited by a reader, the first paragraph must establish the intuitive picture and observable contract consequence.
   - Split explanation from operations when a section becomes primarily explanatory.
9. Citation style in prose must be clustered: use one bracketed cluster per claim cluster (for example `[C01, C02, C03]`).
   - Never emit adjacent citation clusters (for example `[C01][C02]`).
   - Never duplicate an ID inside one cluster.
10. Use `##`, `###`, and `####` only in this file structure:
   - `#` — document title only.
   - `##` — section markers.
   - `###` — subsection markers.
   - `####` — sub-subsection markers.
   - Exactly one `#` heading must exist, and it is the title.
11. Diagrams and examples are required when a new concept, mechanism, state transition, or data model is introduced.
   - Use flowchart, sequence, class, ER, or state-machine diagrams as appropriate.
   - Prefer `flowchart TD` as default. Use `flowchart LR` only when lateral causality is central to correctness and explicitly note the reason in the diagram caption.
   - Apply progressive visual disclosure:
     - The first diagram in every topic README MUST be a macro-level diagram with fewer than 5 non-leaf nodes and only primary input/output boundaries.
     - Deep-dive class and ER diagrams must be introduced only inside the subsection that requires their detail and must reference the macro-level diagram as prior context.
     - Caption the first diagram as an onboarding simplification.
   - Place each diagram adjacent to the explanatory prose.
   - Every diagram/table/inline structure must have a one-line caption.
   - Every flow chart and lifecycle chart must be walked in prose stage-by-stage.
   - State machines must explain each state and include golden/non-golden walkthroughs.
   - Class diagrams must explain each class in narrative before moving to the next claim.
   - Class diagrams must not include empty boxes for any first-party class. External-only value objects may remain compact but should be explicitly labeled with ownership notes.
   - For large diagrams, define a refinement layer:
     - if a diagram contains 10+ classes/nodes or spans multiple behavioral seams, add a compact dictionary immediately after the diagram block.
     - for class diagrams, include one explanatory paragraph per class family (for example: root/control, session payload, neighborhood-derived payload, transport shape, adapter/protocol boundary).
     - if the diagram includes fallback or absent branches, add an explicit fallback interpretation paragraph.
     - if a diagram has >15 edges, include a "reader checkpoint" paragraph that states what can be trusted if one edge breaks.
    - ER diagrams must include:
      - the question the diagram answers,
      - entity metadata (purpose, invariant, owning source),
      - relationship metadata (direction, intent, cardinality, failure signal),
      - and a short diagnostic interpretation.
   - No diagram block should be introduced without an explicit "how to read it" paragraph or subsection.
   - No flow/state/class/ER diagram should end a subsection unless the text immediately after includes:
     - expected reader action,
     - interpretation sentence tied to implementation behavior,
     - and the next logical artifact the reader should inspect.
   - Any undocumented edge/entity becomes a TODO with owner and backlog item.
   - For every diagram, include:
     1. why this diagram exists,
     2. the exact reader question it answers,
     3. a step-by-step interpretation of node/arrow/state transitions.
   - Run a Mermaid parse sweep after each README update and before PR handoff. Any parse failure must be fixed in the same slice.

### Large-diagram refinement pattern (new)

A large diagram is any diagram with one or more of the following: 10+ nodes/classes, 10+ edges, multiple optional branches, or mixed object-model + transport-models.

Large-diagram documentation must include all of the following in order:

1. one-line diagram caption
2. standard explanation block (intent, reading pass, takeaway, cross-check)
3. class/entity dictionary table (at minimum one row per first-party class/entity in the diagram)
4. per-family explanatory prose, not merely per-class bulleting
5. an explicit checkpoint statement for partial failures (what can and cannot be trusted)
6. an explicit next-read anchor to prevent cognitive dead-end

The dictionary table must include:

- class/entity name
- ownership (session boundary, adapter boundary, derived artifact, or serialized form)
- one contract-level invariants statement
- one direct cross-check anchor

### Diagram explanation minimum

Every non-trivial diagram requires an associated explanation block with this shape:

- **Diagram intent** — one sentence describing what question the diagram answers.
- **Reading pass** — staged walkthrough in prose or list with transition-by-transition interpretation.
- **Operational takeaway** — one sentence tying the diagram to practical behavior or failure handling.
- **Cross-check anchor** — one target file/function the reader should inspect next.

A diagram block without this minimum is incomplete even if syntax is valid.

### Citation ledger format (required)

Evidence appendices in topic READMEs must be four-column tables with exact headers and no merged provenance fields.

- Citation ID
- Source File
- Line
- Git SHA

Any citation entry missing one column is invalid and must be fixed before handoff. Do not combine provenance fields into a single string.

Example valid ledger row: `| C01 | src/app/debuggerSession.ts | 150 | c0b4f9... |`

12. Each section should answer a practical reader question and remain action-oriented.
    - Keep transitions between sections short and clear.
    - New section: use for changes in responsibility, stakeholder, risk boundary, or unresolved reader question.
    - New subsection: use for supporting arguments, proofs, operational interpretations, or failure branches under one thesis.
    - Avoid single-idea subsections; merge them into parent prose.

## Mermaid parse sweep

Documentation changes containing Mermaid blocks must pass a parse validation pass before merge.

1. Collect all `mermaid` fences in changed files.
2. Run a two-pass parse validation loop:
   - Pass 1: validate only the first diagram in `## Overview` for onboarding simplicity and parse correctness.
   - Pass 2: validate every remaining diagram in the file.
3. Locally run the passes with:
   - `npm run docs:verify:onboarding`
   - `npm run docs:verify:deep`
4. If any parse error exists in either pass, fix the diagram, then rerun step 2.
5. Continue Steps 2 → 4 as a loop until zero parse errors are returned.
6. Enforce macro constraints in Pass 1: single root for mindmaps, no Mermaid syntax warnings, and node budget under 5 for the first macro diagram.
7. If errors persist after an edit cycle with no syntax-change progress, pause the slice, document the blocker, and escalate with the specific failing diagram and source line.
8. Record the final pass result in the relevant shelf activity notes when documentation edits are complete.

## Output and CI integration for cognitive-load gates

The Mermaid parse and cognitive-load sweep must run as an isolated stage (`npm run docs:verify`) to avoid masking documentation failures behind compiler or linter output.

### 1. Error namespace and line format

All verification output must use the `DOC-LOAD` namespace with this exact line grammar:

`DOC-LOAD[PASS-<1|2>][<KIND>] <file>:<line>:<col> code=<RULE_ID> parser=<mmdc|token-extract> desc="<short sentence>" remediation="<action>"`

Where `<KIND>` is `SYNTAX` or `STRUCTURE`.

Examples:

`DOC-LOAD[PASS-1][STRUCTURE] docs/topics/debugger-session-core/README.md:136:1 code=DOCL-ONBOARD-NODES parser=token-extract desc="Onboarding diagram has 8 nodes; max allowed is 5" remediation="Replace with a 5-node macro diagram and move details to section-level diagram"`

`DOC-LOAD[PASS-2][SYNTAX] docs/topics/protocol-contract/README.md:138:1 code=DOCL-MMD parser=mmdc desc="Mermaid syntax error: Expected terminal..." remediation="Fix syntax locally and run mmdc to verify"`

### 2. JSON telemetry emission

For every line emitted to stdout, the tool must also write a JSON row to `.docs-report.jsonl`:

`{"type":"DOC-LOAD", "pass":1, "kind":"STRUCTURE", "file":"...", "line":136, "code":"DOCL-ONBOARD-NODES", "parser":"token-extract", "desc":"...", "remediation":"..."}`

### 3. CI timeline and GitHub annotations

CI should execute this in two separate steps:

- `Docs: Cognitive load pass (onboarding)`
- `Docs: Mermaid deep validation (remaining diagrams)`

On each failure, also emit an Actions annotation, for example:

`::error file=docs/topics/protocol-contract/README.md,line=138,col=1,title=DOC-LOAD(PASS-1): Cognitive-load guardrail failed::[DOCL-ONBOARD-NODES] Onboarding diagram violates node/edge budget`

`::error file=docs/topics/debugger-session-core/README.md,line=120,col=1,title=DOC-LOAD(PASS-2): Mermaid parse failed::[DOCL-MMD] Mermaid parser failure`

### 4. Deterministic exit codes and summary block

`docs:verify` must exit using the fixed map:

- `0`: Pass
- `10`: Pass 1 structural or syntax violations
- `11`: Pass 2 syntax violations
- `12`: Toolchain unavailable (`mmdc` missing or unusable)

If exiting non-zero, print this exact block to stdout after all parsing:

```text
DOC-LOAD SUMMARY
failed: 2
pass-1: 1 (1 structural, 0 syntax)
pass-2: 1 (0 syntax, 1 parser)
status: BLOCKED (cognitive-load gate)
```

## Failure modes as a first-class artifact

1. Add `## Failure modes and evidence` for every contract-sensitive shelf.
2. List each recognized failure mode explicitly.
3. For each mode, include:
   - the mismatch shape,
   - detection point (test, log, gate),
   - direct runtime impact,
   - and actionable operator signal.
4. Include either a failure-propagation diagram or equivalent flow map for release-blocking behavior.
5. Close with a remediation matrix for each mode:
   - first-response actions,
   - recovery strategy,
   - verification checks.

## Required `test-plan.md` content

1. Stable requirement IDs.
2. Evidence mapping to concrete test paths.
3. Explicit fixture inventory and representation.
4. Measurable oracles and expected outputs.
5. Planned cases only when queued with owner, milestone, PR/issue target, and trigger condition.

## Shelf quality gates

1. If an indexed shelf exists without both `README.md` and `test-plan.md`, do not mark it as complete.
2. Behavior changes must update shelf docs in the same branch before merge.
3. Cross-shelf changes must update cross references and links in the registry map.

## Topic map maintenance rules

`docs/topics/README.md` is the canonical map for shelf discovery and bootstrap.

1. Keep a two-part atlas:
   - one high-level family map,
   - one map per high-level family immediately before shelf links.
2. Include one direct link to each shelf README after its family map block.
3. Keep machine-first YAML registry metadata at the top of `docs/topics/README.md` including all indexed shelves.
4. Include `agent_entry_queries` in each shelf record for deterministic bootstrap.
5. Each shelf README must start with its own topic map block before prose.
6. When shelf structure changes (add/remove/split/rename), update:
   - high-level map,
   - affected family map,
   - shelf links,
   - and shelf-level map block.
7. Keep mindmaps parse-safe with single roots and depth-compatible syntax.

## `docs/topics/README.md` bootstrap contract

1. YAML registry must be the first parser entry.
2. Registry must include:
   - `topic_graph` (or equivalent family clustering structure)
   - `shelves[]` records containing:
     - `id`, `path`, `title`, `family`,
     - `depends_on`, `used_by`, and `agent_entry_queries`.
3. `agent_entry_queries` entries must include:
   - `id` (examples: `onboarding`, `edit`, `triage`, `impact`),
   - `intent` (single-sentence purpose),
   - `anchor` (target section anchor in shelf README).
4. If shelf documents expose critical branching semantics, add state/transition pointers in shelf registry metadata.

## Agent query validation gate for executable edits

`agent_entry_queries` are required preconditions. For `id: edit`, an agent must treat the following as a hard gate before making any behavioral or documentation edits to a shelf:

1. Confirm the shelf has `test-plan.md` next to the shelf `README.md`.
2. Verify the test plan contains, at minimum:
   - at least one stable requirement ID covering each changed behavior,
   - evidence mapping entries to concrete test paths,
   - explicit fixtures list for those requirements,
   - measurable oracles with expected outputs.
3. Verify each planned behavior change in the shelf has a mapped evidence point in the same `test-plan.md`.
4. If any step fails, stop the edit workflow immediately and report:
   - exact missing item,
   - file section to add it,
   - required owner for the evidence update.
5. Repeat steps 1–4 after each scope expansion in the same session before applying additional edits.

A failed edit precondition must terminate the action (hard stop), not be logged as a warning.

To eliminate manual bypass risk, the validation gate must be executed by tooling before any generated edit output is produced. If the repo has no `agent_entry_queries` gate tool available locally or in CI, the agent must refuse the edit path and request one.

## Process updates for documentation-format changes

Any documentation-format change is a process change.

1. Update this standard document first.
2. Apply the revised format to touched shelves in the same work slice where feasible.
3. If additional shelves are impacted, create an explicit follow-up task with owners/scope before moving on.
4. Record the format-change decision in `codex-think` with rationale and rollout plan.

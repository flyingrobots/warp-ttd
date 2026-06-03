# Continuum Causal Debugger Design Thinking

Source design cycle:
[0081-continuum-causal-debugger-design-thinking](../design/0081-continuum-causal-debugger-design-thinking/continuum-causal-debugger-design-thinking.md)

## Reader Contract

WARP TTD is a Continuum causal debugger. It is not just a time-travel
controller.

The rule is:

> Perfect replay gives the investigator a stable history. Causal debugging uses
> that history to explain why, why not, what changed, what did not happen, and
> what would differ under a labeled counterfactual branch.

Actual replay is evidence. Counterfactual branches are hypotheses unless a
runtime supplies witnessed branch evidence. Inspection remains read-only unless
a future admitted-control design explicitly introduces host mutation.

## Product Shape

The debugger should feel familiar at the edge and different at the center.

Familiar affordances:

- step forward and backward
- seek to frame, tick, lane, or coordinate
- inspect frames, source, effects, deliveries, readings, and receipts
- set breakpoints and watches
- export a report

Continuum-native affordances:

- ask why a fact happened
- ask why an expected fact did not happen
- find the first sufficient cause of a symptom
- search for the first invariant failure
- stop on causal, evidence, admission, reading, effect, or absence predicates
- create a labeled counterfactual branch without mutating actual history
- compare actual and hypothetical outcomes
- cite receipts, witnesses, readings, source refs, branch assumptions, and
  redaction posture in a report

## Investigation Workspace

The human UI should compose the same facts agents inspect through CLI JSON and
MCP.

The durable workspace model has three regions:

- **Evidence Timeline**: actual replay, branch lanes, breakpoints, effects,
  receipts, admissions, readings, witnesses, and divergence points.
- **Fact Inspector**: selected coordinate, source, frame, reading, admission
  result, effect, receipt, witness, causal ancestry, and redaction posture.
- **Inquiry Workbench**: why/why-not questions, causal slices, breakpoint
  builders, counterfactual interventions, branch comparisons, and report export.

The UI may be visual. The debugger truth is structured. If an agent must scrape
pixels or prose to understand a feature, that feature is incomplete.

## Feature Families

| Family | Purpose |
| :--- | :--- |
| Target and capability discovery | Determine which Continuum-compatible target is inspectable and which causal-debugger features it supports. |
| Perfect replay | Reopen exact actual history with basis identity, schema versions, clock assumptions, and evidence posture. |
| Time navigation | Preserve familiar step, rewind, seek, run-to-coordinate, and worldline controls. |
| Causal inspection | Explain causal ancestry, first cause, why, why not, absence, and invariant failure. |
| Breakpoints and watches | Stop on time, source, data, effect, admission, reading, witness, absence, invariant, causal, and counterfactual divergence predicates. |
| Counterfactual workbench | Evaluate labeled what-if branches with explicit intervention, assumptions, runtime support posture, and divergence point. |
| Branch comparison | Compare actual against counterfactual or recorded worldline against recorded worldline. |
| Evidence ledger | Preserve receipts, witnesses, admission results, reading envelopes, source refs, redactions, and obstructions. |
| Agent playbooks | Provide deterministic MCP/CLI routines for common investigations. |
| Report export | Produce issue/PR-ready Markdown plus JSON evidence bundles. |

## Breakpoint Rule

A breakpoint is a named predicate over replayed and causal facts.

Baseline breakpoints still exist:

- temporal breakpoint
- source breakpoint
- data watchpoint

Causal debugger breakpoints extend the model:

- effect breakpoint: stop when an effect is emitted, delivered, canceled, or
  observed
- admission breakpoint: stop on admitted, staged, plural, conflict, or
  obstruction posture
- reading breakpoint: stop when an observer-relative reading changes, redacts,
  obstructs, or downgrades evidence
- witness breakpoint: stop when proof appears, disappears, conflicts, or changes
  posture
- absence breakpoint: stop when a required fact did not happen within a window
- invariant breakpoint: find the first coordinate where a predicate fails
- causal breakpoint: stop when a fact becomes causally sufficient for a symptom
- counterfactual breakpoint: stop where actual and hypothetical branches diverge

Every breakpoint hit must report replay basis, coordinate, predicate, inspected
facts, hit posture, and retry/disable/export options.

## Counterfactual Rule

Counterfactual branches must be labeled. A branch record needs:

- basis replay id
- intervention
- assumptions
- evaluator/runtime support posture
- divergence coordinate
- changed facts
- unchanged facts, when requested
- obstructed or redacted facts
- evidence that proves the comparison

The branch is not actual history. The UI and agent surfaces must make that
visible every time the branch contributes to a result.

## Agent Contract

Future agent surfaces should expose stable ids and schemas for:

- target descriptors
- debugger capability posture
- replay bases
- cursors
- evidence facts
- breakpoints
- causal queries
- counterfactual branches
- branch comparisons
- investigation reports

Long-running searches should stream deterministic JSONL or expose resumable MCP
results. Every unavailable feature needs a machine-readable reason.

## Safety Boundaries

- No app-name dispatch as feature proof.
- No host mutation through inspection.
- No authority issuance.
- No implicit `CapabilityPresentation` construction.
- No runtime admission unless a future admitted-control design says so.
- No upgrade from translated substrate evidence to native Continuum witnesshood.
- No counterfactual presented as actual history.
- No visual-only debugger truth.

## What Comes Next

The near implementation order is:

1. Vendor-neutral Continuum runtime hello (#80).
2. Runtime discovery command and local registry (#78).
3. Endpoint consent and auth posture (#79).
4. Debugger capability discovery (#82).
5. Causal query and breakpoint contract (#83).
6. Counterfactual branch workbench and worldline comparison (#84).
7. Evidence ledger and investigation report export (#85).
8. Human causal debugger workspace over agent-readable facts (#86).

Each implementation cycle should start with an agent-visible contract and a RED
test against the actual software surface.

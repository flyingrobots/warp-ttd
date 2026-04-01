# Cycle Development Process

This document describes the maintainer-owned process for planning and
executing development cycles. It applies to **roadmap cycles** —
feature work with design docs, playback questions, and retrospectives.

Bug fixes, doc improvements, and test-only changes follow a lighter
path: branch, fix, test, PR.

## Cycle Design

Every meaningful design cycle should define:

- **sponsor human** — the human perspective that keeps the debugger
  honest about actual use
- **sponsor agent** — the agent perspective that keeps the protocol
  and machine-readable contract honest about tool use
- **hill** — a clear statement of what success looks like
- **playback questions** — yes/no questions answered after
  implementation to verify the hill is met
- **non-goals** — explicit boundaries on what the cycle does not do

Before promoting a new direction, ask:

- which hill does this support?
- what user or operator trust does this improve?
- does this preserve substrate honesty?
- does this keep the protocol narrow enough to survive?

If the answer is unclear, the work belongs in the backlog, not the
roadmap.

## Development Loop

Each cycle follows the same explicit loop:

1. **Design docs** — write or revise design docs. Define the playback
   questions that will be answered after implementation.
2. **Tests as spec** — encode behavior as executable tests.
3. **Implementation** — build it.
4. **Playback** — answer every playback question from the design doc,
   from both the human and agent perspectives. Write the answers down.
   Do not proceed to the retrospective until every playback question
   has a clear yes/no answer.
5. **Retrospective** — evaluate what shipped, what worked, what didn't,
   and what was learned. The retro must include:
   - **Drift check:** compare what was built against the design doc.
     Call out any divergence — intentional or accidental.
   - **Tech/design debt:** log debt as new items in `docs/backlog/`.
   - **Cool ideas:** capture ideas and tangents in `docs/backlog/` as
     seeds, not commitments.
6. **README update** — rewrite the root README to reflect reality.
7. **Close the cycle** — update BACKLOG.md, CHANGELOG.md, and the
   cycle's backlog file status.

This loop is part of the process, not optional cleanup.

## Playback

After implementation, before the retro, run the dual playback:

1. **Agent playback** — the coding agent answers every playback
   question from the agent perspective. Written in the retro doc.
2. **Stop.** The agent prompts the human to do their playback. Do not
   proceed until the human responds.
3. **Human playback** — the user answers every playback question from
   the human perspective. Written alongside the agent playback.
4. **Gate** — both perspectives must agree the hill is met before
   proceeding to the retrospective.

Playback questions should be answerable with **yes/no**. If you cannot
get a clear yes, that is the signal.

### Playback outcomes

**Hill met** — proceed to retrospective, merge, close the cycle.

**Hill partially met** — merge what is honest. The retrospective
explains the gap (drift check). Remaining work is logged as debt in
`docs/backlog/`. The cycle closes but the hill is marked partial. No
pretending.

**Hill not met** — do not merge to main. The retrospective explains
why. Two options:

- **Re-scope:** rewrite the hill and try again within the same cycle.
- **Abandon:** close the cycle as abandoned, capture learnings, move on.

### What the repo should always be honest about

- what is planned
- what is specified
- what is actually implemented
- what was learned

## Backlog

### Structure

Backlog items live as individual Markdown files in
[`docs/backlog/`](backlog/).

Each file is a self-contained cycle proposal with:

- status (`queued`, `active`, `closed`)
- sponsor human and sponsor agent
- hill
- playback questions
- non-goals
- scope

The root [`BACKLOG.md`](../BACKLOG.md) is an index that links to
these files and shows the current sequence.

### Lifecycle

1. **Queued:** the item lives in `docs/backlog/` with `status: queued`.
2. **Active:** when a cycle begins, update the status to `active` and
   promote its design doc(s) into the cycle's `docs/cycles/` directory.
   The backlog file stays as the cycle's anchor document.
3. **Closed:** after the retrospective, update the status to `closed`.
   The backlog file remains as a historical record.

### Rules

- Do not let roadmap thinking drift into untracked chat context.
- Every cycle must have a backlog file before work begins.
- The root `BACKLOG.md` index must stay current with reality.

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

If the answer is unclear, the work belongs in the backlog, not a cycle.

## Development Loop

Each cycle follows the same explicit loop:

0. **Pull from backlog** — choose a backlog item. Move it out of its
   priority lane. This is the start of a cycle.
1. **Design** — write a design doc in `docs/design/<cycle>/`. Define
   sponsor human, sponsor agent, hill, playback questions, and
   non-goals. Playback questions inform the specs — write them now.
2. **RED — write failing tests** — playback questions become executable
   specifications. Tests are the literal spec. No documentation layer
   sits between intent and verification. Build the agent-facing surface
   first — it operates at the low level you need anyway to make the
   user-level experience work.
3. **GREEN — implement** — write code until the tests pass. Code exists
   because specs demanded it.
4. **Playback** — answer every playback question from both perspectives.
   The agent checks the agent playback questions. The human is prompted
   to check the user playback questions. Write the answers down. Do not
   proceed until every playback question has a clear yes/no answer.
5. **PR → main** — open a pull request. Review loops until merge is
   accepted.
6. **Close** — merge. Write a retrospective in
   `docs/method/retro/<cycle>/`. The retro must include:
   - **Drift check:** compare what was built against the design doc.
     Call out any divergence — intentional or accidental.
   - **Tech/design debt:** log debt in `docs/method/backlog/bad-code/`.
   - **Cool ideas:** capture ideas in `docs/method/backlog/cool-ideas/`.
   Update CHANGELOG, bump version, tag if releasing, update README,
   maintain the backlog.

This loop is part of the process, not optional cleanup.

## Playback

After implementation, before the retro, run the dual playback:

1. **Agent playback** — the agent answers every agent playback
   question. Written in the retro doc.
2. **Stop.** The agent prompts the human to check the user playback
   questions. Do not proceed until the human responds.
3. **Human playback** — the user answers every user playback question.
   Written alongside the agent playback.
4. **Gate** — both perspectives must agree the hill is met before
   proceeding to the retrospective.

Playback questions should be answerable with **yes/no**. If you cannot
get a clear yes, that is the signal.

### Playback outcomes

**Hill met** — proceed to retrospective, merge, close the cycle.

**Hill partially met** — merge what is honest. The retrospective
explains the gap (drift check). Remaining work is logged as debt in
`docs/method/backlog/`. The cycle closes but the hill is marked partial.
No pretending.

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

Backlog items live as individual Markdown files in
`docs/method/backlog/`. Priority is communicated through
subdirectories — see [METHOD.md](../../METHOD.md) for the full
structure.

### Lifecycle

1. **Backlog:** the item lives in `docs/method/backlog/` under the
   appropriate priority lane.
2. **Active:** when a cycle begins, the item is promoted to a design
   doc in `docs/design/<cycle>/`. The backlog file is removed.
3. **Done:** after the retrospective, the cycle has a design doc in
   `docs/design/<cycle>/` and a retro in `docs/method/retro/<cycle>/`.
4. **Rejected:** if the idea is killed, move it to
   `docs/method/graveyard/` with a note explaining why.

### Rules

- Do not let roadmap thinking drift into untracked chat context.
- Every cycle must have a design doc before work begins.

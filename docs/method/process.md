# Cycle Development Process

This document describes the maintainer-owned process for planning and
executing development cycles. It applies to **roadmap cycles** -
feature work with design docs, playback questions, and retrospectives.

Bug fixes, doc improvements, and test-only changes follow a lighter
path: branch, fix, test, PR.

## Cycle Design

Every meaningful design cycle should define:

- **linked GitHub Issue** - the live tracker item, with Method lane/type/legend
  labels
- **sponsor human** — the human perspective that keeps the debugger
  honest about actual use
- **sponsor agent** — the agent perspective that keeps the protocol
  and machine-readable contract honest about tool use
- **hill** — a clear statement of what success looks like
- **playback questions** — yes/no questions answered after
  implementation to verify the hill is met
- **non-goals** — explicit boundaries on what the cycle does not do
- **agent-first surface** - the MCP, CLI JSON, read model, schema, generated
  artifact, fixture, or deterministic tool output that lands before human UI
- **authority/mutation boundary** - the facts WARP TTD may inspect and the
  authority, admission, or host mutation it must not perform
- **proof policy** - whether the cycle requires behavior proof or is explicitly
  docs/process-only

Before promoting a new direction, ask:

- which hill does this support?
- what user or operator trust does this improve?
- does this preserve substrate honesty?
- does this keep the protocol narrow enough to survive?

If the answer is unclear, the work belongs in the backlog, not a cycle.

## Development Loop

Each cycle follows the same explicit loop:

0. **Sync to merge target** - run `git fetch --prune origin`, sync to the
   target branch (almost always `origin/main`), and verify a clean worktree.
1. **Issue** - choose or create the GitHub Issue, set Method lane/type/legend
   labels, set a milestone when relevant, and keep the issue as the live
   tracker.
2. **Branch** - create a new branch from the synced merge target using the issue
   title slug.
3. **Design** - write a design doc in `docs/design/<cycle>/` from
   `docs/templates/design-cycle.md`. Define the linked issue, sponsor human,
   sponsor agent, hill, agent-first surface, authority/mutation boundary,
   playback questions, tests to write first, and non-goals.
4. **Open the cycle** - stage the design doc, commit, push the branch, open a
   draft PR, link the GitHub Issue and design doc from the PR, and apply
   `work-in-progress` to the issue. The draft PR is a coordination surface, not
   a review request or completion claim.
5. **RED - write failing tests** - playback questions become executable
   specifications. Tests are the literal spec. No documentation layer
   sits between intent and verification. Build the agent-facing surface
   first — it operates at the low level you need anyway to make the
   user-level experience work.
6. **GREEN - implement** - write code until the tests pass. Code exists
   because specs demanded it.
7. **Playback** - answer every playback question from both perspectives.
   The agent checks the agent playback questions. The human is prompted
   to check the user playback questions. Write the answers down. Do not
   proceed until every playback question has a clear yes/no answer.
8. **Ready for review** - run validation, update the PR checklist, remove or
   replace stale `work-in-progress` issue state, and convert the PR from draft
   to ready-for-review. Review loops until merge is accepted.
9. **Close** - merge. Write a retrospective in
   `docs/method/retro/<cycle>/`. The retro must include:
   - **Drift check:** compare what was built against the design doc.
     Call out any divergence — intentional or accidental.
   - **Tech/design debt:** create or update GitHub Issues with `lane:bad-code`.
   - **Cool ideas:** create or update GitHub Issues with `lane:cool-ideas`.
   Update CHANGELOG, bump version, tag if releasing, update README,
   maintain the backlog.

This loop is part of the process, not optional cleanup.

### Draft PR Policy

Draft PRs are allowed only for active cycle coordination. A draft PR must be
opened after the initial issue/design commit is pushed, must link the GitHub
Issue and design doc, and must remain visibly unfinished until validation and
playback are ready for review. A draft PR is never a substitute for issue
labels, design docs, tests, witness, Manual updates, retros, or closeout.

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
GitHub Issues. The cycle closes but the hill is marked partial.
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

## GitHub Issues

GitHub Issues are the live work tracker. Labels carry Method lane, type,
legend, priority, and active-work state. Repository files are evidence:
designs, witnesses, retros, manuals, generated artifacts, and signposts.

### Lifecycle

1. **Inbox:** raw work enters GitHub Issues with `lane:inbox`.
2. **Prioritized:** shaped work moves to `lane:asap`, `lane:bad-code`, or
   `lane:cool-ideas`.
2. **Active:** when a cycle begins, the item is promoted to a design
   doc in `docs/design/<cycle>/`, and the issue gets `work-in-progress`.
3. **Done:** after the retrospective, the cycle has a design doc in
   `docs/design/<cycle>/`, a retro in `docs/method/retro/<cycle>/`, and a
   linked PR.
4. **Rejected:** if the idea is killed, close the GitHub Issue with a
   disposition comment.

### Rules

- Do not let roadmap thinking drift into untracked chat context.
- Every cycle must have a design doc before work begins.
- New cycle design docs must use `docs/templates/design-cycle.md`.
- Run `npm run check:method` before PR.
- Implementation work must include at least one non-doc behavior/runtime/tooling
  proof. Documentation assertions cannot be the only proof.

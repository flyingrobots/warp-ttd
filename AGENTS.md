# AGENTS

## Scope

This guide is for AI agents and human operators in the WARP TTD repository.

- WARP TTD is agent-native and agent-first. New behavior should first land as
  structured surfaces (CLI `--json`/JSONL, MCP, protocol artifacts, deterministic
  read-models).
- Human interfaces (TUI/browser/text) may compose those same surfaces but are not
  the canonical source of truth.
- For Continuum targets, if an agent must scrape a human view to use a feature,
  that feature is incomplete.

## Git Rules

- NEVER amend commits.
- NEVER rebase unless explicitly requested.
- NEVER force any git operation. If force appears necessary, stop and explain the
  options.
- NEVER create draft pull requests.
- Do not create branch names, PR titles, or commit messages with `codex`.
- Pushes to `main` require explicit user permission.
- Keep PR history non-draft and merge-oriented.
- PR bodies for issue work must include GitHub auto-close text such as
  `Closes #123` for each issue it intends to close.

## Issue, Milestone, and Tracking Model

### Source of Truth
- GitHub Issues are the live work tracker.
- GitHub Milestones are the primary release/cycle grouping mechanism.
- For live work status, use milestone membership plus issue labels/state.

### Labeling Discipline
- Use repository issue labels as governance signal (asap / cooldown / blocked /
  quality / debt / etc.) and keep labels aligned to current lifecycle.
- Keep `needs-design` where no design artifact is ready.
- Keep issues out of closed states once implementation starts.

### End-of-Turn Checklist (repo changes)
1. Update issue state, milestone, and labels for the change you made.
2. Preserve milestone hygiene: move completed work to the next appropriate
   milestone state.
3. Avoid adding unresolved `needs-design` debt for fully implemented behavior.

## Topic Shelf Model

`docs/topics/` holds the living contract graph for landed behavior. Shelves are
for contract-bearing surface area, not administrative prose.

Each shelf may contain:

- `README.md`: current truth in HEAD.
- `test-plan.md`: requirements/cases/fixtures/oracles/planned gaps.
- `architecture.md`: optional dataflow/structure notes.
- `rationale.md`: optional tradeoff and rejection notes.

### When To Update Topic Shelves

For every nontrivial behavior, workflow, release, schema, validation, or public
surface change:

1. Identify the owning topic shelf before editing implementation.
2. If no shelf exists, create one.
3. Update `test-plan.md` with requirement IDs, cases, fixtures, and oracles.
4. Add executable evidence (tests/fixtures/contract checks).
5. Update `README.md` only after behavior lands on branch.
6. Mark planned cases only when evidence exists.
7. Run `cargo xtask verify` before claiming a shelf current.

If this repo does not yet have `cargo xtask verify`, document that temporary
substitute explicitly in the shelf and run the equivalent local verification
commands in that command set.

### When Not To Update Topic Shelves

Skip shelf updates for pure mechanics that do not change contract truth:
formatting, typo-only edits, dependency pin updates with no observable behavior
change, or refactors that keep existing contract/tests valid.

## Local Verification Gate for This Repo

Unless explicitly overridden, use this command set before calling work
"ready":

```bash
npm run test
npm run test:integration
npx tsc --noEmit
npm run lint
npm run lint:check
```

For topic-shelf updates, run `cargo xtask verify` where available; otherwise run
the equivalent local verification set above and call out the gap in the PR body.

## Context Recovery

When recovering context:

1. Read `docs/BEARING.md` for active gravity.
2. Read `ROADMAP.md` for product sequencing.
3. Review GitHub issues/milestones for active work and status.
4. Run `git log -n 5` and `git status`.

# Cycle A — Housekeeping & Reality Sync

**Status:** closed

## Sponsor Human

Application developer who cloned the repo and needs the README, BACKLOG, and
CHANGELOG to honestly describe what exists — not the bootstrap state from three
weeks ago.

## Sponsor Agent

Coding agent starting a new conversation against this repo. Needs design docs
that record the decisions already made (async adapter interface,
frame-per-lamport-tick indexing, bijou v4 TUI) so it doesn't re-derive or
contradict them.

## Hill

A contributor opening this repo for the first time can understand what exists,
what was decided, and what is next — without reading git log or asking the
original author.

## Playback Questions

- Does the README accurately describe the current capability surface?
- Does the BACKLOG reflect reality — completed items checked, next items
  honest?
- Is there a CHANGELOG entry for the work that shipped (async interface,
  git-warp adapter, TUI)?
- Are integration tests (git-warp, hitting real repos in /tmp) separated from
  the fast suite so `npm test` stays CI-safe?
- Is there a design doc that freezes the git-warp adapter and TUI decisions?

## Non-Goals

- No new features.
- No protocol changes.
- No architecture refactoring.
- No version bump or release tag — this is pre-cycle cleanup.

## Scope

1. Rewrite `README.md` to reflect current reality.
2. Update `BACKLOG.md` to use `docs/backlog/` pointers and reflect completed
   work.
3. Create `CHANGELOG.md` with an Unreleased section covering the bootstrap
   and the adapter/TUI work.
4. Backfill design doc: `docs/design/0005-git-warp-adapter.md` — async
   interface, frame indexing, receipt mapping, fixture library.
5. Backfill design doc: `docs/design/0006-tui-port.md` — bijou v4, page
   architecture, adapter construction, shader porting.
6. Separate integration tests: `npm test` runs only fast fixture tests;
   `npm run test:integration` runs git-warp tests against real repos.
7. Retrospective: `docs/retrospectives/0002-adapter-tui-sprint.md`.

# Retrospective — Cycle 0013: Bijou App Frame Migration

**Outcome:** hill met

## What shipped

- `src/tui/main.ts` — 690 → 96 lines. Thin app shell with
  `createFramedApp`, page registry, pulse timer, quit handler.
- `src/tui/pages/connectPage.ts` — connect wizard with own model,
  update, keyMap
- `src/tui/pages/navigatorPage.ts` — step/seek/pin with own keyMap
- `src/tui/pages/worldlinePage.ts` — tick scroll with own keyMap
- `src/tui/pages/inspectorPage.ts` — receipt/lane detail view
- `src/tui/pages/shared.ts` — `SessionContext` type for cross-page
  session sharing
- `src/tui/sessionSync.ts` — cross-page session propagation,
  worldline cursor sync, worldline frame loading
- Framework features unlocked: command palette (Ctrl+P), help
  viewer (?), quit confirmation modal
- Default to latest tick on connect (not genesis)
- Worldline cursor syncs to session's current frame index across
  page switches and navigation
- Bumped bijou to 4.2.0
- Lint ratchet: 124 → 66
- 9 new structure tests, 148 total passing

## Playback

### Agent

1. Each page has own init, update, keyMap? **Yes.** Four page files
   under `src/tui/pages/`, no shared monolithic update.
2. Global model eliminated? **Yes.** Each page has its own model
   type. Cross-page state flows through `sessionSync.ts`.
3. Domain vs framework identifiable by file boundary? **Yes.**
   `pages/` = domain, `main.ts` = shell, `sessionSync.ts` = plumbing,
   `*Layout.ts` = rendering.

### User

1. `?` opens help viewer? **Yes.**
2. `Ctrl+P` opens command palette? **Yes.**
3. `q` shows quit confirmation? **Yes.**
4. Page-specific keys scoped to their pages? **Yes.**

## Drift check

Design said the global update disappears entirely. In practice,
`main.ts` still has a `updateApp` function that:
- Intercepts `quit` and `worldline-loaded` messages
- Detects session state changes for cross-page sync

This is shell-level wiring, not domain logic. The monolithic
if-else chain with `isKeyMsg` and `activePageId` checks is gone.
Cross-page messaging turned out to be more involved than expected
because bijou-tui doesn't publicly export `emitMsgForPage`. The
workaround (direct model mutation in `syncSession`) is functional
but less clean than message-based dispatch.

Design said main.ts would be ~50 lines. Actual: 96 lines. The
extra 46 lines are session sync wiring — extracted to
`sessionSync.ts` (98 lines) to keep main.ts focused.

Also added "default to latest tick on connect" — not in the
original design but a correctness fix surfaced during testing.

## What we learned

1. `createFramedApp` expects homogeneous page types. Heterogeneous
   pages require `any` casts at the registration boundary.
2. Cross-page communication is the hard part. The frame doesn't
   expose public APIs for page-to-page messaging. Shell-level
   model mutation is the practical workaround.
3. Session state sync (connect/disconnect/frame position) is a
   cross-cutting concern that doesn't belong in any single page.
   `sessionSync.ts` is the right extraction.
4. Defaulting to latest tick on connect is the right UX — users
   debug the present, not the past.

## New backlog items

- Verbose help line — per-page keybinding hints overflow the
  footer at normal terminal widths. Could use `helpLineSource`
  override or shorter labels. Low priority since `?` shows the
  full list.

## Tech debt

None introduced. Lint errors decreased (124 → 66).

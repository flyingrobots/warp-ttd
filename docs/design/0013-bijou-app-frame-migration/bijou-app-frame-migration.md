# Design Doc — Bijou App Frame Migration

**Cycle:** 0013-bijou-app-frame-migration
**Legend:** CV (CORE_VIEWS)
**Type:** feature cycle

## Sponsor Human

Developer opening warp-ttd and expecting a polished debugger experience:
command palette, help viewer, quit confirmation, per-page keyboard
scoping, and consistent navigation — without the maintainer hand-coding
each one.

## Sponsor Agent

Agent inspecting the TUI codebase. Needs to understand which code is
application logic (debugger domain) vs which is framework plumbing
(tab switching, scroll state, keybinding routing). Currently these are
entangled in one 690-line `main.ts`.

## Hill

warp-ttd's TUI uses `createFramedApp()` properly: each page owns its
own model, update, and keymaps. The global update loop disappears.
Framework features (command palette, help, quit modal) work out of the
box.

## Playback Questions

### Agent

1. Does each page have its own `init`, `update`, and `keyMap` — no
   shared monolithic update function?
2. Is the global model eliminated — each page model is independent?
3. Can the agent identify domain logic (debugger) vs framework
   plumbing (bijou) by file/module boundaries?

### User

1. Does `?` open a keybinding help viewer?
2. Does `Ctrl+P` open a command palette with debugger actions?
3. Does `q` show a quit confirmation modal instead of immediately
   exiting?
4. Do page-specific keys (n/p for step, up/down for worldline
   scroll) only work on their respective pages?

## Current State

`main.ts` already calls `createFramedApp()` but fights it:

- All four pages share one `Model` type (53 → 72)
- Every page's `update` is a no-op — real update lives in
  `mainApp.update` (391 → 676)
- Pages are `(msg, model) => [model, []]` stubs
- `updateAllPages()` broadcasts model changes to all pages
- Keyboard handling is one giant if-else chain scoped by
  `activePageId` and `session !== null`
- No page-level `keyMap` — all keys in `globalKeys`

## Design

### Per-page models

Each page gets its own model type:

| Page | Model | Owns |
|------|-------|------|
| Connect | `ConnectModel` | wizard step, choice index, input value, error |
| Navigator | `NavigatorModel` | session ref, jump input, error |
| Worldline | `WorldlineModel` | session ref, frames, cursor |
| Inspector | `InspectorModel` | session ref |

Shared state (session, hello, catalog) lives in a union:
- When disconnected, pages that need a session render "Connect first"
- When connected, the session is passed via a shared context or
  per-page init on connect

### Per-page update + keyMap

Each page declares its own `keyMap` and `update`:

- **Connect**: up/down/enter for wizard, escape for back, text input
- **Navigator**: n/p for step, g for jump, P/u for pin/unpin
- **Worldline**: up/down for scroll, enter for jump-to-navigator
- **Inspector**: passive (no keys needed yet)

The global update disappears. `mainApp.update` becomes a thin
pass-through that only handles cross-page messages (session-ready,
disconnect).

### Framework features unlocked

With proper page structure, these work automatically:

- **`?` help viewer** — bijou renders keybindings from page keyMaps
- **Quit confirmation** — bijou shows a modal on q/Ctrl+C
- **Command palette** — `enableCommandPalette: true` + per-page
  `commandItems()` returning debugger actions
- **Per-page key scoping** — navigator keys don't fire on worldline

### File structure after migration

```
src/tui/
  main.ts              — app shell: createFramedApp + page registry
  pages/
    connectPage.ts     — connect wizard page
    navigatorPage.ts   — navigator page (wraps navigatorLayout)
    worldlinePage.ts   — worldline page (wraps worldlineLayout)
    inspectorPage.ts   — inspector page
  navigatorLayout.ts   — pure rendering (unchanged)
  worldlineLayout.ts   — pure rendering (unchanged)
  laneGraph.ts         — pure rendering (unchanged)
  shaders/             — unchanged
```

### What changes

- `main.ts` shrinks from ~690 lines to ~50 (page registry + run)
- Each page file is ~80-150 lines (model + update + keyMap + layout)
- `updateAllPages` pattern eliminated
- `isKeyMsg` conditional chain eliminated
- Per-page commands registered via `commandItems()`

### What stays

- `navigatorLayout.ts` — pure rendering, unchanged
- `worldlineLayout.ts` — pure rendering, unchanged
- `laneGraph.ts` — pure rendering, unchanged
- `shaders/` — unchanged
- `src/app/` — debugger session, adapter registry, unchanged
- `src/protocol.ts` — unchanged
- All existing tests — unchanged (they test pure layout functions)

## Non-Goals

- This cycle does not adopt `splitPane`, `browsableList`,
  `navigableTable`, or other Bijou components for page internals —
  that's the [worldline view rethink](../../method/backlog/asap/worldline-view-rethink.md)
- This cycle does not redesign any page's visual layout
- This cycle does not add new TUI features beyond what the framework
  gives us for free (help, palette, quit modal)
- This cycle does not change the CLI or protocol

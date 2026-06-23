# TUI Shell architecture

## Purpose

The TUI shell is a shared UI substrate for a live `DebuggerSession`.
It coordinates page-local views over one mutable session model.

## State ownership

- `src/tui/main.ts` owns the shell frame and top-level update loop.
- Each page owns page-local UI state (`connect`, `nav`, `worldline`, `inspect`).
- Shared session context (`SessionContext`) is projected into all pages from shell-level sync.

## Cross-page sync flow

1. `connectPage` creates/updates `SessionContext` and emits `session-ready` when connected.
2. `main.ts` notices session context changed and calls `syncSession(...)`.
3. `syncSession(...)` propagates context into `nav`, `worldline`, and `inspect` models and triggers a worldline reload command.
4. Worldline command emits `worldline-loaded` after reading all frames from the adapter.
5. `handleWorldlineLoaded(...)` applies frames only if the load still belongs to the active session.
6. On frame/lane/site updates, `sessionSync.ts` recomputes focus and cursor alignment:
   - site→lane alignment for inspector/worldline,
   - lane cursor changes,
   - neighborhood summary propagation.

## Failure containment

- A failed worldline load is currently non-fatal by design; the shell keeps UI alive.
- Most user-visible regressions are synchronization mismatches, not crashes.
- Recovery should start in sync helpers (`sessionSync.ts`) before page-level refactors.

## Runtime update map

- **Page transition:** `createFramedApp` in `src/tui/main.ts`
- **Session propagation and worldline load:** `src/tui/sessionSync.ts`
- **Session seek/jump commands:** `src/tui/pages/navigatorPage.ts`, `src/tui/pages/worldlinePage.ts`
- **Cross-page message contract:** `src/tui/frameTypes.ts`

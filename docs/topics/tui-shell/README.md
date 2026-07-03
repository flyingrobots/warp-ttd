---
title: TUI Shell
topic: tui-shell
---

<a id="entry-onboarding"></a>
## At a glance

This shelf owns the **runtime shell for human inspection**:

| Question | Answer |
|---|---|
| What this topic owns | page registration, shared session state propagation, frame navigation, and inspector/worldline focus sync. |
| What it does not own | protocol wire formats, adapter selection policy, and test expectations for protocol semantics. |
| How it works | connect/session events are normalized in `main.ts`, synchronized by `sessionSync.ts`, and replayed into page models through deterministic update cycles. |
| Why this matters | shell state is the primary operator workflow for inspection and triage across TUI surfaces. |
| First prerequisite | understand session snapshot semantics in `debugger-session-core`. |
| What changes propagate | shell sync and focus updates affect frame navigation, inspector coherence, and worldline consistency together. |
| Extra notes | For structural flow details and edge-case containment, see `architecture.md`. |

### Mental model (from code to UI)

1. `src/tui/main.ts` creates a framed app with 4 pages:  
   `connect` (connect/select), `nav`, `worldline`, `inspect`.
2. Each page owns local UI state but the shell owns **shared session context** (`SessionContext`) and synchronizes it across pages.
3. The shell update loop calls:
   - `syncSession(...)` whenever session context changes (connect/disconnect), and
   - `syncNeighborhoodFocus(...)` after most frame updates to keep inspector and worldline selection coherent.
4. The worldline page loads full history on session change by:
   - reading head and frames from the session adapter,
   - emitting `worldline-loaded`,
   - then applying cursor+focus state once frame payload arrives.

### One-liner data flow

- **Connect** establishes a `DebuggerSession`, emits a session context, and shell pushes it to all pages.
- **Navigator** and **Inspector** consume the context for reads and commands (`step/jump`, pinning, site navigation).
- **Worldline** applies selected lane/site focus and emits seek commands when the user moves through ticks.
- **Shell sync layer** (`src/tui/sessionSync.ts`) resolves inconsistencies so Inspector focus, selected lane, and worldline cursor don't drift.

<a id="entry-edit"></a>
## Safe change path

If you change behavior, treat three layers separately:

1. **Page-local change** (UI copy, key binding, local rendering)
   - Edit only the relevant page file (`connectPage.ts`, `navigatorPage.ts`, `worldlinePage.ts`, `inspectorPage.ts`).
   - Do not touch sync helpers unless cross-page state breaks.
2. **Session-sync change** (cross-page propagation, focus/cursor coupling)
   - Edit `src/tui/sessionSync.ts` and/or `src/tui/main.ts`.
   - Preserve both invariants:
     - every non-null session context is propagated to all three dependent pages (`nav`, `worldline`, `inspect`);
     - when session changes, worldline data resets then reloads from the new session before user control resumes.
3. **Protocol integration change**
   - Edit `src/tui/frameTypes.ts` and relevant protocol adapters only when message shape changes.
   - Keep all internal messages typed and routed through page updates.

Apply this order to avoid flaky failures:

1. Update implementation.
2. Update corresponding requirement row(s) in `test-plan.md`.
3. Run focused tests.
4. Run full docs + docs verification if proof changed.

Focused command (page/layout + sync):

```bash
npm run test -- test/tuiPageStructure.spec.ts
npm run test -- test/inspectorPage.spec.ts
```

Focused verification command:

```bash
npm run test -- test/sessionSync.spec.ts test/worldlineLayout.spec.ts
```

Full verification:

```bash
npm run test && npm run test:integration && npx tsc --noEmit && npm run lint && npm run lint:check
```

High-risk compatibility boundary:
- A session change that does not trigger synchronization yields stale cursors or mismatched focus across pages.
- Breaking async worldline loading (`worldline-loaded`) leaves inspector/worldline in split-brain state.

<a id="entry-triage"></a>
## Failure modes

| Failure shape | Detection signal | Consequence | First response | Verification |
|---|---|---|---|---|
| Connection fail or bad adapter config | connect page shows `Error:` message; session never becomes non-null | user never gets session-driven data | check `makeConnectCmd` failure path and adapter input validation | `test/tuiPageStructure.spec.ts`, `test/tuiShell`-adjacent smoke in `test/connectPage.spec.ts` |
| Inspector/worldline drift | selected site and lane no longer match worldline focus after frame change | wrong row details or wrong cursor in worldline | run through connect → step frame → lane change; confirm no stale focus in `sessionSync.ts` | `test/sessionSync.spec.ts`, `test/worldlineRender.spec.ts` |
| Silent empty worldline | worldline view stays blank without explicit crash | hidden data-load failure after connect/session update | inspect load command in `syncSession()` and `makeWorldlineLoadCmd()` | `test/worldlinePage.spec.ts`, `test/worldlineLayout.spec.ts` |
| Navigation/state regression | invalid keys no-op or jump fails | operators cannot inspect expected frames | verify key-map coverage and `session.seekToFrame` usage points | `test/tuiPageStructure.spec.ts`, `test/inspectorPage.spec.ts`, `test/worldlinePage.spec.ts`, `test/navigatorLayout.spec.ts` |

<a id="entry-impact"></a>
## Dependencies and impact

| Edge | Details |
|---|---|
| Depends on | `protocol-contract`, `debugger-session-core`. |
| Used by | No direct dependents currently, but it is a primary operator surface for understanding session behavior. |
| Cross-shelf impact | Changes in focus/cursor semantics can hide session/protocol regressions when triaging in other surfaces. |

### What to read when debugging behavior

- Start in `src/tui/main.ts` for event wiring.
- Move to `src/tui/sessionSync.ts` for invariants and focus propagation.
- Then use page files for symptoms:
  - `connectPage.ts` (why/how sessions are created),
  - `navigatorPage.ts` (step/jump contract),
  - `worldlinePage.ts` (cursor/lane selection behavior),
  - `inspectorPage.ts` (focus panel rendering).

## Evidence

- Normative claims are in `test-plan.md` rows `R-TUI-1` through `R-TUI-4`.
- Primary sources:
  - `src/tui/main.ts`
  - `src/tui/sessionSync.ts`
  - `src/tui/frameTypes.ts`
  - `src/tui/pages/*`

# Design Doc 0012 — DebuggerSession

**Status:** in progress
**Cycle:** 0008-debugger-session

## Sponsor Human

Application developer debugging a multi-lane graph. Needs a session
concept that tracks their investigation — which head they're watching,
what observations they've pinned — separate from the substrate-facing
PlaybackHead.

## Sponsor Agent

Coding agent driving a debug workflow via MCP or CLI. Needs a session
handle that bundles playback state and pinned observations into a
single addressable, serializable object.

## Hill

A `DebuggerSession` exists as a first-class domain concept in the
application layer, distinct from `PlaybackHead`, that models a human
investigation across lanes and frames. The TUI consumes sessions. The
CLI can serialize session state.

## What DebuggerSession IS

An application-layer object that sits between the TUI/CLI and the
raw `TtdHostAdapter`. It manages:

- **Snapshot** — current head, frame, receipts, emissions,
  observations, execution context. Updated on every navigation.
- **Pins** — bookmarked observations frozen at capture time. Survive
  frame stepping so the user can compare "what happened at frame 2"
  with "what happens at frame 5."
- **Identity** — a sessionId for future serialization and for
  populating `ExecutionContext.sessionId`.

It does NOT own host-level metadata (hello, catalog). Those are
fetched once at connect time and belong to the connection lifecycle,
not the per-frame investigation.

## What DebuggerSession is NOT

- Not a protocol type. Session state is a debugger concern, not a
  wire format. Types live in `src/app/`, not `src/protocol.ts`.
- Not multi-head yet. Tracks one `activeHeadId`. Multi-head
  comparison is deferred to the Strand & Speculation cycle.
- Not persisted. Serializable via `toJSON()` but no disk I/O.

## Types

```typescript
// The materialized view at the current frame
interface SessionSnapshot {
  head: PlaybackHeadSnapshot;
  frame: PlaybackFrame;
  receipts: ReceiptSummary[];
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
  execCtx: ExecutionContext;
}

// A frozen observation bookmarked by the user
interface PinnedObservation {
  pinnedAt: number;  // frameIndex when captured
  observation: DeliveryObservationSummary;
  emission: EffectEmissionSummary;
}

// JSON-serializable session state
interface SerializedSession {
  sessionId: string;
  activeHeadId: string;
  snapshot: SessionSnapshot;
  pins: PinnedObservation[];
}
```

## API

```
DebuggerSession.create(adapter, headId) → Promise<DebuggerSession>

session.sessionId          → string
session.activeHeadId       → string
session.snapshot           → SessionSnapshot
session.pins               → readonly PinnedObservation[]

session.stepForward()      → Promise<SessionSnapshot>
session.stepBackward()     → Promise<SessionSnapshot>
session.seekToFrame(n)     → Promise<SessionSnapshot>

session.pin(observationId) → PinnedObservation | null
session.unpin(observationId) → boolean

session.toJSON()           → SerializedSession
```

## TUI integration

The TUI Model replaces raw protocol fields with a session reference:

**Before:** `adapter, defaultHeadId, head, frame, receipts, emissions,
observations, execCtx`

**After:** `session: DebuggerSession | null` (plus `hello` and
`catalog` which stay on Model as host metadata)

Layout functions read from `model.session.snapshot`. Navigation
commands call `session.stepForward()` etc. New keybindings:
`[P]` pin, `[u]` unpin.

## CLI integration

New `session` command:
- `--json` outputs `SerializedSession`
- Human-readable mode prints a formatted summary

Existing commands (`frame`, `step`, etc.) are unchanged.

## Playback Questions

1. Is DebuggerSession defined in the app layer, not the TUI?
2. Can a session track a playback head and navigate it?
3. Does the session preserve pinned observations across frame steps?
4. Is the session serializable via `toJSON()`?
5. Does the TUI consume sessions, not raw playback heads?
6. Does the CLI `session --json` command output session state?

## Non-Goals

- No session persistence to disk.
- No multi-user session sharing.
- No session history / undo.
- No multi-head tracking (single head for now).

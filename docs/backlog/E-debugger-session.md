# Cycle E — DebuggerSession

**Status:** queued

## Sponsor Human

Application developer debugging a multi-lane graph. Needs a session concept
that tracks their investigation — which heads they're watching, what
comparison they're building, what they've pinned — separate from the
substrate-facing PlaybackHead.

## Sponsor Agent

Coding agent driving a debug workflow via MCP or CLI. Needs a session handle
that bundles multiple playback heads, comparison state, and pinned
observations into a single addressable object.

## Hill

A `DebuggerSession` exists as a first-class domain concept, distinct from
`PlaybackHead`, that models a human investigation across lanes and frames.

## Playback Questions

- Is `DebuggerSession` defined in protocol types, not just the TUI?
- Can a session track multiple playback heads simultaneously?
- Does the session preserve pinned observations across frame steps?
- Is the session serializable for future persistence?
- Does the TUI consume sessions, not raw playback heads?

## Non-Goals

- No session persistence to disk yet.
- No multi-user session sharing.
- No session history / undo.

## Scope

1. Design doc defining `DebuggerSession` semantics.
2. Protocol types for session state.
3. Application-layer session management (create, pin, compare).
4. TUI updated to operate on sessions.
5. CLI commands for session inspection (`--json`).

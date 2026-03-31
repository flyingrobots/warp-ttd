# Design Vocabulary

**Status:** queued

## Problem

The codebase and UI use inconsistent or incorrect terminology. The
substrate has precise language and the debugger should honor it.

## Known Corrections

| Wrong | Right | Why |
|-------|-------|-----|
| timeline | worldline | Worldlines are causal histories, not linear timelines |
| frame | tick | Ticks are Lamport clocks on a worldline |
| working-set | strand | Already renamed in protocol (v0.1.0) |

## Scope

- Audit all user-visible strings in TUI and CLI
- Audit design docs and comments
- Audit protocol type names and field names (e.g., `frameIndex`
  might need to become `tickIndex` — but this is a breaking change)
- Establish a canonical glossary in CONTRIBUTING.md or a dedicated doc
- Ensure the UX Language Rules section in CONTRIBUTING.md stays
  aligned

## Tension

Some protocol field names like `frameIndex` and `PlaybackFrame` use
"frame" because the protocol models composite snapshots across
multiple lanes at a point in playback time — which is a different
concept from a single lane's tick. The vocabulary audit needs to
decide whether "frame" is correct at the protocol level even if
"tick" is correct at the substrate level.

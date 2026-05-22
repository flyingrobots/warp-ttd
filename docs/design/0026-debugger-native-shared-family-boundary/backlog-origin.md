---
title: Debugger-Native Shared-Family Boundary Backlog Origin
status: landed
---

# Debugger-Native vs Shared-Family Boundary

**Legend:** PROTO

## Origin

`warp-ttd` should not drift into either of two bad extremes:

- blindly mirror every runtime or shared-family noun into the debugger
- invent a completely separate debugger ontology that quietly diverges from the
  runtime

The missing work was to name the boundary clearly.

## Why It Was Pulled

The repo already had strong debugger-native nouns:

- playback head
- frame
- receipt summary
- effect emission summary
- delivery observation
- execution context

The broader stack also has stronger shared families and clearer ownership
rules. This cycle states which debugger nouns stay local and which become
projections over generated shared families.

## Source Backlog

- `docs/method/graveyard/PROTO_debugger-native-vs-shared-family-boundary.md`

# Cycle C — Hexagonal Cleanup

**Status:** closed

## Sponsor Human

Application developer extending the TUI with a new adapter type. Should not
need to touch view code to wire a new host backend.

## Sponsor Agent

Coding agent adding an adapter. Should find a clear seam (factory or registry)
where adapters are constructed, not chase imports scattered through the render
layer.

## Hill

The TUI does not directly import or construct host adapters. Adapter
construction flows through an explicit application-layer seam that the TUI
consumes as a dependency.

## Playback Questions

- Can a new adapter be added without modifying any TUI page code?
- Does the TUI depend only on `TtdHostAdapter` (the port), never on concrete
  adapter classes?
- Is adapter construction testable independently from the TUI?

## Non-Goals

- No new adapters.
- No protocol changes.
- No TUI feature work beyond the boundary fix.

## Scope

1. Introduce an adapter factory or registry at the application layer.
2. Remove direct imports of `EchoFixtureAdapter` and `GitWarpAdapter` from
   TUI code.
3. TUI receives its adapter through dependency injection (constructor arg,
   command message, or init config).
4. Tests verify the seam works for both adapter types.

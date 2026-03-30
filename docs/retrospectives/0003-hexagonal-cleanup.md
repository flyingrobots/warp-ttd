# Retrospective 0003 — Hexagonal Cleanup (Cycle C)

**Date:** 2026-03-29

## What Shipped

1. Adapter registry (`src/app/adapterRegistry.ts`) — application-layer seam
   that resolves `AdapterConfig` → `ResolvedAdapter` (adapter + default head
   ID).
2. TUI no longer imports any concrete adapter class or host infrastructure.
   All adapter construction flows through `resolveAdapter()`.
3. Head ID convention normalized — each adapter declares its default head ID
   through the registry, eliminating the hardcoded `"head:main"` vs
   `"head:default"` branching in the TUI.
4. Design doc 0007 — adapter registry design and rationale.
5. 3 new tests (2 fast, 1 integration) verifying the registry seam.

## Playback — Human Stakeholder

> Can a new adapter be added without modifying any TUI page code?

Yes. Add a new `AdapterKind`, a new case in `resolveAdapter()`, and a new
option in `CONNECT_OPTIONS`. No TUI page code changes needed.

> Does the TUI depend only on `TtdHostAdapter` (the port), never on concrete
> adapter classes?

Yes. Verified by grep — zero imports of `EchoFixtureAdapter`,
`GitWarpAdapter`, `@git-stunts/git-warp`, or `@git-stunts/plumbing` in
`src/tui/`.

> Is adapter construction testable independently from the TUI?

Yes. `test/adapterRegistry.spec.ts` tests the seam without any TUI
dependency.

## Playback — Agent Stakeholder

An agent adding a new adapter finds a single file to modify
(`src/app/adapterRegistry.ts`) with a clear pattern: add a case to the
switch, return `{ adapter, defaultHeadId }`. The design doc explains why
a function was chosen over a class.

## What We Learned

- The head ID divergence (`head:main` vs `head:default`) was a symptom of
  the missing seam. Once the registry existed, normalizing it was trivial.
- Dynamic imports in the registry keep the echo fixture path fast (no
  git-warp loading) while still supporting git-warp when needed.

## Verdict

Clean cycle. The hill was narrow, the implementation matched the design doc,
and all three playback questions are answered affirmatively.

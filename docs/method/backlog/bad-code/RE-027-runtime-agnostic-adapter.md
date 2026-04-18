# RE-027 — Runtime-Agnostic Adapter

Legend: [RE — Runtime Engine](../../legends/RE-runtime-engine.md)

## Idea

The `gitWarpAdapter.ts` currently uses `node:module`'s `createRequire` to resolve the version of the `git-warp` substrate. This is a Node-specific implementation detail that prevents the adapter from being used in Bun or Deno environments, despite the project's goal of multi-runtime portability.

Refactor the adapter to receive its version string during construction (e.g. from a factory) or via a dedicated `RuntimePort`. Remove all direct dependencies on Node-only modules from the core adapter logic.

## Why

1. **Multi-Runtime Integrity**: Enables the debugger to run natively in Deno or Bun.
2. **Hexagonal Purity**: Keeps the adapter focused on the TTD protocol rather than the physical host runtime.
3. **Consistency**: Aligns the project with the industrial-grade standards established across the monorepo.

## Effort

Small — move version resolution to the factory level in `src/cli.ts` or `src/tui/main.ts`.

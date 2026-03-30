# 0007 — Adapter Registry

**Status:** implemented
**Cycle:** C — Hexagonal Cleanup

## Context

The TUI directly imports `EchoFixtureAdapter`, `GitWarpAdapter`, and
git-warp/plumbing infrastructure classes. This violates the hexagonal
architecture principle: UI code should depend on the port
(`TtdHostAdapter`), not on concrete adapter implementations.

The goal is to introduce an application-layer seam so the TUI never sees
concrete adapters.

## Design

### Adapter descriptor

Each adapter type declares its kind and the configuration it needs:

```typescript
type AdapterKind = "echo-fixture" | "git-warp";

type AdapterConfig =
  | { kind: "echo-fixture" }
  | { kind: "git-warp"; repoPath: string; graphName: string };
```

### Registry function

A single async function resolves a config into a ready adapter:

```typescript
async function resolveAdapter(config: AdapterConfig): Promise<TtdHostAdapter>
```

This function lives at the application layer (`src/app/adapterRegistry.ts`),
not in the TUI or the adapters themselves. It is the only place that imports
concrete adapter classes and host infrastructure.

### Why a function, not a class

There is no registry state to manage — no caching, no lifecycle, no
deregistration. A plain function is the narrowest seam that satisfies the
dependency inversion. If registry state becomes necessary later (e.g.,
connection pooling), promote to a class then.

### TUI changes

The TUI imports only:
- `TtdHostAdapter` (the port type)
- `AdapterConfig` and `AdapterKind` (descriptor types)
- `resolveAdapter` (the registry function)

It never imports `EchoFixtureAdapter`, `GitWarpAdapter`, `WarpCore`,
`GitGraphAdapter`, `Plumbing`, or any host infrastructure.

### Head ID convention

The echo fixture adapter uses `head:main`. The git-warp adapter uses
`head:default`. The registry should normalize this: each adapter declares
its default head ID.

The `resolveAdapter` return type extends to include the default head:

```typescript
type ResolvedAdapter = {
  adapter: TtdHostAdapter;
  defaultHeadId: string;
};
```

## Key files

- `src/app/adapterRegistry.ts` — new, the registry function
- `src/tui/main.ts` — modified, imports only the port + registry
- `test/adapterRegistry.spec.ts` — new, tests the seam for both adapter types

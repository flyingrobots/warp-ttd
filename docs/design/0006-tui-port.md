# 0006 — TUI Port from warp-lens

**Status:** implemented
**Cycle:** pre-cycle (adapter/TUI sprint)

## Context

warp-lens had a working bijou v3.0 TUI with TEA architecture, connection
wizard, wave/DAG shaders, and worker threads for git-warp queries. warp-ttd
supersedes warp-lens as the debugger product, so the TUI was ported here and
rewritten against TTD's protocol (not warp-lens's `WarpClientPort`).

## Decisions

### Bijou v4 from npm

Dependencies come from npm (`@flyingrobots/bijou@^4.0.0` and siblings), not
local file refs. This makes the repo self-contained and reproducible.

### v3 → v4 API changes applied

- `view()` / `render()` returns `Surface | LayoutNode`, not strings.
- `boxSurface()` replaces `boxV3()`.
- `vstackSurface()` / `hstackSurface()` for surface-native layout.
- Shader overrides use `overrideChar` / `overrideCell` / `overrideRole`.
- `surfaceToString()` is only used at the final output boundary, not from
  render functions.

### Three-page framed app

| Page | Purpose |
|------|---------|
| Connect | Adapter picker: echo fixture or git-warp repo path |
| Navigator | Frame stepping, lane views, receipt summaries |
| Inspector | Host info, lane catalog, detailed receipt breakdown |

### What was ported vs. rewritten vs. dropped

**Ported** (same math, v4 API):
- `bgShader.ts` — Sea of Provenance wave shader
- `dagShader.ts` — branching worldline DAG shader

**Rewritten** (different domain model):
- Connection page — picks `TtdHostAdapter`, not `WarpClientPort`
- Navigator — shows TTD frames/lanes/receipts, not warp-lens domain models
- Inspector — shows host info + protocol details

**Dropped** (not needed):
- `worker.ts` — async adapter replaces the worker thread pattern
- `Persistence.ts` — connection persistence deferred
- `WarpClientPort` — replaced by `TtdHostAdapter`
- `domain/models/warp.ts` — replaced by `src/protocol.ts` types

### Known boundary violation

The TUI currently imports and constructs `EchoFixtureAdapter` and
`GitWarpAdapter` directly in the render layer. This violates hexagonal
architecture. Scheduled for fix in Cycle C (Hexagonal Cleanup).

## Key files

- `src/tui/main.ts` — entry point and TEA app
- `src/tui/shaders/bgShader.ts` — wave background
- `src/tui/shaders/dagShader.ts` — DAG visualization
- `package.json` — `npm run tui` script

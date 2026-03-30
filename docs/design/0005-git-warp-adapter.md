# 0005 — git-warp Host Adapter

**Status:** implemented
**Cycle:** pre-cycle (adapter/TUI sprint)

## Context

The first protocol slice (0004) proved the data-flow claim with an in-memory
echo fixture adapter. The next step was to bridge a real WARP substrate into
the TTD protocol. git-warp v16 was chosen as the first real adapter target
because it is the most mature JavaScript substrate and the one driving the
debugger's design.

## Decisions

### Async interface

`TtdHostAdapter` methods return `Promise`. git-warp is fundamentally async
(`WarpApp.open`, `materialize`, `discoverWriters` are all Promise-returning).
The alternatives — pre-caching on connect or worker threads — were rejected
because they create cache invalidation problems and unnecessary complexity.
The echo fixture adapter trivially adapts by adding `async` keywords.

### Frame indexing by Lamport tick

Frames are indexed by unique Lamport tick values from `TickReceipt` data:

- Frame 0 = empty state (no tick, no receipts).
- Frame N = all receipts at the Nth unique Lamport tick.

Multiple patches at the same Lamport tick (from different writers) are grouped
into the same frame. This is the honest representation — concurrent patches
share a causal epoch.

The frame index is built once from `materialize({ receipts: true })` on
adapter creation. This is a snapshot; it does not auto-refresh on new patches.

### Receipt mapping

TTD `ReceiptSummary` is derived from git-warp `TickReceipt`:

| TTD field | git-warp source |
|-----------|-----------------|
| `receiptId` | `receipt:gw:` + patchSha prefix |
| `laneId` | `wl:live` (all receipts on the live worldline) |
| `inputTick` | Previous frame's tick (0 for frame 1) |
| `outputTick` | Current frame's tick |
| `admittedRewriteCount` | Count of ops with `result === "applied"` |
| `rejectedRewriteCount` | Count of ops with `result === "superseded"` |
| `counterfactualCount` | Count of ops with `result === "redundant"` |
| `digest` | patchSha |

### Lane catalog

- The live frontier worldline is always present as `wl:live` (read-only).
- Strands from `listStrands()` are mapped to `working-set` lanes with
  `ws:` prefix. Their writability reflects `strand.overlay.writable`.

### Structural typing for WarpCore

The adapter defines a `WarpCoreLike` structural type instead of importing the
`WarpCore` class directly. This keeps the adapter testable against any
compatible implementation.

## Test fixture library

`test/helpers/gitWarpFixture.ts` creates temporary git-warp repos in `/tmp`:

- `createFixture(label, graphName, writerId)` — bare minimum setup
- `scenarioLinearHistory()` — single writer, two patches (alice adds nodes)
- `scenarioMultiWriter()` — two writers with concurrent patches at the same
  Lamport tick

All fixtures auto-clean via `fixture.cleanup()`.

## Key files

- `src/adapter.ts` — async `TtdHostAdapter` interface
- `src/adapters/gitWarpAdapter.ts` — the adapter implementation
- `test/helpers/gitWarpFixture.ts` — test fixture library
- `test/gitWarpAdapter.spec.ts` — 9 tests covering the full protocol surface

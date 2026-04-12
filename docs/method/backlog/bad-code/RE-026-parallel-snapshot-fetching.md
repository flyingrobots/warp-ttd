# RE-026 — Parallel Snapshot Fetching

Legend: [RE — Runtime Engine](../../legends/RE-runtime-engine.md)

## Idea

The `DebuggerSession.fetchSnapshot` method currently performs six sequential asynchronous calls to the host adapter (`playbackHead`, `frame`, `receipts`, `effectEmissions`, `deliveryObservations`, `executionContext`). In high-latency environments (e.g. over an MCP bridge or a remote network), this sequential tax results in a sluggish investigator experience.

Refactor `fetchSnapshot` to use `Promise.all()` for concurrent adapter calls. This ensures that the latency of a session update is bound by the slowest single port call rather than the sum of all six.

## Why

1. **Investigator Responsiveness**: Significantly reduces "Time to First Frame" when stepping through worldlines.
2. **Protocol Efficiency**: Better utilizes the concurrency capabilities of the transport layer.
3. **Scalability**: Prepares the debugger for higher-aperture investigations with even more observation ports.

## Effort

Small — refactor `fetchSnapshot` in `src/app/debuggerSession.ts` to use settled concurrency.

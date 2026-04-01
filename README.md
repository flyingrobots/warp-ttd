# WARP TTD

Cross-host time-travel debugger and wide-aperture observer for
deterministic graph systems built on WARP.

## What It Is

TTD observes substrate facts honestly — worldlines, receipts, effects,
provenance — and, when the host declares the capability, drives
explicit debugging controls: pause, step, seek, fork, speculative
ticking, comparison, and multi-strand composition.

It works across hosts. The same debugger protocol serves git-warp,
Echo, and future WARP-based runtimes through host adapters.

**The invariant:** canonical history is never silently rewritten.
Every continuation from the past is explicit, capability-gated, and
provenance-bearing.

## What It Does

### Observe

- Step forward and backward through worldline ticks
- Inspect receipts: admitted rewrites, rejected counterfactuals
- Inspect effect emissions and delivery observations (delivered,
  suppressed, failed, skipped)
- See execution context (live, replay, debug)

### Control

- Pause, step, seek to any tick
- Fork strands from any point in history
- Tick speculative strands independently
- Compare strands against base worldlines

### Inspect (planned)

- **Worldline Viewer** — git-log-like view of ticks and strands
- **Graph Viewer** — full materialized graph at any tick (nodes,
  edges, properties, attachments)
- **Provenance Viewer** — select any value and trace its reverse
  causal cone through the receipt chain

See [VISION.md](docs/VISION.md) for the full architecture and
design philosophy.

## Quick Start

```sh
npm install
```

### TUI

```sh
npm run tui
```

Select an adapter from the connect page:

- **Echo Fixture** — built-in demo data
- **git-warp** — point at a local repository with an existing graph
- **Scenario fixtures** — contrived scenarios for effect emissions,
  replay suppression, and multi-writer conflicts

Navigate with `n`/`→` (forward), `p`/`←` (backward), `g` (jump to
tick), `d` (disconnect), `[`/`]` (switch pages).

### CLI

```sh
npm run demo          # full protocol walkthrough
npm run hello         # host handshake
npm run catalog       # lane catalog
npm run frame         # current frame + receipts
npm run step          # step forward
```

Every command supports `--json` for structured JSONL output:

```sh
node --experimental-strip-types ./src/cli.ts hello --json
node --experimental-strip-types ./src/cli.ts effects --json
node --experimental-strip-types ./src/cli.ts deliveries --json
node --experimental-strip-types ./src/cli.ts context --json
```

### Tests

```sh
npm test                 # fast suite (45 tests)
npm run test:integration # git-warp integration (10 tests)
```

## Architecture

```text
Delivery Adapters (CLI, TUI, MCP, Web)
  → TTD Application Core
    → TTD Ports (TtdHostAdapter)
      → Host Adapters (echo fixture, git-warp, scenario fixture)
        → WARP Substrates (git-warp, Echo)
```

Key concepts:

- **Worldline** — causal history (not a timeline)
- **Tick** — Lamport clock value on a worldline
- **Strand** — speculative causal lane (durable, forkable)
- **Aperture** — what an observer preserves/projects
- **Receipt** — per-operation provenance from a materialized tick
- **Effect emission** — substrate fact that something was produced
- **Delivery observation** — what happened to an effect at each sink
- **PlaybackHead** — substrate-facing coordination primitive
- **DebuggerSession** — required foundation for speculative
  investigation (next abstraction)

## Documents

- [**VISION.md**](docs/VISION.md) — north star: what TTD is, how it
  thinks, where it's going
- [**CONTRIBUTING.md**](CONTRIBUTING.md) — development doctrine, cycle
  loop, playback workflow, lint ratchet
- [**BACKLOG.md**](BACKLOG.md) — cycle history and upcoming work

Cycle design docs and retrospectives: `docs/cycles/`
Wesley schema: `schemas/warp-ttd-protocol.graphql`

## Dependencies

- **Runtime:** `@git-stunts/git-warp` ^16.0.0, `@git-stunts/plumbing`
  ^2.8.0
- **TUI:** `@flyingrobots/bijou` ^4.0.0 (bijou-tui, bijou-node)
- **Build:** TypeScript with `--experimental-strip-types` (no build
  step)
- **Test:** Node.js built-in test runner
- **Schema:** Wesley (`compile-ttd`)

## License

Apache 2.0. See [LICENSE](LICENSE).

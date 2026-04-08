![WARP-TTD-ember](https://github.com/user-attachments/assets/5b0558ff-9d5a-4d0f-a3b4-b33c1df6f186)

![WARP-TTD-matrix](https://github.com/user-attachments/assets/2504ff8b-68e5-430b-90e1-9879d5a3de7e)

![WARP-TTD-ocean](https://github.com/user-attachments/assets/1cf52af7-9209-4542-920b-6cb864937f6f)

![WARP-TTD-pastel](https://github.com/user-attachments/assets/d1660d6e-394a-497a-8c7d-e320a15c22a1)

![WARP-TTD-rainbow](https://github.com/user-attachments/assets/485d9621-089d-4190-8d03-89424fce7046)

![WARP-TTD-sunset](https://github.com/user-attachments/assets/de82942f-6e0c-4a6d-ab5d-3582b64a6a26)

![WARP-TTD](https://github.com/user-attachments/assets/ab986977-e298-43ec-8f37-57eaae488864)


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
- Inspect receipts: who wrote what, admitted rewrites, rejected
  counterfactuals
- Inspect effect emissions and delivery observations (delivered,
  suppressed, failed, skipped)
- See execution context (live, replay, debug)
- Pin observations to compare across frames

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

See [VISION.md](VISION.md) for the full architecture and
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
frame), `P` (pin observation), `u` (unpin), `d` (disconnect),
`[`/`]` (switch pages).

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
npm test                 # fast suite (148 tests)
npm run test:integration # git-warp integration (10 tests)
```

## Protocol

The host-neutral TTD protocol is defined as a single GraphQL schema:

```
schemas/warp-ttd-protocol.graphql   (v0.2.0)
```

If you're building a host adapter (Echo, git-warp, or your own), this
schema is your input. Feed it to Wesley's `compile-ttd` path to generate
typed contracts for your target language — TypeScript, Rust WASM, or
whatever Wesley supports.

`src/protocol.ts` is a local convenience mirror for this repo's
application code. It follows the schema — it does not own it. Adapter
code, fixture data, and TUI layout are likewise local policy, not
shared contract.

**Rule:** protocol changes start in the `.graphql` file. Everything
else follows.

## Architecture

```text
Delivery Adapters (CLI, TUI, MCP, Web)
  → DebuggerSession (investigation state, pins)
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
- **DebuggerSession** — app-layer investigation state: wraps a
  playback head, manages snapshot + pinned observations

## Documents

- [**VISION.md**](VISION.md) — north star: what TTD is, how it
  thinks, where it's going
- [**METHOD.md**](METHOD.md) — how work moves from idea to shipped code
- [**CONTRIBUTING.md**](CONTRIBUTING.md) — quickstart, rules, and links
  to [doctrine](docs/design/doctrine.md),
  [glossary](docs/design/glossary.md),
  [process](docs/method/process.md), and
  [release](docs/method/release.md)

Design docs: `docs/design/`
Retrospectives: `docs/method/retro/`
Backlog: `docs/method/backlog/`
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

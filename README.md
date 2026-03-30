# WARP TTD

Cross-host Time Travel Debugger for WARP systems.

## What It Is

TTD is a human-facing debugger product for deterministic graph systems built
on WARP-like causal history. It observes worldlines, materializes frames,
surfaces receipts, and makes conflicts and counterfactuals inspectable.

TTD works across hosts. The same debugger protocol serves git-warp, Echo, and
future WARP-based runtimes through host adapters.

## Current Capability

- **Protocol:** finite envelope set — `HostHello`, `LaneCatalog`,
  `PlaybackHeadSnapshot`, `PlaybackFrame`, `ReceiptSummary`
- **Adapters:** echo fixture (in-memory demo data) and git-warp v16 (real
  git-backed graphs)
- **TUI:** fullscreen terminal debugger with three pages (Connect, Navigator,
  Inspector), wave shader background, DAG visualization
- **CLI:** dumb client for protocol inspection (`hello`, `catalog`, `frame`,
  `step`, `demo`)
- **Tests:** 17 spec tests (7 fast + 10 integration)

## Quick Start

```sh
npm install
```

### TUI

```sh
npm run tui
```

Select "Echo Fixture" for built-in demo data, or "git-warp" to point at a
local repository with an existing warp graph.

### CLI

```sh
npm run demo      # full protocol walkthrough
npm run hello     # host handshake
npm run catalog   # lane catalog
npm run frame     # current frame + receipts
npm run step      # step forward
```

### Tests

```sh
npm test                 # fast suite (echo fixture)
npm run test:integration # git-warp integration (creates temp repos)
```

## Architecture

TTD follows hexagonal architecture:

```text
Delivery Adapters (CLI, TUI)
  → TTD Application Core
    → TTD Ports (TtdHostAdapter)
      → Host Adapters (echo fixture, git-warp)
        → WARP Substrates
```

Key domain concepts:

- **PlaybackHead** — substrate-facing coordination primitive
- **DebuggerSession** — human-facing debugger object (planned, Cycle E)
- **Frame** — composite snapshot across tracked lanes at a point in time
- **Receipt** — per-operation provenance from a materialized tick
- **Lane** — worldline (read-only history) or working-set (speculative)

## Design Documents

- [0001 — Why warp-ttd](docs/design/0001-why-warp-ttd.md)
- [0002 — Wesley Schema Profile](docs/design/0002-wesley-schema-profile.md)
- [0003 — Shared Schema Strategy](docs/design/0003-shared-schema-strategy.md)
- [0004 — TTD Protocol Surface](docs/design/0004-ttd-protocol-surface.md)
- [0005 — git-warp Adapter](docs/design/0005-git-warp-adapter.md)
- [0006 — TUI Port](docs/design/0006-tui-port.md)
- [0007 — Adapter Registry](docs/design/0007-adapter-registry.md)

## Roadmap

See [BACKLOG.md](BACKLOG.md) for the current cycle sequence.

## Dependencies

- **Runtime:** `@git-stunts/git-warp` ^16.0.0, `@git-stunts/plumbing` ^2.8.0
- **TUI:** `@flyingrobots/bijou` ^4.0.0 (bijou-tui, bijou-tui-app, bijou-node)
- **Build:** TypeScript with `--experimental-strip-types` (no build step)
- **Test:** Node.js built-in test runner

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0. See [LICENSE](LICENSE).

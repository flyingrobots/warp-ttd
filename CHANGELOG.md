# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project will use [Semantic Versioning](https://semver.org/) starting at
`0.1.0` with the first cycle release (Cycle B — Protocol Freeze).

## [Unreleased]

### Added

- **Async `TtdHostAdapter` interface** — all six adapter methods return
  `Promise`, enabling real async host backends.
- **git-warp host adapter** (`src/adapters/gitWarpAdapter.ts`) — bridges
  WarpCore v16 into the TTD protocol. Frames indexed by Lamport tick,
  receipts derived from `TickReceipt` per-operation outcomes, lanes from
  worldlines and strands.
- **Test fixture library** (`test/helpers/gitWarpFixture.ts`) — creates
  temporary git-warp repos in `/tmp` with contrived scenarios
  (`scenarioLinearHistory`, `scenarioMultiWriter`).
- **TUI** (`src/tui/main.ts`) — fullscreen terminal debugger ported from
  warp-lens, upgraded to bijou v4. Three pages: Connect (adapter picker),
  Navigator (frame stepping + lane views), Inspector (host info + receipt
  detail). Sea of Provenance wave shader and DAG shader.
- **Cycle backlog structure** — individual cycle proposals in `docs/backlog/`
  with sponsor framing, hills, playback questions per CONTRIBUTING.md.
- **Design docs** — 0005 (git-warp adapter decisions), 0006 (TUI port
  decisions).

### Changed

- `TtdHostAdapter` methods are now async (previously synchronous).
- Echo fixture adapter methods are now async (no behavioral change).
- CLI uses `await` for all adapter calls.
- All test callbacks are now `async`.

## [0.0.0] — 2026-03-26

### Added

- Initial repo extraction from cross-repo design work.
- Architecture and design documents (0001–0004).
- Hexagonal architecture RFC, invariants, Wesley/GraphQL strategy.
- Handwritten protocol types (`src/protocol.ts`).
- `TtdHostAdapter` interface (`src/adapter.ts`).
- Echo fixture adapter with fixed-state data.
- Dumb CLI client (`demo`, `hello`, `catalog`, `frame`, `step`).
- 5 spec tests for echo fixture adapter.
- CONTRIBUTING.md with full development doctrine.

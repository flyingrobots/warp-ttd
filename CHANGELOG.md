# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project will use [Semantic Versioning](https://semver.org/) starting at
`0.1.0` with the first cycle release (Cycle B — Protocol Freeze).

## [Unreleased]

### Added

- **METHOD.md** — formal specification of the cycle-based development
  system. Filesystem-native backlog with priority lanes (`asap/`,
  `up-next/`, `cool-ideas/`, `bad-code/`), legends for named domains,
  graveyard for rejected ideas.

### Changed

- **docs/ restructure** — design docs moved to `docs/design/<cycle>/`,
  retrospectives to `docs/method/retro/<cycle>/`, backlog to
  `docs/method/backlog/` with priority subdirectories. Root `BACKLOG.md`
  removed (filesystem is the index). `VISION.md` moved to repo root.
  Foundational architecture docs promoted to `docs/design/` root.
  Completed backlog items archived to `docs/method/graveyard/`.
- **CONTRIBUTING.md** — thinned out, cross-references updated to new
  docs/ paths.
- **ALL_CAPS convention** — signpost docs (`README.md`, `VISION.md`,
  `METHOD.md`, `CONTRIBUTING.md`) live at root or `docs/`, never
  deeper.

### Added (prior)

- **Navigator redesign** — position bar, lane tree with depth-first
  pre-order, horizontal receipt/effect split, capability-driven
  section states, row budgets, truncation. Extracted to testable
  navigatorLayout module (29 tests). Lint ceiling 117 → 110.
- **DebuggerSession** — app-layer domain object wrapping
  TtdHostAdapter. Manages navigation, snapshot state, and pinned
  observations. TUI refactored to consume sessions. CLI `session
  --json` command. Lint ceiling dropped from 140 to 117.
- **writerId on ReceiptSummary** — optional `writerId` field shows
  who wrote each receipt. Wired through git-warp, echo, and scenario
  adapters. TUI receipts table includes Writer column.
- **Canonical glossary** (`docs/glossary.md`) — 11 domain terms with
  frame-vs-tick decision. Contract test pins required terms.
- **CONTRIBUTING.md restructured** — split into practical front door
  + linked docs: `docs/doctrine.md`, `docs/glossary.md`,
  `docs/cycle-process.md`, `docs/release.md`.

### Previous (effect emission cycle)

- **Effect emission & delivery observation protocol** — new envelope
  types: `EffectEmissionSummary`, `DeliveryObservationSummary`,
  `ExecutionContext`. Closed `DeliveryOutcome` enum (delivered,
  suppressed, failed, skipped). `ExecutionMode` (live, replay, debug).
- **ScenarioFixtureAdapter** — declarative test fixture builder.
  3 built-in scenarios: live-with-effects, replay-with-suppression,
  multi-writer-conflicts.
- **Navigation** — `stepBackward`, `seekToFrame` adapter methods.
  TUI: `p`/`←` step back, `g` jump-to-frame prompt.
- **CLI commands** — `effects`, `deliveries`, `context` with `--json`.
- **Wesley schema** — `schemas/warp-ttd-protocol.graphql` covering
  full protocol surface with registry IDs, codecs, invariants.
- **Custom error classes** — zero raw `Error()` throws in `src/`.
- **Auto-ratcheting lint ceiling** — `lint-check.sh` auto-lowers
  ceiling when under budget. Pre-push hook enforces.
- **TUI tables** — bijou `tableSurface` for Receipts and Effects.
  Scenario fixtures selectable from connect page.

### Changed

- **Capabilities** — new: `read:effect-emissions`,
  `read:delivery-observations`, `read:execution-context`,
  `control:step-backward`, `control:seek`.

## [0.1.0] — 2026-03-30

Protocol freeze release. The read-only TTD protocol is frozen at v0.1.0.

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
  decisions), 0007 (adapter registry).
- **Adapter registry** (`src/app/adapterRegistry.ts`) — application-layer
  seam for adapter construction. TUI no longer imports concrete adapters.
  *(Cycle C)*
- **Default head ID convention** — each adapter declares its default head
  ID through the registry. *(Cycle C)*

- **CLI `--json` flag** — every command (`hello`, `catalog`, `frame`,
  `step`, `demo`) produces structured JSONL output with envelope fields.
  *(Cycle B)*
- **Protocol contract tests** — 5 tests pin v0.1.0 envelope shapes; 6
  tests pin `--json` JSONL output format. *(Cycle B)*
- **Design doc 0008** — protocol freeze specification. *(Cycle B)*

### Changed

- **LaneKind `"working-set"` renamed to `"strand"`** — aligns with
  official git-warp terminology.
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

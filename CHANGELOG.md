# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project will use [Semantic Versioning](https://semver.org/) starting at
`0.1.0` with the first cycle release (Cycle B — Protocol Freeze).

## [Unreleased]

### Added

- **Continuum target discovery contract**: `targets --json`,
  `target-session --json`, and `warp_ttd.inspect_live_targets` now inspect
  descriptor-backed Continuum-compatible targets. `jedit` and `graft` remain
  default witness descriptors, while synthetic descriptor-only targets can be
  reported without adding app-specific debugger code. Target labels, connection
  modes, capabilities, and evidence posture are structured facts; app names and
  runtime substrates are not dispatch boundaries.
- **Echo adapter probe boundary**: `targets --json`,
  `target-session --json`, and `warp_ttd.inspect_live_targets` now expose
  `jedit.echoAdapterProbe`, a read-only descriptor probe that distinguishes
  missing root, absent bridge, supported bridge, unsupported ABI, and obstructed
  descriptor without opening an Echo session, issuing authority, admitting, or
  mutating `jedit`.
- **Wesley-generated Echo family consumer**: `jedit.sessionFamilyIntake` now
  reports `generatedFamilyConsumption` posture for manifest-declared
  Continuum Echo inspect artifacts. Agents can distinguish
  `GENERATED_FAMILY_PRESENT`, `GENERATED_FAMILY_UNAVAILABLE`, and
  `LOCAL_MIRROR_FALLBACK` without executing generated modules, opening an Echo
  session, issuing authority, admitting, or mutating `jedit`.
- **Admission-chain read model**: started cycle 0024 with a versioned
  `warp-ttd.admission-chain.v1` read model behind
  `warp_ttd.inspect_admission_chain` and `admission-chain --json`. MCP and CLI
  output now include a canonical ordered `facts` list while preserving existing
  named admission-chain fields.
- **MCP agent parity design**: added cycle 0022 design packet defining missing
  MCP parity against CLI/TUI, proposed API tools, examples, Mermaid diagrams,
  and versioned `warp-ttd.mcp.v1` JSON output schemas.
- **Continuum operator surface design**: added cycle 0023 design packet for
  near-future MCP and TUI support around runtime-boundary families, reading
  envelopes, evidence status, and witnessed suffix sync, including SVG TUI
  mockups.
- **Live target smoke inspection**: added `targets --json` / `npm run targets`
  to report read-only posture for `jedit` as the live Echo app and `graft` as
  the live git-warp app. The command records root presence, adapter readiness,
  graft's `graft-ast` graph name, and explicit unavailable admission-chain
  posture without attaching, admitting, granting, creating strands, or mutating.
- **Runtime-boundary evidence posture**: `targets --json` and
  `warp_ttd.inspect_live_targets` now report `runtimeBoundaryEvidence` for each
  live target. `graft` is marked as translated substrate evidence from
  `git-warp` with `nativeContinuumWitness: false`; `jedit` remains unavailable
  until Echo publishes native Continuum evidence.
- **MCP admission-chain surface** (cycle 0019, initial) — read-only MCP stdio
  server using the official MCP TypeScript SDK. Adds inspection tools for
  session state, adapter capabilities, readings, and admission-chain posture.
  Missing artifact, grant, ticket, and witness facts are explicit `ABSENT`
  posture. Concurrent first inspections share one session initialization. No
  grants, admission, mutation, or strand creation.
- **Worldline view rethink** (cycle 0014) — split-view worldline page
  with lane tree on the left and per-lane tick timeline on the right.
  `filterFramesToLane` scopes frame data to a single lane.
  `buildLaneTreeLines` renders lane hierarchy with tree connectors.
  Backward compatible — legacy view preserved when no lane selected.
  Narrow terminals collapse to single-pane timeline. 16 new tests (164 total).
- **Bijou app frame migration** (cycle 0013) — per-page models,
  updates, and keymaps. Command palette, help viewer, quit modal
  unlocked. Cross-page session sync. Default to latest tick on
  connect. main.ts: 690 → 96 lines. Lint ratchet: 124 → 60.
- **Lane graph renderer** (cycle 0012, partial) — colored lane rails,
  fork connectors, worldline/strand distinction, tick line cleanup.
  14 tests. View model rethink deferred — global frame ordering
  doesn't represent independent lane ticking.
- **Protocol publication boundary** (cycle 0011) — README Protocol
  section naming the authored schema, its version, Wesley compile path,
  and local-mirror distinction. 7 boundary tests pinning
  discoverability and mirror↔schema alignment.
- **Worldline viewer** (cycle 0010, partial) — `worldlineLayout`
  pure rendering module, `worldline --json` CLI command, TUI page
  with scroll and jump-to-tick. 28 tests. Complex scenario fixture
  (200 ticks, 5 lanes, 4 writers). Lane graph renderer deferred.
- **METHOD.md** — formal specification of the cycle-based development
  system. Filesystem-native backlog with priority lanes (`asap/`,
  `up-next/`, `cool-ideas/`, `bad-code/`, `inbox/`), legends for
  named domains, graveyard for rejected ideas.

### Changed

- **MCP parity obstruction vocabulary**: proposed MCP playback obstruction
  outputs now use `missingAdapterCapability` and reserve `CapabilityGrant` /
  `CapabilityPresentation` language for authority facts. Playback control
  obstruction is modeled as a `PlaybackControlResult` variant instead of a
  separate result schema. The acceptance checklist now requires the
  capability-vocabulary regression guard explicitly.
- **Agent doctrine capability vocabulary**: top-level agent-first docs now avoid
  ambiguous lowercase capability phrasing for adapter support, using
  `AdapterCapability`, `CapabilityPresentation`, or explicit authority/admission
  language instead.
- **Agent doctrine explicitness vocabulary**: project doctrine now maps
  admission-chain visible facts back to BEARING's canonical agent-surface
  obligations: absence, authority, admission, mutation, and evidence posture.
- **Agent-native doctrine**: AGENTS, METHOD, BEARING, MCP, CLI, and project
  doctrine now require agent-first MCP/CLI/read-model surfaces before TUI or
  browser implementation for Continuum app debugging.
- **Live debugger target**: named `jedit` as the live Echo app target and
  `graft` as the live git-warp app target. The next delivery proof is a single
  debugger surface that can inspect both without becoming either app's domain
  model.
- **Cycle bearing**: closed the initial MCP admission-chain surface delivery
  backlog and promoted the admission-chain read model as the next target. The
  next work is protocol/read-model representation of registration, grant,
  ticket, witness, receipt, and reading-envelope facts, not strand mutation.
- **Lint ratchet**: Cleared the remaining structural ESLint debt in the TUI
  shell, CLI, adapter registry, scenario fixture, and test helpers. The lint
  ceiling is now zero; both `npm run lint` and `npm run lint:check` are clean.
- **Protocol boundary**: `EffectKind` removed from protocol mirror — port types
  are now plain data (strings). Dead `EffectKind` class deleted entirely.
- **Neighborhood assembler**: Extracted `buildNeighborhoodState` from
  `DebuggerSession` to standalone `neighborhoodAssembler.ts` (SRP).
- **Worldline loading**: Deduplicated between page and shell — single loader in
  `sessionSync.ts`, removed divergent cursor-reset path in `worldlinePage.ts`.
- **Worldline focus sync**: `syncSiteDrivenWorldlineFocus` now guarded by
  `shouldResyncWorldlineFocus` — only runs when frame index or site selection
  changes, not on every message (cursor keys, pulse).
- **DRY**: Extracted `requireNonEmpty`/`uniqueStrings` to shared `validate.ts`.
- **Test quality**: Replaced source-grep arch tests with ESLint boundary rules.
  Fixed tautological assertions, writable fixture inversion, JSON round-trip
  tautologies. Added missing test preconditions and fixtures.

### Fixed

- **Live target evidence posture isolation**: repeated live-target inspections
  now return fresh runtime-boundary evidence facts so an in-process consumer
  cannot mutate one result and contaminate later inspections.
- **CLI flags**: Unknown flags now fail even when no positional command is
  provided; the default `demo` command no longer bypasses flag validation.
- **Connect flow handshake**: the TUI connect page now reuses the
  `DebuggerSession` HostHello when building session context instead of calling
  `adapter.hello()` a second time.
- **Scenario fixture sparse frames**: sparse frame holes are skipped while
  preserving explicit frame indexes, matching the original fixture builder
  behavior.
- **DebuggerSession capability handshakes**: host adapter capabilities are now
  cached at session creation and reused across navigation refreshes, avoiding
  repeated `hello()` calls on every step/seek.
- **Publication boundary spec**: Tests now check correct documentation files
  after README restructuring. Protocol version added to README.
- **Effect emission extractor**: Malformed effect nodes (missing/empty kind)
  are now silently skipped instead of throwing, preventing single bad nodes
  from breaking entire frame inspection.
- **Effect emission cache**: Per-frame emission cache in git-warp adapter
  eliminates O(n²) re-materialization when browsing multiple frames.
- **Dead code cleanup**: Removed unused `worldlineIdByLaneId`,
  `syncWorldlineCursor`, `syncWorldlineSelection`, and related helpers.
- **buildAnchors**: Primary lane no longer double-reported as both
  `PRIMARY_LANE` and `PARTICIPATING_LANE`.
- **sameNeighborhoodFocus**: Replaced `JSON.stringify` equality with
  field-by-field comparison (hot loop performance).

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

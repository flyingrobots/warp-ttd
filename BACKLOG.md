# BACKLOG

Cycle proposals live in [`docs/backlog/`](docs/backlog/). Each file is a
self-contained cycle with sponsor framing, hill, playback questions, and
scope. See [CONTRIBUTING.md](CONTRIBUTING.md#keep-a-backlog) for the
lifecycle rules.

## Completed (pre-cycle)

- [x] carve out `warp-ttd` as its own repo
- [x] capture the first architecture/docs set
- [x] define the first narrow protocol slice
- [x] build echo fixture adapter and dumb CLI client
- [x] add tests that act as the spec for the current slice
- [x] extract a first retrospective for the protocol spike
- [x] make `TtdHostAdapter` async
- [x] add git-warp host adapter (first real adapter)
- [x] port TUI from warp-lens (bijou v4)

## Active Sequence

Cycles are ordered by dependency: clear debt → clean architecture →
freeze protocol → fix vocabulary → fill protocol gaps → human UX →
design layout → speculation → core views → capstone.

| Order | Cycle | Status | File |
|-------|-------|--------|------|
| 1 | A — Housekeeping & Reality Sync | closed | [A-housekeeping-reality-sync.md](docs/backlog/A-housekeeping-reality-sync.md) |
| 2 | C — Hexagonal Cleanup | closed | [C-hexagonal-cleanup.md](docs/backlog/C-hexagonal-cleanup.md) |
| 3 | B — Protocol Freeze | closed | [B-protocol-freeze.md](docs/backlog/B-protocol-freeze.md) |
| 4 | Effect Emission | closed | [0009-effect-emission-protocol.md](docs/cycles/0005-effect-emission/design/0009-effect-emission-protocol.md) |
| 5 | Design Vocabulary | closed | [design-vocabulary.md](docs/backlog/design-vocabulary.md) |
| 6 | writerId on ReceiptSummary | closed | [receipt-writer-field.md](docs/backlog/receipt-writer-field.md) |
| 7 | E — DebuggerSession | closed (partial) | [E-debugger-session.md](docs/backlog/E-debugger-session.md) |
| 8 | Navigator View Design | closed | [navigator-view-design.md](docs/backlog/navigator-view-design.md) |
| 9 | D — Strand & Speculation | queued (next) | [D-strand-speculation.md](docs/backlog/D-strand-speculation.md) |
| 10 | Core Views | queued | [core-views.md](docs/backlog/core-views.md) |
| 11 | Counterfactual Inspection | queued | [counterfactual-inspection.md](docs/backlog/counterfactual-inspection.md) |

## Ongoing

| Policy | File |
|--------|------|
| Lint Ratchet — 30% reduction per cycle | [lint-ratchet.md](docs/backlog/lint-ratchet.md) |

## Queued (unscheduled)

| Item | File |
|------|------|
| Pin Design — observation watch & comparison | [pin-design.md](docs/backlog/pin-design.md) |

## Seeds (not commitments)

| Item | File |
|------|------|
| Cool Ideas (Effect Slice) | [cool-ideas-effect-slice.md](docs/backlog/cool-ideas-effect-slice.md) |
| Cool Ideas (Braille Rendering) | [cool-ideas-braille-rendering.md](docs/backlog/cool-ideas-braille-rendering.md) |

## Deferred

- [ ] Wesley / GraphQL schema formalization
- [ ] Echo real host adapter (WebSocket/CBOR)
- [ ] MCP delivery adapter
- [ ] Browser/web delivery adapter

## Risks To Watch

- GraphQL ecosystem creep into trusted semantics
- schema over-unification too early
- TTD scope creep into execution/orchestration ownership
- confusing compile-time footprint enforcement with full correctness proof

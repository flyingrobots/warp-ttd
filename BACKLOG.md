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

Cycles are ordered by dependency, not alphabetically: clear debt → clean
architecture → freeze protocol → human UX → speculation.

| Order | Cycle | Status | File |
|-------|-------|--------|------|
| 1 | A — Housekeeping & Reality Sync | closed | [A-housekeeping-reality-sync.md](docs/backlog/A-housekeeping-reality-sync.md) |
| 2 | C — Hexagonal Cleanup | closed | [C-hexagonal-cleanup.md](docs/backlog/C-hexagonal-cleanup.md) |
| 3 | B — Protocol Freeze | closed | [B-protocol-freeze.md](docs/backlog/B-protocol-freeze.md) |
| 4 | E — DebuggerSession | queued (next) | [E-debugger-session.md](docs/backlog/E-debugger-session.md) |
| 5 | D — Strand & Speculation | queued | [D-strand-speculation.md](docs/backlog/D-strand-speculation.md) |

## Ongoing

| Policy | File |
|--------|------|
| Lint Ratchet — 30% reduction per cycle | [lint-ratchet.md](docs/backlog/lint-ratchet.md) |

## Queued (unscheduled)

| Item | File |
|------|------|
| Core Views (Worldline, Graph, Provenance) | [core-views.md](docs/backlog/core-views.md) |
| Navigator View Design | [navigator-view-design.md](docs/backlog/navigator-view-design.md) |
| Add writerId to ReceiptSummary | [receipt-writer-field.md](docs/backlog/receipt-writer-field.md) |
| Counterfactual Inspection & Strand Forking | [counterfactual-inspection.md](docs/backlog/counterfactual-inspection.md) |
| Design Vocabulary | [design-vocabulary.md](docs/backlog/design-vocabulary.md) |
| Cool Ideas (Effect Slice) | [cool-ideas-effect-slice.md](docs/backlog/cool-ideas-effect-slice.md) |

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

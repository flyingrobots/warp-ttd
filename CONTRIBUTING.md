# Contributing to `warp-ttd`

## Quickstart

```bash
pnpm install
pnpm test
pnpm typecheck
bash scripts/lint-check.sh
git config --local core.hooksPath scripts/hooks
```

If those all pass, you're ready.

## Non-Negotiable Rules

1. **Substrate truth is sacred.** If a change makes the debugger less
   honest, less deterministic, more magical, or more host-specific, it
   is probably the wrong change.
2. **Tests are the spec.** Design docs define intent. Tests define
   executable truth. Implementation must satisfy both.
3. **Every CLI command supports `--json`.** Machine-readable output is
   not optional. `stdout` carries JSONL data rows. `stderr` carries
   structured errors.
4. **Do not blur observation and mutation.** TTD observes. It does not
   orchestrate, simulate, or control the host.
5. **No new lint violations.** A lint ceiling is stored in
   `lint-ceiling.txt`. New code must not push the count above it.
   The ceiling drops when a cycle pays lint debt.

## Build Order

1. Write or revise design docs first.
2. Encode behavior as executable tests second.
3. Implement third.

Do not insert a second prose-spec layer between design and tests.

## Testing Rules

Tests must be deterministic:

- no real network dependency
- no ambient host-runtime assumptions
- no hidden dependency on a sibling repo checkout
- no interactive shell expectations
- no timing-based flakes

Tests should pin:

- user-visible debugger behavior
- protocol envelope shapes
- playback/frame stepping behavior
- receipt/provenance surface contracts
- `--json` output contracts for each CLI command

They should not overfit class layout, file-private helpers, or
incidental implementation structure.

Local testing policy:

- `pnpm test` is the default fast suite
- integration suites against real hosts are additive and clearly named
- no host-backed suite should silently replace the default fast suite

## UX Language Rules

Debugger language should stay honest without becoming gratuitously
opaque. See [docs/glossary.md](docs/glossary.md) for the canonical
term list.

Prefer: `frame`, `worldline`, `receipt`, `conflict`, `counterfactual`,
`fork`.

Avoid: fake simplicity that lies about the substrate, host-internal
jargon where the protocol has a clearer concept, vague labels that blur
observation and mutation.

## Git Workflow

Prefer small, honest commits. Prefer additive commits over history
surgery. Prefer merges over rebases unless there is a compelling,
explicitly discussed reason otherwise.

The point is not aesthetic Git history. The point is trustworthy
collaboration.

## Read Before Non-Trivial Changes

Before touching architecture, protocol types, or adapter boundaries:

- [docs/doctrine.md](docs/doctrine.md) — project philosophy,
  architecture, protocol guardrails
- [docs/glossary.md](docs/glossary.md) — canonical domain terminology
- [docs/VISION.md](docs/VISION.md) — north star and current truth
- [BACKLOG.md](BACKLOG.md) — what's planned and sequenced

For maintainers running development cycles:

- [docs/cycle-process.md](docs/cycle-process.md) — cycle design,
  playback, retrospectives, backlog lifecycle
- [docs/release.md](docs/release.md) — release flow and tagging rules

Key design docs:

- [0001 — Why warp-ttd](docs/cycles/0001-bootstrap/design/0001-why-warp-ttd.md)
- [0004 — Protocol surface](docs/cycles/0001-bootstrap/design/0004-ttd-protocol-surface.md)
- [0008 — Protocol freeze](docs/cycles/0004-protocol-freeze/design/0008-protocol-freeze.md)
- [0009 — Effect emission](docs/cycles/0005-effect-emission/design/0009-effect-emission-protocol.md)

## Decision Rule

When in doubt:

- choose narrower protocol surface
- choose more explicit envelopes
- choose stronger determinism
- choose less host leakage
- choose behavior over architecture theater
- keep observation and mutation separate

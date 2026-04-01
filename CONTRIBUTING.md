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
5. **No new lint violations.** The lint ratchet enforces zero errors.
   New code must not introduce regressions.

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
opaque. See [docs/design/glossary.md](docs/design/glossary.md) for
the canonical term list.

## Git Workflow

Prefer small, honest commits. Prefer additive commits over history
surgery. Prefer merges over rebases unless there is a compelling,
explicitly discussed reason otherwise.

## Read Before Non-Trivial Changes

- [VISION.md](VISION.md) — north star and current truth
- [METHOD.md](METHOD.md) — how work moves from idea to shipped code
- [docs/design/doctrine.md](docs/design/doctrine.md) — project
  philosophy, architecture, protocol guardrails
- [docs/design/glossary.md](docs/design/glossary.md) — canonical
  domain terminology

For maintainers running development cycles:

- [docs/method/process.md](docs/method/process.md) — cycle design,
  playback, retrospectives, backlog lifecycle
- [docs/method/release.md](docs/method/release.md) — release flow
  and tagging rules

## Decision Rule

When in doubt:

- choose narrower protocol surface
- choose more explicit envelopes
- choose stronger determinism
- choose less host leakage
- choose behavior over architecture theater
- keep observation and mutation separate

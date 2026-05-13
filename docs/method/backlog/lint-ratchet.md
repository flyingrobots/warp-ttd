# Lint Ratchet — Zero-Tolerance ESLint Convergence

**Status:** complete (now enforced as a zero-lint invariant)

## Policy

ESLint is configured with strict typescript-eslint rules: no `any`, no
`unknown`, explicit return types, custom error classes, complexity limits.
The codebase now complies with the configured lint gate.

A lint error ceiling is enforced. The ratchet has reached zero; future changes
must keep both `npm run lint` and `npm run lint:check` clean.

## Ratchet Schedule

Cycles ordered by planned completion.

| After Cycle | Ceiling |
|-------------|---------|
| (baseline)  | 226     |
| B — Protocol Freeze | 158 |
| E — DebuggerSession | 110 |
| D — Strand & Speculation | 77 |
| (continue)  | 53 → 37 → 25 → 17 → 11 → 7 → 4 → 2 → 0 |
| Cycle 0019 — MCP Admission-Chain Surface | 0 |

## Rules

- The ceiling is stored in `lint-ceiling.txt` at the repo root.
- `npm run lint:check` exits non-zero if the error count exceeds the
  ceiling.
- New code should not introduce new lint violations. If the count goes
  up, fix at least as many as you added.
- Cycle retros should note whether the zero-lint invariant stayed clean.

## Non-Goals

- This is not a dedicated cleanup cycle. Lint fixes happen alongside
  regular cycle work.
- Do not sacrifice code clarity to satisfy a lint rule. If a rule is
  genuinely wrong for a case, disable it inline with a comment
  explaining why.

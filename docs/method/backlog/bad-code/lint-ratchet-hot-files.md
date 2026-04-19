# Lint ratchet on hot protocol/view adapter files

The protocol-alignment slice had to touch `src/adapters/gitWarpAdapter.ts`,
`src/adapters/scenarioFixtureAdapter.ts`, and `src/tui/navigatorLayout.ts` to
stop `src/protocol.ts` from lying about the authored schema vocabulary.
Behavioral verification is green, but these files are still carrying old lint
ratchet debt: `unknown` use, oversized functions, and complexity violations.

## Why this matters

When a small schema-alignment change drags a maintainer across files that are
already above the repo's structural limits, the cost of honest protocol work
gets inflated by unrelated debt. That makes publication-boundary cleanup feel
more expensive than it should be.

## Done looks like

- `gitWarpAdapter.ts` no longer uses `unknown` in its WarpCoreLike surface
- receipt/frame helpers are split so the adapter stops tripping max-lines and
  complexity rules
- `scenarioFixtureAdapter.ts` frame-building and built-in scenarios are split
  into smaller units that satisfy the ratchet
- `navigatorLayout.ts` rendering branches are decomposed so capability checks
  and surface composition do not trip the complexity ceiling
- the stale unused-eslint-disable warning in `test/adapterRegistry.spec.ts` is
  removed as part of the same cleanup

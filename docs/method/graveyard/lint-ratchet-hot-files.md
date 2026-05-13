# Lint ratchet on hot protocol/view adapter files

**Status:** complete

The protocol-alignment slice had to touch `src/adapters/gitWarpAdapter.ts`,
`src/adapters/scenarioFixtureAdapter.ts`, and `src/tui/navigatorLayout.ts` to
stop `src/protocol.ts` from lying about the authored schema vocabulary.
This item tracked the old lint ratchet debt in those hot files: `unknown` use,
oversized functions, and complexity violations.

The debt was retired during cycle 0019. `lint-ceiling.txt` is now `0`, and both
`npm run lint` and `npm run lint:check` are clean.

## Why this matters

When a small schema-alignment change drags a maintainer across files that are
already above the repo's structural limits, the cost of honest protocol work
gets inflated by unrelated debt. That makes publication-boundary cleanup feel
more expensive than it should be.

## Done looks like

- [x] `gitWarpAdapter.ts` no longer uses `unknown` in its WarpCoreLike surface
- [x] receipt/frame helpers are split so the adapter stops tripping max-lines and
  complexity rules
- [x] `scenarioFixtureAdapter.ts` frame-building and built-in scenarios are split
  into smaller units that satisfy the ratchet
- [x] `navigatorLayout.ts` rendering branches are decomposed so capability checks
  and surface composition do not trip the complexity ceiling
- [x] the stale unused-eslint-disable warning in `test/adapterRegistry.spec.ts` is
  removed as part of the same cleanup

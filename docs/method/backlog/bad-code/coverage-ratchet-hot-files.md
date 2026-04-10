# Coverage ratchet on hot protocol/view adapter files

The `WriterRef` protocol slice proved the new identity path, but the touched
hot files are still below the repo's file-level coverage bar when measured with
Node's built-in coverage runner against the full test suite.

Current report snapshot from:

```sh
node --experimental-strip-types --test --experimental-test-coverage \
  --test-coverage-include=src/protocol.ts \
  --test-coverage-include=src/adapters/echoFixtureAdapter.ts \
  --test-coverage-include=src/adapters/gitWarpAdapter.ts \
  --test-coverage-include=src/adapters/scenarioFixtureAdapter.ts \
  --test-coverage-include=src/tui/navigatorLayout.ts \
  --test-coverage-include=src/tui/worldlineLayout.ts \
  test/*.spec.ts
```

- `src/protocol.ts`: `100 / 100 / 100`
- `src/adapters/echoFixtureAdapter.ts`: `97.04 / 70.97 / 100`
- `src/adapters/gitWarpAdapter.ts`: `82.57 / 72.34 / 76.92`
- `src/adapters/scenarioFixtureAdapter.ts`: `94.46 / 80.65 / 94.29`
- `src/tui/navigatorLayout.ts`: `94.33 / 83.95 / 100`
- `src/tui/worldlineLayout.ts`: `100 / 92.11 / 100`

## Why this matters

Protocol-alignment work keeps touching these files because they sit on the
publication boundary between authored schema truth and debugger surfaces. When
their error paths and narrow rendering branches stay untested, small protocol
changes inherit a much larger blast radius than they should.

## Missing surface

- `echoFixtureAdapter.ts`
  - unknown-head and invalid-frame branches need direct tests
  - fixture corruption branches are effectively unexercisable with the current
    closed fixture shape
- `gitWarpAdapter.ts`
  - unknown-head and out-of-range branches need direct tests
  - provisional empty effect/delivery paths and execution context need explicit
    assertions
  - malformed frame-index / strand-shape failure paths need either fixtures or
    smaller helpers
- `scenarioFixtureAdapter.ts`
  - bad catalog topology and bad lane references need direct tests
  - no-effect capability branch and out-of-range frame branch need explicit
    assertions
- `navigatorLayout.ts`
  - empty-writer, empty-receipt, pin-panel, error-flash, and no-effect wide
    render branches need focused render tests
- `worldlineLayout.ts`
  - dropped-frame / empty-primary-lane branch still needs a direct unit test

## Done looks like

- all touched protocol-boundary files reach `100%` line / branch / function
  coverage under the built-in coverage runner
- malformed fixture paths are either directly testable or split into smaller
  pure helpers so the dead branches stop hiding inside large adapters
- the repo grows a first-class coverage command instead of relying on an ad hoc
  invocation

# Retrospective — Cycle 0009: Navigator View Design

## What shipped

1. **Design doc 0013** — intentional Navigator layout organized around
   protocol nouns with operational rules for absence, overflow, and
   truncation. Three rounds of editorial review produced a behavioral
   spec, not a mockup.
2. **navigatorLayout.ts** — extracted rendering module with all pure
   helpers exported. Takes data, returns Surfaces. No terminal needed
   for testing.
3. **29 unit tests** — fixture matrix from the design doc: lane tree
   ordering, position bar formats, changed marker semantics, receipt/
   effect sorting, truncation, capability-driven section states, pin
   overflow, wide/narrow rendering.
4. **Structural changes** — decorative DAG shader removed. One-line
   position bar. Lane tree with depth-first pre-order and tree
   connectors. Horizontal receipt/effect split at w≥93. Row budgets
   (lanes 8, receipts 6, effects 6, pins 3). Capability-driven
   section visibility.

## Drift check

The backlog item asked five questions:

- What components belong in the Navigator? **Answered** — position
  bar, lane table, receipt summary, effect summary, pins panel,
  status bar. Each mapped to protocol nouns.
- Should the DAG shader show real data or be removed? **Removed.**
  Replaced with real lane tree.
- How should effects be visualized relative to receipts? **Side by
  side** on wide terminals, stacked on narrow.
- Information density? **Summary-first** — Navigator answers "what
  happened?" not "show me every field."
- Capability-driven layout? **Yes** — four render states per section
  (unavailable, empty, populated, truncated).

No unplanned drift. Scope expanded during editorial review to include
operational rules (overflow, sorting, width thresholds, count
formatting) but these were necessary for the design to be implementable.

## What worked

- **Editorial review as design process.** Three rounds of human
  feedback transformed a layout sketch into a behavioral spec. The
  doc went from 6/10 to 9.5/10.
- **Hexagonal extraction.** Moving layout to a pure module made the
  fixture matrix testable without a terminal. 29 tests in 280ms.
- **Lint ratchet dropped** from 117 to 110 as a side effect of the
  extraction and `public` modifier fixes.

## What didn't work

- **Lint wrestling.** Significant time spent getting new code under
  the lint ceiling. The `max-params`, `no-unused-vars`, and
  `complexity` rules create friction when writing test helpers.
  The rules are correct but the cost is real.

## What was learned

- Design docs need teeth. Layout, behavior, and edge cases. "What
  does it look like?" is not enough. "What happens when X is absent,
  Y overflows, and Z is unsupported?" is the real design work.
- The distinction between "unsupported capability" and "empty data"
  is a first-class UI concern for cross-host debuggers. Both hosts
  will have different capability profiles. The Navigator must be
  honest about what it can and cannot show.

## Tech/design debt

- Vertical priority removal (dropping sections when terminal is too
  short) is designed but not yet implemented. Currently all sections
  render regardless of available height.
- The `hidden: N receipts, M effects` status bar message for removed
  sections is designed but not yet implemented.

## Cool ideas

None surfaced.

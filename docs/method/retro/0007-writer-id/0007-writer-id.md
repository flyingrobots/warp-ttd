# Retrospective — Cycle 0007: writerId on ReceiptSummary

## What shipped

One optional field (`writerId?: string`) added to `ReceiptSummary`,
wired through all three adapters (git-warp, echo fixture, scenario),
surfaced in the TUI receipts table, pinned in the protocol contract
test, and documented in the GraphQL schema.

## Drift check

No drift. The backlog item proposed exactly this change and the
implementation matches 1:1.

## What worked

- **Tiny cycle, full process.** Design doc → failing tests →
  implementation → playback in one pass. The process scales down
  cleanly for small protocol additions.
- **git-warp already had the data.** `TickReceipt.writer` was sitting
  right there. The mapping was one line.

## What didn't work

- **Pinned deepEqual assertions broke.** Two tests in
  `echoFixtureAdapter.spec.ts` use `deepEqual` to pin exact receipt
  shapes. Adding `writerId` broke them. The tests did their job
  (they detected the shape change), but they're brittle to additive
  protocol changes. This is the second time this pattern has caused
  friction.

## What was learned

- Additive optional fields are the easiest protocol changes, but
  they still ripple through every adapter, fixture, and pinned test.
  The protocol is narrow enough that this is manageable, but it won't
  stay that way forever.
- The `deepEqual` shape-pinning pattern works well for the protocol
  contract test (where catching any shape change is the point), but
  is too strict for adapter behavior tests that should survive
  additive changes.

## Tech/design debt

- Consider relaxing `deepEqual` in adapter behavior tests to check
  specific fields rather than exact shape. Keep `deepEqual` only in
  `protocolContract.spec.ts` where shape pinning is the explicit
  purpose.

## Cool ideas

None surfaced.

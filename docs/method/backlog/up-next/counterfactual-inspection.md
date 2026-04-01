# Counterfactual Inspection & Strand Forking

**Status:** queued

## Insight

Rejected receipts ARE counterfactuals. When multiple writers submit
concurrent patches to the same lane, the admitted receipt wins and
the rejected ones become counterfactual history — what COULD have
happened if that writer's patch had been admitted instead.

This is where warp-ttd becomes a real debugger, not just a log viewer.

## Planned Capabilities

1. **Select a counterfactual** — navigate into a rejected receipt to
   inspect what it would have done (nodes added, edges created,
   properties set, effects emitted).

2. **Inspect the counterfactual diff** — compare the admitted outcome
   against the rejected alternative. What would be different?

3. **Fork a strand from a counterfactual** — create a speculative
   strand that explores the "what if this writer had won?" worldline.
   The strand replays from the fork point with the rejected patch
   admitted instead.

4. **Compare strand against base** — after forking, compare the
   counterfactual strand against the canonical worldline to see the
   divergence.

## UI Considerations

- Receipts table needs to be navigable (selectable rows) when
  counterfactual inspection is available
- Selected counterfactual should show a detail pane with the
  rejected operations
- "Fork strand from here" action on a selected counterfactual
- Strand comparison view (side-by-side or diff)

## Protocol Implications

- ReceiptSummary may need richer per-operation detail (not just
  aggregate counts) for counterfactual inspection
- Strand creation from a counterfactual coordinate needs adapter
  support (Cycle D — Strand & Speculation)
- Comparison payloads between strand and base worldline

## Dependencies

- writerId on ReceiptSummary (see receipt-writer-field.md)
- Cycle D — Strand & Speculation
- Cycle E — DebuggerSession (session tracks pinned counterfactuals)

# Cool Ideas from Effect Emission Slice

**Status:** seeds (not commitments)

## Effect Replay Diff

Compare what effects WERE emitted in live execution vs what WOULD be
emitted during replay. Show the delta — which effects exist in both
modes but differ in delivery outcome.

## Sink Health Dashboard

Aggregate delivery outcomes by sink across all ticks. Show operational
health: "Network sink: 47 delivered, 12 suppressed, 3 failed." Useful
for diagnosing adapter reliability.

## Causal Provenance from Real Data

Replace the decorative DAG shader with an actual graph of worldline and
strand relationships drawn from the lane catalog and receipt history.
Show fork points, strand parentage, and merge candidates.

## Effect Timeline Scrubber

Horizontal timeline view where effect emissions appear as dots, colored
by delivery outcome. Click or navigate to jump to that tick. Gives a
bird's-eye view of effect activity across the entire history.

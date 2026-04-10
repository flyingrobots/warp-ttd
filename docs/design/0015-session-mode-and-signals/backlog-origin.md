# Session Mode And Signals

**Legend:** PROTO

This cycle started as a vocabulary concern around replay semantics, but
the real problem is bigger than a rename.

`warp-ttd` currently uses one value vocabulary — `LIVE`, `REPLAY`,
`DEBUG` — in multiple places:

- `ExecutionContext.mode`
- `DeliveryObservationSummary.executionMode`
- the planned future observer-trace surface

That is close, but incomplete.

The missing piece is that apps and agents also need an explicit signal
when the debugger is *making the host behave differently*:

- entering replay mode
- seeking to a different tick/frame
- exiting replay mode
- reattaching to live execution

If we do not model that explicitly, downstream apps will infer it by
diffing snapshots and guessing from mode strings. That is exactly the
kind of replay sludge that causes duplicate side effects and
host-specific folklore.

## Related backlog truth

- `docs/method/backlog/up-next/PROTO_observer-trace-vs-effect-candidate-split.md`

## Origin

Design discussion after landing real `git-warp` effect emission support.
The core question was:

> Is `LIVE` / `REPLAY` / `DEBUG` the same semantic thing on observer
> traces, delivery observations, and execution context?

Answer: one shared mode vocabulary, but not one overloaded event noun.

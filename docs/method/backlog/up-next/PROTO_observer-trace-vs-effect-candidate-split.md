---
title: PROTO observer trace vs effect candidate split
status: proposed
priority: 2
impact: high
confidence: high
---

# Split observer traces from effect candidates

## Why

The current protocol uses `EffectEmissionSummary` for outbound effect
candidates and `DeliveryObservationSummary` for what sinks later did
with those candidates. That part is fine.

What is still muddy is the word `emit`.

- In the broader WARP doctrine, an observer may emit structural
  description or trace.
- In the current debugger protocol, an effect emission means a
  host/runtime outbound effect candidate.

Those are not the same thing. If we keep one overloaded word forever,
replay semantics will get sloppy fast.

## Repo truth right now

- `git-warp` substrate truth is effect entities such as
  `@warp/effect:*` written during graph rewrites.
- `git-warp` host runtime has `EffectEmission` and `DeliveryObservation`
  as host-side pipeline types.
- `warp-ttd` currently has no first-class observer-trace envelope.
- `warp-ttd` `EffectEmissionSummary` should therefore be read as
  "outbound effect candidate summary", not "observer output".

## Proposed next move

Add a separate observer-facing protocol noun instead of overloading
`EffectEmissionSummary`.

Possible shape:

```typescript
interface ObserverTraceSummary {
  traceId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  worldlineId: string;
  observerId?: string;
  apertureId?: string;
  summary: string;
}
```

The exact payload can wait. The important thing is to preserve the
semantic split:

- `EffectEmissionSummary` = outbound effect candidate
- `DeliveryObservationSummary` = sink-side result
- `ObserverTraceSummary` = observer-produced description

## Why this matters

- replay/debug should inspect effect candidates without re-externalizing
  them
- observer-relative panels should be able to disagree without faking new
  effect candidates
- future git-warp observer work should not be forced into the host
  delivery vocabulary

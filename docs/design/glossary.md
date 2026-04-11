# Glossary

Canonical domain terms for warp-ttd. Every protocol type, user-visible
string, error message, and doc should use these terms consistently.

| Term | Definition | Not |
|------|------------|-----|
| **worldline** | Causal history of a deterministic graph. A worldline is a lane whose ticks form a linear chain of causally ordered states. | ~~timeline~~ |
| **strand** | Speculative branch forked from a worldline. A strand is a writable lane that explores an alternative causal history. | ~~working-set~~ |
| **lane** | Generic term for a worldline or strand. Lanes are the top-level containers in the lane catalog. Each lane has an ID, a kind, and an independent tick sequence. | |
| **tick** | Lamport clock value on a single lane. Ticks are substrate-level coordinates. Each tick represents one causal step on one lane. Part of `Coordinate { laneId, tick }`. | |
| **frame** | Composite snapshot across all tracked lanes at a point in playback time. Frame 0 is the synthetic empty state. Frame N shows every lane's coordinate after N steps forward. A frame contains multiple `Coordinate` objects, each with its own tick. | Not a synonym for tick. |
| **playback head** | Cursor that tracks the current frame position within a lane set. A head has a current frame index, a list of tracked lanes, and a paused/running state. Protocol type: `PlaybackHeadSnapshot`. | |
| **receipt** | Structured provenance record for a tick transition. Records how many rewrites were admitted, rejected, and counted as counterfactual. Protocol type: `ReceiptSummary`. | ~~log entry~~ |
| **counterfactual** | A rejected rewrite that records what could have happened if a different writer's patch had been admitted. Counterfactuals are first-class — they are not silently discarded. | Not just "rejected" — rejection is the mechanism, counterfactual is the semantic meaning. |
| **effect emission** | Protocol-level record of an outbound effect candidate at a causal coordinate (diagnostic, notification, export, etc.). Distinct from the later delivery result and distinct from any future observer-trace surface. Protocol type: `EffectEmissionSummary`. | |
| **delivery observation** | Record of what happened when an emission reached a sink. Outcomes: delivered, suppressed, failed, skipped. Protocol type: `DeliveryObservationSummary`. | |
| **execution context** | Session-level metadata describing the current mode (live, replay, debug). Affects delivery behavior — e.g., replay mode suppresses external sinks. Protocol type: `ExecutionContext`. | |
| **capability** | A declared ability of a host adapter. Capabilities gate which protocol methods are available. Enumerated in `HostHello.capabilities`. | |

## Frame vs tick — why both exist

A tick is a coordinate on one lane. A frame is a debugger-level
composite across all lanes. A frame *contains* ticks (via
`Coordinate`), but a frame is not a tick. Example: Frame 3 might show
`wl:main` at tick 3 and `strand:exp` at tick 1 — same frame, different
ticks.

Protocol types use `frameIndex` for debugger navigation and `tick` for
substrate coordinates. This is intentional. Do not rename `frameIndex`
to `tickIndex`.

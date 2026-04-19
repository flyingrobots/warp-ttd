# CI-002 — Scenario Fixture Builder CLI

Legend: [PROTO — Protocol Architecture](../../legends/PROTO-protocol-architecture.md)

## Idea

Implement a specialized CLI tool (or a set of actuator-like commands) that helps developers build and export **Scenario Fixtures**. These fixtures are the primary way to test protocol edge cases (e.g. "Simulate a multi-writer conflict with specific counterfactuals" or "Simulate a suppressed effect emission").

Currently, these are built manually in TypeScript. A builder CLI would allow for declarative definitions (e.g. `ttd-actuator add-frame --tick 47 --writer alice --applied op1 --rejected op2`) and export them as versioned `.json` snapshots that the `ScenarioFixtureAdapter` can load.

## Why

1. **Test Velocity**: Makes it trivial to build and share complex causal failure scenarios.
2. **Protocol Proving**: Allows the TTD protocol to be hardened against new capabilities (e.g. Multi-Strand Braiding) before the substrates support them.
3. **Collaboration**: Enables different teams to share "investigator witnesses" as standalone protocol-compliant files.

## Effort

Medium-Large — requires a state-machine for fixture construction and an export/import format.

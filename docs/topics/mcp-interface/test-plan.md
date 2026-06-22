# Test Plan — MCP Interface

## Requirements

- **R-MCP-1:** MCP session and admission-chain tools emit stable protocol-shaped data.
- **R-MCP-2:** Tool results are deterministic under fixed snapshot and descriptor inputs.
- **R-MCP-3:** MCP surfaces reject unsupported/invalid descriptors predictably.
- **R-MCP-4:** MCP behavior remains consistent with CLI and TUI JSON contracts.

## Evidence

- C1 — `test/mcpAdmissionChainSurface.spec.ts`
  - Verifies tool availability, output stability, and read-only behavior.
- C2 — `test/cliJson.spec.ts`
  - Cross-surface parity check for session structure.
- C3 — `test/adapterRegistry.integration.spec.ts`
  - Deterministic adapter wiring for MCP-facing data sources.

## Fixtures

- MCP session builders used by MCP surface specs.
- Shared adapter fixtures and registry descriptors.

## Oracles

- Stable key naming for admission-chain and session outputs.
- Non-destructive execution for read-only tool handlers.
- Predictable error classification on descriptor failure.

## Planned Cases

- Add explicit MCP test cases for new runtime hello and generated protocol families.


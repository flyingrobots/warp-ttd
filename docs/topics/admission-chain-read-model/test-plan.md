# Test Plan — Admission Chain Read Model

## Requirements

- **R-ACR-1:** Admission-chain read model assembly is deterministic for fixed inputs.
- **R-ACR-2:** Missing or obstructed data returns explicit absence/posture.
- **R-ACR-3:** MCP and TUI consumers observe consistent admission-chain shapes.
- **R-ACR-4:** Read model errors are stable and non-throwing for malformed data.

## Evidence

- C1 — `test/mcpAdmissionChainSurface.spec.ts`
  - Verifies MCP read-model content and structure.
- C2 — `test/inspectorPage.spec.ts`
  - Verifies inspector consumes admission-chain style facts.
- C3 — `test/debuggerSession.spec.ts`
  - Verifies session snapshot includes expected chain posture in integrated flows.

## Fixtures

- Adapter fixtures that include admission-chain-compatible and obstructed paths.

## Oracles

- Chain summaries contain stable required fields when present.
- Obstruction reasons remain explicit and machine-parseable.

## Planned Cases

- Expand test vectors for malformed admission chain payloads and partial chain reconstruction.


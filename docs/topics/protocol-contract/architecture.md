# Protocol Contract architecture

## Purpose

The protocol surface is the shared truth source that all adapters, sessions, and renderers consume.

## Dataflow

1. `schemas/warp-ttd-protocol.graphql` defines the canonical graph shapes and compatibility intent.
2. `src/protocol.ts` maps schema intent into runtime-aware TypeScript structures.
3. `src/generated/warp-ttd-protocol.wesley.generated.ts` materializes the external contract contract and parser-facing artifacts.
4. Runtime consumers (`adapter-port-and-registry`, `debugger-session-core`, interfaces) consume generated and hand-authored protocol bindings.

## Runtime contract boundaries

- **Schema source of truth:** GraphQL definition and migration notes.
- **Runtime guardrails:** Protocol parsing and generation checks.
- **Compatibility checks:** Versioned publication and boundary tests before feature merge.

## Failure containment

Most compatibility failures enter as:
- mismatched schema and runtime bindings,
- generation drift,
- or untested publication behavior.

Each class is reduced by keeping generated artifacts deterministic and by forcing parity checks before release merges.

## Impact routing

Any protocol change should be considered for:
- adapter selection and dispatch behavior,
- session field hydration,
- and interface rendering assumptions (`cli-interface`, `mcp-interface`, `tui-shell`, `worldline-visualization`).


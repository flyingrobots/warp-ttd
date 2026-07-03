# Protocol Contract — Rationale

## Why this shelf is a hard dependency

The protocol shelf is a compatibility boundary because every adjacent consumer layer (`adapter-port-and-registry`, `debugger-session-core`, `cli-interface`, `mcp-interface`, `tui-shell`, and friends) derives behavior from protocol shape, and those shapes determine what downstream readers can assert as stable.

When this shape changes, even a small term edit can alter how sessions are assembled, what adapters can claim to support, and how interfaces render contract-backed output. That coupling is intentional, but it means this shelf is not isolated documentation; it is a guardrail for cross-layer compatibility.

## Why chain-first execution exists

The shape chain is intentionally serial.

- `schemas/warp-ttd-protocol.graphql` establishes terminology and migration intent.
- `src/protocol.ts` translates that intention into in-repo runtime types.
- `src/generated/warp-ttd-protocol.wesley.generated.ts` publishes the consumable contract surface.
- parity tests close the chain with deterministic checks.

This order is not bureaucracy; it is what prevents a local-only declaration from becoming a distributed compatibility claim.

## Why this document prioritizes failure-first workflows

Most teams discover protocol issues at release time, not during design time. A practical documentation posture therefore starts with the contract chain and then with explicit failure modes, because failures already encode where the compatibility contract failed and what correction loop must execute.

That is why the failure matrix and recovery paths are written as a first-class path, not as an appendix for exceptional events.

## Why this doc structure was split

`README.md` now focuses on three questions: what to touch, how to verify, and how to recover. The philosophical argument for why this shape model exists, including tradeoffs and governance philosophy, is kept in this `rationale.md`.

This split keeps the operational ledger skimmable for uninitiated readers while preserving a stable place for conceptual depth when needed.

## Citation traceability

Rationale claims in this file remain linked to the same evidence framework as the operational ledger and should be considered together with `Appendix B` in `README.md`.

For this reason, claims in this document should be validated against the same test and source chain as any operational claim.

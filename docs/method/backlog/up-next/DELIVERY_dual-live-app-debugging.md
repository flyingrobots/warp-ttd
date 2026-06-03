# Dual live app debugging

- Lane: `up-next`
- Legend: `DELIVERY`
- Rank: `0`

## Why now

The next proof is no longer "can WARP TTD inspect a fixture?" It is whether
the same debugger can explain two live applications without collapsing their
host substrates:

- `jedit`: live Echo app. Debugger pressure: lawful optic registration,
  admission posture, witnesses, receipts, and observer-relative readings.
- `graft`: live git-warp app. Debugger pressure: causal history, receipts,
  effect emissions, lane/worldline state, and materialized graph-shaped
  readings.

The same debugger surface can inspect both apps without becoming either app's
domain model.

## Hill

An operator can point WARP TTD at `jedit`, a live Echo app, and at `graft`, a
live git-warp app, then inspect what each host knows through the same
host-neutral session, CLI, and MCP vocabulary.

## Required Separation

- `jedit` pressures admission-chain representation: artifact registration,
  Echo-owned handles, grants, presentations, tickets, witnesses, receipts, and
  reading envelopes. Once Echo exposes WAL-backed recovery facts, `jedit` also
  pressures causal commit evidence and recovery posture without making WARP TTD
  parse raw WAL segments.
- `graft` pressures causal-history representation: git-warp commits, Lamport
  ticks, receipts, effect emissions, materialized readings, and lane/worldline
  state.
- WARP TTD owns inspection, replay, explanation, and rendering.
- WARP TTD does not compile artifacts, issue authority, admit invocations,
  mutate app state, or own app semantics.

## First Cut

1. Keep the admission-chain read model as the protocol target before strand
   creation.
2. Expose `targets --json` as a read-only smoke command that names `jedit` and
   `graft`, reports sibling-root posture, and keeps missing admission-chain
   facts explicit.
3. Define the minimum live Echo adapter evidence needed to debug `jedit`.
4. Validate the existing git-warp adapter against `graft` as a real app target,
   not only synthetic integration fixtures.
5. Expose the first live-target facts through CLI and MCP before adding TUI
   controls.
6. Treat unavailable host-specific facts as explicit absence, not inferred
   truth.

## Non-Goals

- No grant issuance in WARP TTD.
- No runtime admission in WARP TTD.
- No Echo WAL parsing, recovery, or tail truncation in WARP TTD.
- No strand creation before admission-chain representation exists.
- No `jedit` editor semantics in the debugger core.
- No `graft` app-domain graph ontology in the debugger core.

## Repo Evidence

- `docs/BEARING.md`
- `docs/method/backlog/up-next/PROTO_admission-chain-inspector.md`
- `docs/method/backlog/up-next/PROTO_echo-host-adapter.md`
- `docs/design/0020-live-target-debugging-smoke/live-target-debugging-smoke.md`
- `src/adapters/gitWarpAdapter.ts`
- `src/mcp/admissionChainSurface.ts`

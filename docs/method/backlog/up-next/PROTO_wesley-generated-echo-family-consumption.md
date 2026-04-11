# Wesley-Generated Echo Family Consumption

- Lane: `up-next`
- Legend: `PROTO`
- Rank: `1`

## Why now

`warp-ttd` still relies on handwritten local mirrors and local synthesis:

- `src/protocol.ts` is still a handwritten mirror
- `DebuggerSession` derives neighborhood, reintegration, and receipt-shell
  state locally from frame + receipts + emissions
- the Echo side now publishes real neighborhood and settlement proof surfaces

That is enough for local iteration, but not enough for the assignment. The
assignment is that Echo and `warp-ttd` should speak through one Wesley-compiled
family, not through adapter folklore.

## Hill

`warp-ttd` consumes the generated TypeScript side of the Continuum proof
family and uses it for the real Echo adapter path.

For the first cut:

- keep git-warp and fixtures on fallback handwritten derivation where needed
- make the Echo path consume generated family types first
- stop extending `src/protocol.ts` for proof-family nouns that should come from
  Wesley

## Done looks like

- one Echo adapter path consumes Wesley-generated TypeScript family artifacts
- settlement and neighborhood surfaces come from Echo publication instead of
  being reconstructed locally
- `DebuggerSession` supports host-published neighborhood / reintegration /
  receipt-shell data with fallback derivation for older adapters
- CLI/agent surfaces can emit the same generated family nouns without TUI-only
  reconstruction

## Repo Evidence

- `src/protocol.ts`
- `src/app/debuggerSession.ts`
- `src/app/ReintegrationDetailSummary.ts`
- `src/app/ReceiptShellSummary.ts`
- `docs/method/backlog/up-next/PROTO_echo-host-adapter.md`
- Continuum `0015`, `0016`, and `0017`

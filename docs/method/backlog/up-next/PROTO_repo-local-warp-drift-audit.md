# Repo-local WARP drift audit

`warp-ttd` needs its own repo-local drift note against the now-stronger
cross-repo doctrine. Right now the repo has strong debugger doctrine and
invariants, but it does not yet have one explicit packet that answers:

- where the debugger is already aligned
- where the protocol still reflects older substrate assumptions
- which nouns are debugger-native versus shared-family-derived

## Why now

The broader stack clarified several things after `warp-ttd`'s existing doctrine
packets were written:

- GraphQL families versus compiled artifacts versus runtime values
- Continuum-only observer semantics
- Wesley module ownership instead of product semantics in base Wesley
- the minimum runtime-boundary family in Continuum

`warp-ttd` should not try to absorb all of that by silent osmosis.

## Hill

The repo has one honest WARP drift note that becomes the ledger for debugger
alignment work instead of leaving every new cut to infer its own doctrine.

## Done looks like

- `docs/WARP_DRIFT.md` exists
- the packet states what `warp-ttd` already gets right
- the packet states where the protocol or adapters still need alignment
- the packet points directly at the next backlog cuts rather than becoming one
  more floating essay

## Repo Evidence

- `docs/design/doctrine.md`
- `docs/design/invariants.md`
- `docs/design/graphql-wesley-strategy.md`
- `src/protocol.ts`


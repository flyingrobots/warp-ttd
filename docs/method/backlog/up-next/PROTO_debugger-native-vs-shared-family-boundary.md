# Debugger-native vs shared-family boundary

`warp-ttd` should not drift into either of two bad extremes:

- blindly mirror every runtime/shared-family noun into the debugger
- invent a completely separate debugger ontology that quietly diverges from the
  runtime

The missing work is to name the boundary clearly.

## Why now

The repo already has strong debugger-native nouns:

- playback head
- frame
- receipt summary
- effect emission summary
- delivery observation
- execution context

The broader stack now also has stronger shared families and clearer ownership
rules. Someone needs to say, explicitly, which debugger nouns stay local and
which should become projections over shared families.

## Hill

`warp-ttd` has one packet that freezes the boundary between:

- debugger-native protocol nouns
- shared-family-derived nouns
- host-specific adapter residue

## Done looks like

- one packet states which protocol families are debugger-native by design
- one packet states which should be shared-family projections or generated
  consumers
- the cut keeps host-neutral debugging honest without flattening real host
  differences
- future schema work can proceed without re-litigating the boundary every time

## Repo Evidence

- `src/protocol.ts`
- `docs/design/glossary.md`
- `docs/design/doctrine.md`
- `docs/design/invariants.md`


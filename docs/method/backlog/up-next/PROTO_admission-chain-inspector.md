# Admission-chain inspector

`warp-ttd` needs a first-class way to inspect the lawful optic invocation
chain now emerging across Wesley and Echo.

## Why

The mature stack separates objects that older debugger language could easily
collapse:

- `OpticArtifact` - what is being proposed
- `OpticAdmissionRequirements` - what authority and support must cover
- `OpticRegistrationDescriptor` and artifact hash - what the app registers
  with Echo or another runtime
- Echo-owned `OpticArtifactHandle` - the runtime-local lookup token proving
  registration, not authority
- `CapabilityGrant` - who has bounded authority
- `CapabilityPresentation` - how authority is presented for an invocation
- `AdmissionTicket` - this exact invocation is authorized
- `LawWitness` - what was checked and what happened
- receipt or `ReadingEnvelope` - what causal or observer-relative result came
  back

If these appear only as adapter-specific blobs, operators and agents will lose
the most important distinctions: no grant, invalid grant, expired grant,
unsupported basis, admitted ticket, runtime access obstruction, satisfied law,
unknown law posture, and returned reading.

## Hill

WARP TTD can display artifact registration, registration descriptor, handle,
grant presentation, admission ticket, law witness, receipt, and reading posture
as distinct debugger facts.

## Live Targets

- `jedit`, a live Echo app, is the first pressure test for real admission-chain
  representation.
- `graft`, a live git-warp app, is the paired pressure test that proves the
  same debugger can inspect causal history and graph-shaped readings without
  pretending every host has Echo admission facts.

The read model must let CLI and MCP explain both targets through one
host-neutral debugger vocabulary.

## Playback Questions

- Can an operator see which `OpticArtifact` or artifact hash was invoked?
- Can an operator see the compiled `OpticAdmissionRequirements` digest?
- Can an operator inspect the `OpticRegistrationDescriptor` used to register
  the artifact?
- Can an operator distinguish the Echo-owned `OpticArtifactHandle` from the
  authority-bearing `CapabilityGrant`?
- Can an operator inspect the `CapabilityPresentation` used for this exact
  invocation?
- Can an operator see whether Echo issued an `AdmissionTicket` or obstructed
  before execution?
- Can an operator see what basis, aperture, budget, and support were admitted?
- Can an operator inspect `LawWitness` verdicts without collapsing them into a
  boolean?
- Can an operator link witnesses to receipts or `ReadingEnvelope` outputs?
- Can the CLI/MCP surface expose the same chain without TUI-only parsing?

## Non-Goals

- No grant issuance in `warp-ttd`.
- No policy verification in `warp-ttd`.
- No artifact compilation in `warp-ttd`.
- No runtime admission in `warp-ttd`.
- No app-domain semantics owned by `warp-ttd`.

## First Cut

1. Add protocol/read-model placeholders only after Wesley and Echo have stable
   names for the first artifact registration and witness path.
2. Prefer generated shared-family types where available.
3. Add a CLI JSON view before any TUI panel depends on the data.
4. Keep graph-shaped readings as readings: every materialized graph view must
   name the basis, observer plan, reading posture, and backing witness or
   receipt.

## Repo Evidence

- `docs/WARP_DRIFT.md`
- `docs/method/backlog/up-next/PROTO_debugger-native-vs-shared-family-boundary.md`
- `docs/method/backlog/up-next/PROTO_generated-protocol-authority-cutover.md`
- `docs/method/backlog/up-next/DELIVERY_dual-live-app-debugging.md`
- `docs/method/graveyard/DELIVERY_mcp-admission-chain-surface.md`

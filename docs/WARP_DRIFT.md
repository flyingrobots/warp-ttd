# WARP Drift

This note records where WARP TTD must catch up to the current stack doctrine.
It is a drift ledger, not a replacement for `ARCHITECTURE.md`,
`VISION.md`, or Continuum-owned invariants.

## Old Center

The older product shorthand was:

> WARP TTD is a debugger for deterministic graph systems.

That was useful while the stack was still naming its substrate. It is now too
loose. It risks treating a materialized graph as the thing being debugged.

## Current Center

The current stack doctrine is:

> WARP TTD is the debugger/operator surface for witnessed causal systems.

It debugs witnessed causal history and observer-relative readings. It renders
graph-shaped, receipt-shaped, witness-shaped, and reading-shaped projections
over causal history without becoming the compiler, authority issuer, admission
runtime, or application domain model.

The graph is not the substrate. A graph view is a materialized reading over a
witnessed causal basis under an observer plan, aperture, and reading posture.

## Stack Ownership

| Layer | Owner | WARP TTD posture |
| :--- | :--- | :--- |
| Shared semantics | Continuum | Consume shared contract families; do not re-author them locally. |
| Compiler facts | Wesley | Consume generated artifacts; do not treat local mirrors as peer authority. |
| Runtime admission | Echo or another runtime | Observe admission results; do not admit interactions locally. |
| Authority grants | User, host, quorum, or policy authority | Display and present grants; do not issue authority by implication. |
| Debugger/operator surface | WARP TTD | Inspect, explain, compare, replay, and visualize the witnessed chain. |

## Chain To Inspect

The mature debugger surface should make this chain inspectable:

1. `OpticArtifact` - what is being proposed.
2. `OpticAdmissionRequirements` - what authority and support must cover.
3. `OpticRegistrationDescriptor` and artifact hash - what was registered.
4. Echo-owned `OpticArtifactHandle` - the runtime-local lookup token.
5. `CapabilityGrant` - who has bounded authority.
6. `CapabilityPresentation` - how that authority was presented now.
7. `AdmissionTicket` - this exact invocation was authorized.
8. `LawWitness` - what was checked and what happened.
9. Receipt or `ReadingEnvelope` - the returned causal or observer-relative
   result.

Each noun has a different job. The handle proves registration, not authority.
The grant authorizes bounded attempts, not a basis. The ticket authorizes this
invocation before execution. The witness reports what the runtime checked and
what access actually occurred.

## Consequences

- `HostHello.capabilities` is an adapter-support declaration, not an authority
  grant. The protocol vocabulary should call these adapter capabilities.
- Graph and provenance viewers should be reading inspectors over an explicit
  basis and observer plan, not direct claims about substrate truth.
- MCP is transport for the chain. It must not become a privileged escape hatch
  around artifact registration, grants, admission, instrumentation, or witness
  emission.
- Debugger-created strands are lawful invocations. Fork, advance, promote, and
  drop should carry authority, admission, retention, and revelation posture
  rather than living as UI-local state changes.
- `requirements_digest` is a first-class no-silent-widening guard. Old grants
  must not silently authorize wider requirements.

## Role Boundary

WARP TTD does not compile optic claims, issue authority, admit runtime
interactions, instrument runtime access, or satisfy laws.

WARP TTD does inspect the witnessed chain by which readings, receipts, grants,
tickets, and law witnesses came to exist.

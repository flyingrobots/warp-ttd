# Continuum Target Discovery Contract Retro

Cycle: `0076-continuum-target-discovery-contract`

Issue: https://github.com/flyingrobots/warp-ttd/issues/76

PR: https://github.com/flyingrobots/warp-ttd/pull/77

## What Changed From The Design

The design held. WARP TTD now treats target identity, app identity, runtime
substrate, and debugger capability as facts on descriptor-backed target records
instead of as hard-coded `jedit` and `graft` app branches.

The implementation also tightened the descriptor parser while the cycle was in
flight. `WARP_TTD_TARGETS_JSON` entries are not silently dropped when malformed,
duplicated, or unsupported. They remain visible as deterministic
`descriptor-only` targets with `UNSUPPORTED` or `OBSTRUCTED` adapter posture and
a reason string.

## What The Tests Proved

- `inspectLiveTargets` still emits the default `jedit` and `graft` witness
  descriptors with compatible posture.
- `inspectLiveTargets` can emit a synthetic descriptor-only target without WARP
  TTD knowing a new app name.
- Env-configured descriptors preserve unsupported connection modes as visible
  `UNSUPPORTED` target facts.
- Malformed env descriptors become deterministic `OBSTRUCTED` target facts.
- Duplicate env descriptor ids become deterministic `OBSTRUCTED` target facts.
- `targets --json` exposes descriptor-derived target facts for agents.
- MCP `warp_ttd.inspect_live_targets` exposes the same descriptor-derived
  target facts.
- Manual and doctrine assertions preserve the rule that `jedit` and `graft` are
  witness defaults, not debugger architecture.

## What Remains Open

- Runtime auto-discovery is still out of scope.
- Vendor-neutral runtime hello/handshake schema is still out of scope.
- Transport choices such as stdio, HTTP, WebSocket, or Unix sockets are still
  out of scope.
- Consent, authentication, and endpoint trust posture are still out of scope.
- The current descriptor contract is debugger-local and should be promoted only
  after a later Continuum-wide handshake design.
- Follow-on issues: #80 for runtime hello, #78 for discovery/local registry, and
  #79 for consent/auth posture.

## Safety Boundaries Preserved

- No network discovery.
- No runtime handshake.
- No runtime control.
- No authority issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No generated modules are executed.
- No native Continuum witnesshood is inferred from target descriptor presence,
  app labels, root posture, or translated substrate facts.

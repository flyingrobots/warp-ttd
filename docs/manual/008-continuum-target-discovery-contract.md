# Continuum Target Discovery Contract

Source design cycle:
[0076-continuum-target-discovery-contract](../design/0076-continuum-target-discovery-contract/continuum-target-discovery-contract.md)

## Reader Contract

WARP TTD debugs Continuum-compatible targets. It does not debug hard-coded app
names.

The rule is:

> Target identity, app identity, runtime vendor, and substrate are facts. They
> are not WARP TTD app-layer dispatch boundaries.

`jedit` and `graft` remain default local witness targets because they pressure
different parts of the debugger contract. They are not special debugger
concepts.

## Target Descriptors

The first target registry is descriptor-backed. The default descriptors are:

```json
[
  {
    "id": "jedit",
    "label": "jedit local witness",
    "appKind": "live Echo app",
    "connection": {
      "mode": "echo-root",
      "rootPath": "../jedit"
    }
  },
  {
    "id": "graft",
    "label": "graft local witness",
    "appKind": "live git-warp app",
    "connection": {
      "mode": "git-warp",
      "rootPath": "../graft",
      "graphName": "graft-ast"
    }
  }
]
```

The compatibility environment variables remain:

```sh
WARP_TTD_JEDIT_ROOT=/path/to/jedit
WARP_TTD_GRAFT_ROOT=/path/to/graft
```

For tests and early integration, a caller can replace the default descriptors
with `WARP_TTD_TARGETS_JSON`:

```sh
WARP_TTD_TARGETS_JSON='[
  {
    "id": "vendor-demo",
    "label": "Vendor demo runtime",
    "appKind": "Continuum-compatible app",
    "connection": {
      "mode": "descriptor-only",
      "reason": "Vendor runtime handshake is not implemented in this slice."
    }
  }
]' npm run targets -- --json
```

`WARP_TTD_TARGETS_JSON` is intentionally inspectable even when entries are not
runnable. Unknown connection modes become `descriptor-only` targets with
`adapterPosture: "UNSUPPORTED"`. Malformed entries and duplicate ids become
deterministic `descriptor-only` targets with `adapterPosture: "OBSTRUCTED"` and
a reason string.

## What Agents See

Run:

```sh
npm run targets -- --json
```

or inspect MCP `warp_ttd.inspect_live_targets`.

Each target includes:

- `target`
- `targetLabel`
- `connectionMode`
- `appKind`
- `rootPath`
- `rootPosture`
- `adapterPosture`
- `capabilities`
- `runtimeBoundaryEvidence`
- `readOnly`
- `reason`

`target-session --json` uses the same registered target list. Targets without a
session-capable adapter report `sessionPosture: "OBSTRUCTED"` with a reason.

## Connection Modes

- `echo-root` means the target root may expose Echo-compatible descriptor facts.
- `git-warp` means WARP TTD can use the existing read-only git-warp adapter
  path. Env-configured `git-warp` descriptors must include `graphName`.
- `descriptor-only` means the target is registered as a Continuum-compatible
  target, but runtime handshake discovery is not implemented in this cycle.

Connection mode is an adapter implementation hint. It is not an app identity.

## Posture Meanings

- `rootPosture: "PRESENT"` means the descriptor root exists locally.
- `rootPosture: "MISSING"` means the descriptor root does not exist locally.
- `rootPosture: "NOT_APPLICABLE"` means the descriptor does not name a local
  root.
- `adapterPosture: "CONFIGURED"` means WARP TTD has a read-only adapter path
  for the descriptor mode.
- `adapterPosture: "UNSUPPORTED"` means the descriptor is visible but a runtime
  handshake or adapter is future work.
- `adapterPosture: "OBSTRUCTED"` means the descriptor is malformed, duplicated,
  or cannot be safely interpreted.
- `runtimeBoundaryEvidence.posture: "TRANSLATED_SUBSTRATE"` means the facts are
  projected from a substrate and are not native Continuum witnesshood.
- `runtimeBoundaryEvidence.posture: "UNAVAILABLE"` means no runtime-boundary
  evidence is available yet.

## Compatibility Rule

Existing `targets --json` consumers still see the default `jedit` and `graft`
records. Existing `WARP_TTD_JEDIT_ROOT` and `WARP_TTD_GRAFT_ROOT` overrides
still work.

New generic fields are additive. Consumers should dispatch on capabilities,
connection posture, and evidence posture rather than app labels.

## Safety Boundaries

- No network discovery yet.
- No WebSocket, stdio, or HTTP runtime handshake yet.
- No vendor authentication or consent flow yet.
- No runtime control.
- No authority issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No generated modules are executed.
- No native Continuum witnesshood inferred from app names or descriptor
  presence.

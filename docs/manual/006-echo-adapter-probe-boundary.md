# Echo Adapter Probe Boundary

Source design cycle:
[0032-echo-adapter-probe-boundary](../design/0032-echo-adapter-probe-boundary/echo-adapter-probe-boundary.md)

## Reader Contract

`jedit` now reports Echo adapter probe posture separately from live Echo
family-intake posture.

The rule is:

> Seeing an Echo adapter bridge is not the same as opening an Echo session.

WARP TTD can inspect a bridge descriptor read-only, but `target-session --json`
still reports `jedit.sessionPosture: "OBSTRUCTED"` until a later slice wires a
real Echo host adapter session.

## Probe Descriptor

The probe descriptor lives under the `jedit` root:

`<jedit root>/.warp-ttd/echo-adapter-probe.json`

Minimal descriptor:

```json
{
  "schemaVersion": "warp-ttd.echo-adapter-probe.v1",
  "bridgeKind": "echo",
  "abiVersion": 1,
  "transport": "wasm"
}
```

The descriptor is adapter-shaped evidence. It is not a session, a grant, an
admission ticket, a witness, or a reading envelope.

## What Agents See

Run:

```sh
npm run targets -- --json
npm run target-session -- --json
```

For `jedit`, the output includes:

- `echoAdapterProbe.schemaVersion: "warp-ttd.echo-adapter-probe.v1"`
- `bridgePosture`
- `probePosture`
- `sessionProbePosture`
- `supportedAbiVersions`
- `adapterPosture`

Posture meanings:

- `bridgePosture: "ROOT_UNAVAILABLE"` means the `jedit` root is missing.
- `bridgePosture: "BRIDGE_ABSENT"` means the root exists, but the bridge
  descriptor is absent.
- `bridgePosture: "BRIDGE_PRESENT"` means the descriptor is present and uses a
  supported ABI.
- `bridgePosture: "ABI_UNSUPPORTED"` means the descriptor was read, but its ABI
  or transport is not supported by this WARP TTD build.
- `bridgePosture: "PROBE_OBSTRUCTED"` means the descriptor exists but cannot be
  used.

Top-level `adapterPosture` is derived from the probe:

- `UNAVAILABLE` for missing root or missing bridge
- `CONFIGURED` for supported bridge descriptor
- `UNSUPPORTED` for unsupported ABI or transport
- `OBSTRUCTED` for malformed or unreadable descriptor

## Separation From Family Intake

`sessionFamilyIntake` and `echoAdapterProbe` answer different questions:

- `sessionFamilyIntake`: which session-family fields can the live Echo side
  publish?
- `echoAdapterProbe`: is there a bridge-shaped Echo adapter surface WARP TTD can
  see, and is its ABI compatible?

Neither field means WARP TTD has opened an Echo runtime session.

## Safety Boundaries

- No Echo session open.
- No browser attachment.
- No jedit editor operations.
- No Echo WAL parsing.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

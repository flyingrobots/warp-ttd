---
title: Echo Adapter Probe Boundary
status: landed
---

# Echo Adapter Probe Boundary

**Cycle:** 0032-echo-adapter-probe-boundary
**Legend:** DELIVERY
**Type:** implementation cycle

## Manual Chapter

The durable reader-facing version of this cycle is:

- [Echo Adapter Probe Boundary](../../manual/006-echo-adapter-probe-boundary.md)

## Sponsor Human

Operator preparing to debug `jedit`, a live Echo app, through WARP TTD.
Needs a real adapter-shaped probe before WARP TTD can claim a live Echo session
or consume Echo-published neighborhood, admission, authority, witness, receipt,
or reading facts.

## Sponsor Agent

LLM agent inspecting `targets --json`, MCP live-target posture, or
`target-session --json`. Needs to distinguish four states that were previously
collapsed into `adapterPosture: "UNAVAILABLE"`:

1. the `jedit` root is unavailable
2. the Echo adapter bridge is absent
3. the bridge is visible and has a supported ABI
4. the bridge exists but is unusable because its ABI or manifest is unsupported
   or obstructed

## Hill

`jedit` live-target inspection exposes an explicit, read-only Echo adapter
probe posture without opening an Echo session, attaching a browser, performing
runtime admission, issuing authority, or mutating the host.

## Probe Contract

The first Echo adapter probe is a root-local descriptor:

`<jedit root>/.warp-ttd/echo-adapter-probe.json`

The descriptor is deliberately small:

```json
{
  "schemaVersion": "warp-ttd.echo-adapter-probe.v1",
  "bridgeKind": "echo",
  "abiVersion": 1,
  "transport": "wasm"
}
```

The descriptor proves only that a bridge-shaped Echo adapter publication is
visible to WARP TTD. It does not prove that WARP TTD can open an Echo session.
Session open remains obstructed until a later Echo host adapter slice lands.

## Posture Rules

- Missing `jedit` root produces `bridgePosture: "ROOT_UNAVAILABLE"` and
  `probePosture: "UNAVAILABLE"`.
- Present root with no descriptor produces `bridgePosture: "BRIDGE_ABSENT"` and
  `probePosture: "UNAVAILABLE"`.
- Valid descriptor with supported ABI produces
  `bridgePosture: "BRIDGE_PRESENT"` and `probePosture: "PRESENT"`.
- Descriptor with unsupported ABI or transport produces
  `bridgePosture: "ABI_UNSUPPORTED"` and `probePosture: "UNSUPPORTED"`.
- Malformed or incomplete descriptor produces
  `bridgePosture: "PROBE_OBSTRUCTED"` and `probePosture: "OBSTRUCTED"`.
- A supported bridge changes top-level `adapterPosture` to `CONFIGURED`, but
  `target-session --json` still reports `sessionPosture: "OBSTRUCTED"`.
- Echo family intake remains separate. `sessionFamilyIntake` says which
  session-family fields are visible; `echoAdapterProbe` says whether the adapter
  bridge is visible and compatible.

## Implementation Witness

This cycle landed:

- `src/app/echoAdapterProbe.ts`
- `LiveTargetInspection.echoAdapterProbe` for `jedit`
- `LiveEchoTargetSessionInspection.echoAdapterProbe`
- derived `jedit.adapterPosture` values for unavailable, configured,
  unsupported, and obstructed probe states
- CLI JSON coverage for `targets --json` and `target-session --json`
- MCP live-target parity through the existing `warp_ttd.inspect_live_targets`
  tool
- Manual and CLI/MCP documentation updates

## Playback Questions

1. Does `targets --json` expose `jedit.echoAdapterProbe`?
2. Does a missing root report `ROOT_UNAVAILABLE` without crashing?
3. Does a present root with no descriptor report `BRIDGE_ABSENT`?
4. Does a supported descriptor report `BRIDGE_PRESENT` and
   `adapterPosture: "CONFIGURED"`?
5. Does unsupported ABI become explicit unsupported posture instead of an open
   session claim?
6. Does malformed descriptor become obstruction instead of an inferred adapter?
7. Does `target-session --json` keep `jedit.sessionPosture: "OBSTRUCTED"` even
   when the bridge is present?
8. Does MCP expose the same read-only target posture?
9. Does `graft` behavior remain unchanged?

## Non-Goals

- No Echo session open.
- No browser attachment.
- No jedit editor operations.
- No Echo WAL parsing.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No strand creation.

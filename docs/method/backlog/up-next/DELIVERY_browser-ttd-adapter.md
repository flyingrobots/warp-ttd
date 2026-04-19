# Browser TTD delivery adapter

Build the first web delivery adapter for `warp-ttd`.

This should be treated as a delivery layer over the existing
`DebuggerSession`, not as a second browser-only debugger product.

## Goal

Prove the browser story with one narrow, honest slice:

- attach to a host adapter
- show current session mode and frame summary
- list worldlines / lanes
- render the neighborhood core view
- support basic playback controls

No second protocol. No browser-only session semantics. No Echo-owned debugger
ontology.

## Dependencies

- `0016-local-neighborhood-browser`
- `0017-neighborhood-protocol-shapes`
- `0018-browser-ttd-migration`
- `PROTO_echo-host-adapter`

## First cut

1. Define the browser delivery boundary in `warp-ttd`
2. Reuse the existing application/session core instead of rebuilding it in the
   browser
3. Start with a same-page Echo bridge path for proof-of-concept
4. Keep live / replay / debug signals visible from the start

## Non-goals

- polished production UI
- complete graph/provenance browser
- browser-specific protocol forks
- resurrecting Echo's old `ttd-app` inside `warp-ttd`

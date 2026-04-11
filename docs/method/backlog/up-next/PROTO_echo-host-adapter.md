# Echo host adapter

Implement `TtdHostAdapter` for Echo substrates.

Echo exposes a WASM/browser host boundary with observation and settlement
publication. The adapter should wrap that boundary and map it into
`warp-ttd` through Wesley-generated TypeScript family artifacts where the
shared Continuum contract exists, following the pattern established by the
git-warp adapter only for host mechanics, not for handwritten contract shapes.

Key mapping work:

- Frame indexing: Echo uses Lamport ticks, same as git-warp. The
  git-warp adapter's frame indexing logic is directly reusable.
- Receipts: Echo's `ProvenanceStore` exposes per-tick provenance.
  Map to `ReceiptSummary` envelopes.
- Effects: Echo's `FinalizedChannel` emissions map to
  `EffectEmissionSummary`.
- Playback: Echo's `PlaybackCursor` supports step/seek/modes.
- Shared proof-family nouns: neighborhood, reintegration, settlement, and
  receipt-shell surfaces should come from the Wesley-generated TypeScript side
  of the Continuum proof family rather than new handwritten adapter-local
  mirrors.

Echo is coordinating on their side to ensure the WASM ABI surface
is sufficient (see Echo backlog: `PLATFORM_echo-ttd-host-adapter`).

## Open question

Should this adapter consume Echo via WASM (in-browser) or via a
native Rust FFI? The WASM path matches the browser story. The native
path enables CLI/TUI debugging of Echo without a browser.

# Echo host adapter

Implement `TtdHostAdapter` for Echo substrates.

Echo exposes a WASM ABI (SPEC-0009) with `observe()`, `dispatch_intent()`,
and `scheduler_status()` exports. The adapter would wrap these and map
them to warp-ttd protocol envelopes, following the pattern established
by the git-warp adapter.

Key mapping work:

- Frame indexing: Echo uses Lamport ticks, same as git-warp. The
  git-warp adapter's frame indexing logic is directly reusable.
- Receipts: Echo's `ProvenanceStore` exposes per-tick provenance.
  Map to `ReceiptSummary` envelopes.
- Effects: Echo's `FinalizedChannel` emissions map to
  `EffectEmissionSummary`.
- Playback: Echo's `PlaybackCursor` supports step/seek/modes.

Echo is coordinating on their side to ensure the WASM ABI surface
is sufficient (see Echo backlog: `PLATFORM_echo-ttd-host-adapter`).

## Open question

Should this adapter consume Echo via WASM (in-browser) or via a
native Rust FFI? The WASM path matches the browser story. The native
path enables CLI/TUI debugging of Echo without a browser.

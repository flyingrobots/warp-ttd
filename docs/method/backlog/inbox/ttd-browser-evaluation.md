# Evaluate Echo's ttd-browser crate

Echo has a `ttd-browser` crate with WASM bindings for time-travel
debugging in the browser. It predates warp-ttd and wraps Echo's
warp-core primitives (cursors, sessions, transactions).

Questions to resolve:

1. Does warp-ttd need its own browser delivery adapter, or can
   `ttd-browser` serve as the Echo-specific browser adapter?
2. If warp-ttd builds a browser story, should it consume Echo via
   `ttd-browser`'s WASM exports or via the standard `TtdHostAdapter`
   interface over a message channel?
3. Is there overlap between `ttd-browser`'s cursor management and
   warp-ttd's `DebuggerSession`?

The likely answer: `ttd-browser` becomes the glue between Echo's
WASM kernel and warp-ttd's `TtdHostAdapter` interface in the browser.
But this needs evaluation once the Echo adapter design is clearer.

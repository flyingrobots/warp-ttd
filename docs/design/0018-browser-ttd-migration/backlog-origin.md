---
title: Browser TTD Migration Backlog Origin
status: proposed
---

# Browser TTD Migration

**Legend:** PROTO

This cycle promotes `docs/method/backlog/inbox/ttd-browser-evaluation.md`.

The inbox note asked the right question:

- does `warp-ttd` need its own browser delivery adapter?
- can Echo's `ttd-browser` serve as the Echo-specific browser path?
- where should browser debugger semantics actually live?

The answer is now clearer because nearby cycles established:

- `warp-ttd` owns debugger architecture and delivery adapters
- Echo owns substrate truth and browser-hostable WASM runtime
- local neighborhood/browser work belongs to `warp-ttd`, not to one host

So this cycle turns the old evaluation prompt into a concrete migration plan.

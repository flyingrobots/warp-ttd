---
title: Browser TTD Migration
status: proposed
---

# Browser TTD Migration

**Cycle:** 0018-browser-ttd-migration
**Legend:** PROTO

## Hill

Keep Echo-to-WASM as a hard requirement, but make the browser debugger a
`warp-ttd` delivery adapter rather than a second Echo-owned debugger product.

## Playback Questions

### Human

1. Can a human explain why the browser debugger belongs to `warp-ttd` while
   the in-browser runtime still belongs to Echo?
2. Can a human point to each legacy Echo-side TTD crate and say keep, narrow,
   or retire?
3. Can a human describe how `flyingrobots.dev` becomes "powered by Echo" and
   "inspectable by TTD" at the same time?

### Agent

1. Can an agent identify the long-term owner of browser debugger semantics?
2. Can an agent distinguish substrate bridge code from debugger-session/UI code
   during migration?
3. Can an agent tell which repo should receive each follow-on slice?

## Current Problem

Echo still carries browser/debugger-era prototypes:

- `crates/ttd-browser`
- `crates/echo-ttd`
- `crates/ttd-protocol-rs`
- `packages/ttd-protocol-ts`
- `apps/ttd-app`

Those artifacts came from a period when Echo was proving browser/WASM/time
travel ideas before `warp-ttd` existed as its own repo and product layer.

That history is valuable, but the ownership split is now different:

- Echo owns runtime truth, WASM ABI, provenance, receipts, channels, and hot
  execution semantics.
- `warp-ttd` owns debugger architecture, host-neutral protocol, session
  semantics, delivery adapters, and observer-facing product concepts.

If the browser story keeps living primarily inside Echo, the stack drifts back
toward two debugger ontologies:

- one in Echo's browser/WASM stack
- one in `warp-ttd`

That is exactly the kind of divergence the separate `warp-ttd` repo exists to
prevent.

## Decision

### 1. Browser TTD belongs to `warp-ttd`

The browser debugger is a delivery adapter over `warp-ttd` application/session
core, just like TUI, CLI, and MCP.

It is **not** an Echo-owned debugger product.

### 2. Echo remains browser-hostable substrate

Echo still compiles to WASM and still owns the underlying runtime. That is a
feature, not a problem.

The browser page can genuinely be powered by Echo while the debugger UI belongs
to `warp-ttd`.

### 3. `ttd-browser` becomes migration fuel, not destination

Echo's `ttd-browser` should be treated as a temporary or transitional browser
host bridge:

- useful while proving browser-hosted Echo integration
- not the long-term home of debugger session semantics
- not the long-term product identity for browser debugging

Short version:

- keep the WASM/browser substrate bridge
- stop letting it define the debugger

### 4. `apps/ttd-app` is a prototype reference, not the final browser product

The React/Vite app in Echo is useful proof material, but the long-term browser
debugger surface should move to `warp-ttd`.

That means:

- preserve useful UI ideas and interaction patterns
- do not let `apps/ttd-app` become a second canonical debugger

## Target Architecture

```text
Browser Page (flyingrobots.dev / future web apps)
  ├─ Echo WASM host app
  │   └─ Echo runtime + WASM ABI + app projections
  └─ Browser TTD (warp-ttd delivery adapter)
      └─ DebuggerSession + browser presentation
          └─ Echo browser host adapter
              └─ Echo WASM runtime
```

The page may embed both concerns at once:

- the app experience is genuinely driven by Echo
- the debugger attaches to that same substrate through a host adapter boundary

No network hop is required for the basic proof-of-concept. A same-page adapter
can call the Echo browser host bridge directly.

## What `flyingrobots.dev` Becomes

The desired twist survives:

1. a visitor opens the site
2. the site is actually running on Echo in the browser
3. the visitor opens a debugger panel
4. the panel is Browser TTD, not ad hoc Echo debug UI
5. the visitor can inspect worldlines, ticks, receipts, strands, and replay
   their visit

This is stronger than the old prototype story because the inspector now shares
the same debugger ontology as TUI/CLI/MCP instead of inventing a browser-only
one.

## Legacy Component Matrix

### Keep and narrow

- `crates/ttd-browser`
  - keep for now as a browser-facing Echo bridge
  - narrow toward host-adapter-friendly substrate access
  - stop adding debugger UX/session semantics here
- `crates/echo-ttd`
  - keep if it stays focused on compliance/runtime-side checking
  - do not let it accumulate browser UI or debugger orchestration
- `crates/ttd-protocol-rs`
  - keep as boring generated protocol consumer output
- `packages/ttd-protocol-ts`
  - keep as boring generated protocol consumer output

### Retire as product identities

- `crates/ttd-browser` as "the browser debugger"
- `apps/ttd-app` as "the canonical web debugger product"

Those identities should yield to Browser TTD in `warp-ttd`.

### Already removed

- Echo `ttd-manifest`
  - no reverse dependencies
  - not needed as a live crate

## Migration Phases

### Phase 1: Ownership cleanup

Owner:
- `warp-ttd`
- Echo

Work:
- keep protocol ownership explicit: `warp-ttd` schema is canonical
- keep Echo-generated consumers boring and downstream
- stop describing Echo browser prototypes as the debugger destination

Exit condition:
- repo truth says one clear thing about who owns browser debugger semantics

### Phase 2: Thin Echo browser host bridge

Owner:
- Echo

Work:
- shrink `ttd-browser` toward a browser-specific Echo host bridge
- expose only what a `warp-ttd` browser delivery adapter actually needs
- avoid duplicating `DebuggerSession`, neighborhood browser logic, or
  browser-only debugger ontology in Echo

Likely bridge responsibilities:
- call Echo WASM exports
- maintain browser-friendly handles to runtime objects
- surface host capabilities into a form that can back `TtdHostAdapter`

Likely things to remove or stop growing there:
- standalone debugger session orchestration
- browser-specific debugger product semantics
- any UI concepts that belong to `warp-ttd`

Exit condition:
- Echo has a bounded browser host bridge, not a second debugger

### Phase 3: Browser TTD in `warp-ttd`

Owner:
- `warp-ttd`

Work:
- add a web delivery adapter over the same application/session core used by the
  TUI
- reuse the protocol and host adapter boundary
- begin with narrow observation and playback, not full polish

Suggested first browser surface:
- connect/disconnect
- current frame summary
- worldlines/lane selector
- neighborhood browser core view
- replay/live/debug session signal indicators

Exit condition:
- `warp-ttd` can render a browser debugger against an Echo host adapter without
  redefining protocol or session semantics

### Phase 4: `flyingrobots.dev` proof of concept

Owner:
- Echo app side
- `warp-ttd` browser side

Work:
- run Echo in-browser for the site itself
- attach Browser TTD to the same runtime
- prove that one visit can be replayed and inspected honestly

Critical discipline:
- inputs must enter as causal intents
- browser side effects must respect replay/live/debug session signals
- no silent callback path that mutates causal truth outside the runtime

Exit condition:
- the site can truthfully say: "you have been using Echo the whole time"

## Repo Cuts

### `warp-ttd`

- define browser delivery adapter boundaries
- keep browser UI above `DebuggerSession`, not beside it
- promote `Browser TTD` as one delivery adapter among many

### Echo

- narrow `ttd-browser` into a bridge or compatibility layer
- keep compliance/runtime truth in Echo
- do not let app/browser prototypes redefine debugger semantics

### `flyingrobots.dev` or future app repo

- integrate Echo runtime as app substrate
- integrate Browser TTD as attachable observer surface
- keep app-side effects mode-aware (`LIVE`, `REPLAY`, `DEBUG`)

## Non-Goals

- deleting every old Echo-side TTD artifact immediately
- moving Echo runtime code into `warp-ttd`
- turning `warp-ttd` into a generic UI framework
- shipping a polished browser debugger in one cut

## Recommended Next Slice

1. In Echo, file or pull a bounded slice to narrow `ttd-browser` into a
   browser host bridge instead of a browser debugger product.
2. In `warp-ttd`, define the first Browser TTD delivery-adapter boundary and
   the minimal browser session shell.
3. After those land, build one same-page proof-of-concept where Browser TTD
   attaches to Echo-in-WASM.

# Guide — WARP TTD

This is the developer-level operator guide for WARP TTD. Use it for orientation, the productive-fast path, and to understand how the debugger orchestrates wide-aperture observation.

For deep-track doctrine, theoretical foundations (Observer Geometry), and custom host adapter development, use [ADVANCED_GUIDE.md](./ADVANCED_GUIDE.md).

## Choose Your Lane

### 1. Interactive Investigation (TUI)
Launch the interactive cockpit to navigate a worldline.
- **Run**: `npm run tui`
- **Navigate**: Use `n` (forward), `p` (backward), `g` (jump), and `[`/`]` (switch pages).
- **Pin**: Use `P` to pin an observation and compare it across different frames.

### 2. Standalone Automation (CLI)
Use the agent-native CLI for protocol walkthroughs or structured data export.
- **Handshake**: `npm run hello -- --json`
- **Inspect**: `npm run frame -- --json`
- **Catalog**: `npm run catalog -- --json`

### 3. Build a Host Adapter
Bridges your causal substrate into the TTD protocol.
- **Interface**: Implement `TtdHostAdapter` in `src/adapter.ts`.
- **Reference**: See `src/adapters/gitWarpAdapter.ts` for a production example.

## Big Picture: System Orchestration

WARP TTD is a tiered observer. You choose your depth based on the task:

1. **Delivery Adapters (Surfaces)**: The TUI and CLI are thin projections over the session state. They ensure that investigation is always a structured experience.
2. **DebuggerSession (The Brain)**: Manages investigator state, playback heads, and pinned facts. It ensures that context is preserved during complex navigation.
3. **Host Adapters (The Bridge)**: Translate substrate-specific facts (Git patches, Echo events) into the host-neutral protocol bedrock.

## Orientation Checklist

- [ ] **I am exploring a local graph**: Use the `git-warp` adapter in the TUI.
- [ ] **I want to see demo data**: Use the `Echo Fixture` in the TUI.
- [ ] **I am debugging protocol drift**: Check `schemas/warp-ttd-protocol.graphql`.
- [ ] **I am contributing to TTD**: Read `METHOD.md` and `docs/BEARING.md`.

## Rule of Thumb

If you need a comprehensive command reference, use [docs/CLI.md](./docs/CLI.md).

If you need to know "what's true right now," use [docs/BEARING.md](./docs/BEARING.md).

If you are just starting, use the [README.md](./README.md) and the orientation tracks above.

---
**The goal is to move the terminal from a collection of widgets to a professional application bedrock for systems investigation.**

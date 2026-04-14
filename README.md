# WARP TTD

A **time-travel debugger** (TTD) and **wide-aperture observer** for deterministic graph systems. WARP TTD observes *causal truth*—worldlines, receipts, and provenance—to provide a high-fidelity window into the evolution of **WARP-based runtimes**.

WARP TTD is a debug tool designed for the WARP systems engineer. It scales from simple protocol walkthroughs to multi-strand speculative investigation across heterogeneous hosts ([git-warp](https://github.com/git-stunts/git-warp), [Echo](https://github.com/flyingrobots/echo)).

![WARP-TTD](https://github.com/user-attachments/assets/ab986977-e298-43ec-8f37-57eaae488864)

## Why WARP TTD?

Unlike traditional debuggers that inspect transient state, WARP TTD inspects the causal history that produced that state.

- **Cross-Host Portability**: A *host-neutral* protocol allows the same debugger to serve git-warp, Echo, and future causal runtimes through capability-gated adapters.
- **Wide-Aperture Observation**: Inspect what was *admitted* (applied rewrites), what was *rejected* (counterfactuals), and the resulting *effect emissions* and *delivery observations*.
- **Causal Control**: *Pause*, *step* forward or backward, and *seek* through Lamport *ticks*. *Fork* **speculative strands** to explore alternatives without rewriting canonical history.
- **Deterministic Replay**: Built on the invariant that *history is immutable*. Every continuation is explicit, capability-gated, and provenance-bearing. Each tick is cryptographically deterministic, no matter what.

**WARP** is a causal computing paradigm that treats history as a first-class byproduct of computation. Because worldlines are patch-deterministic, there is no need to manually capture sessions or enable specialized time-travel debugging modes. Instead, the system produces **computational holograms**: compact boundary representations—consisting of an initial state and a **provenance payload**–that are information-complete for the entire interior derivation volume. These holograms enable the reconstruction of any state (up to isomorphism) at any point in history. Because WARP graphs are inherently holographic, the full deterministic causal history of a worldline is recoverable from its boundary encoding alone.

## Quick Start

### 1. Interactive TUI

Launch the reader-first interactive cockpit.

```bash
npm run tui
```

### 2. Standalone CLI

Handshake with a host or inspect the current playback frame.

```bash
npm run hello -- --json
npm run frame -- --json
```

### 3. Protocol First

The TTD protocol is defined via a single **GraphQL schema**. Protocol changes start here.

```text
schemas/warp-ttd-protocol.graphql
```

## Documentation

- **[Guide](./GUIDE.md)**: Orientation, the fast path, and TUI navigation.
- **[Advanced Guide](./ADVANCED_GUIDE.md)**: Theoretical foundations, Wesley integration, and custom adapters.
- **[Architecture](./ARCHITECTURE.md)**: The authoritative system map (Hexagonal, Ports, DebuggerSession).
- **[Vision](./VISION.md)**: Core tenets and the observer geometry mission.
- **[Method](./METHOD.md)**: Repo work doctrine and the cycle loop.

---
Built with geometric lawfulness by [FLYING ROBOTS](https://github.com/flyingrobots)

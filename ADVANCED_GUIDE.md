# Advanced Guide — WARP TTD

This is the second-track manual for WARP TTD. Use it when you need the deeper doctrine behind the theoretical foundations (Observer Geometry), Wesley protocol integration, and custom host-adapter implementation details.

For orientation and the productive-fast path, use the [GUIDE.md](./GUIDE.md).

## Theoretical Foundations

WARP TTD's architecture is grounded in the **AION Observer Geometry** papers and the **WARP Optics** formalism.

### Observer Geometry (OG-I)
An observer is not a scalar. It is a structural five-tuple:
- **Projection (O)** — what the debugger display shows
- **Basis (B)** — the native coordinate system of events
- **State (M)** — the accumulated observational state
- **Update (K)** — how new observations are integrated
- **Emission (E)** — the accumulated structural description produced

### Aperture
Aperture is the measure of what task-relevant distinctions survive observation.
- **Projection aperture** — what is visible in raw trace output
- **Basis aperture** — what is visible in native coordinates
- **Accumulated aperture** — what is visible after accumulation over time

### Degeneracy
Degeneracy is the hidden multiplicity behind an observation. The debugger's job is to **surface degeneracy**, not collapse it. Counterfactual inspection is the exploration of degeneracy—showing what *could* have happened.

## Worldlines & Suffix Transport (OG-IV)

Worldlines are not timelines. A worldline is a causal history—a chain of patches with deterministic materialization.
- **Common Frontier**: The last shared state between two worldlines.
- **Suffix Transport**: Replaying an effect across the unseen suffix of a target worldline.
- **State Convergence**: Arriving at the same state through different histories.

## Protocol Engineering (Wesley)

The TTD protocol is the sovereign boundary of the system. It is defined as a Wesley schema:
```text
schemas/warp-ttd-protocol.graphql
```

Wesley compiles this schema into:
1. **TypeScript Types**: Local mirror in `src/protocol.ts`.
2. **Zod Validators**: For runtime envelope verification.
3. **IR**: Intermediate representation for heterogeneous host-adapter codegen.

**Rule**: All protocol modifications MUST start in the `.graphql` file.

## Performance & Scaling

WARP TTD uses a "window-based" read model via `git-warp` to avoid whole-graph materialization. This ensures the TUI remains responsive even as the worldline grows to thousands of ticks.

---
**The goal is inevitably. Every continuation from the past is explicit, capability-gated, and provenance-bearing.**

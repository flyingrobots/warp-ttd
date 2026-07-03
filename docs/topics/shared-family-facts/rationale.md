# Shared-Family Facts rationale

## Why this layer exists

Family facts affect user interpretation of target evidence. This shelf exists so fact postures are resolved once, with explicit precedence, instead of being inferred differently in each caller.

## Why not fold this into session core

Session core owns snapshot structure and navigation. Fact posture policy is orthogonal and policy-heavy, so keeping it in a dedicated shelf avoids bloating session semantics with precedence-specific logic.

## Rejected alternatives

- **Ignore missing/invalid family posture fields:** rejected because silent dropping hides quality regressions.
- **Use a single global merge policy table at caller time:** rejected because it duplicates behavior and prevents single-point contract verification.
- **Treat malformed facts as fatal failures:** rejected to preserve operational continuity while preserving diagnostics.

## Required tradeoffs

This design favors explicit non-fatal posture flags and deterministic normalization over hard failure so user workflows remain observable when malformed metadata is present.


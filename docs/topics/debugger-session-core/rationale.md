# Debugger Session Core rationale

## Why this boundary exists

Session semantics are the shared truth for all runtime callers. The shelf isolates this semantic contract from adapter internals so callers can rely on stable session shape regardless of target details.

## Why this behavior moved here

Keeping snapshot assembly, capability gating, and pin lifecycle updates inside one boundary reduced duplication across CLI, MCP, and TUI consumers, and made compatibility failures visible as session-level contract violations.

## Rejected alternatives

- **Embed session logic in each interface:** rejected because it would duplicate invariants and hide breakages until downstream merge time.
- **Expose raw adapter output directly:** rejected because it would pass through unstable shapes and force every caller to reason about protocol edge cases.
- **Global mutable singleton session state:** rejected because it increases cross-command bleed and makes deterministic test fixtures harder to keep.

## Compatibility posture

This shelf is high-risk by design. Every signature change here requires explicit requirement rows, test updates, and downstream impact signoff.


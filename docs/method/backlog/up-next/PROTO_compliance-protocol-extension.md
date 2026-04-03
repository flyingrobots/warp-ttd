# Compliance reporting protocol extension

Echo has an `echo-ttd` crate with a `PolicyChecker` that produces
structured `Violation` records (policy, footprint, determinism,
hashing). These are valuable debugging information that warp-ttd
should surface in the TUI.

Proposed protocol additions:

- `ComplianceViolation` envelope: severity, code, message, channel_id,
  tick, rule_id
- `ComplianceSummary` envelope: violation counts by severity
- New capability in `HostHello`: `supports_compliance: true`
- New adapter method: `complianceViolations(headId, frameIndex?)`

This is capability-gated — the git-warp adapter would not implement
it (git-warp has no compliance checker). Echo's adapter would.

The TUI could show violations inline with the timeline: "tick 47:
3 admitted rewrites, 1 footprint violation."

Echo is coordinating on their side to propose the extension (see
Echo backlog: `KERNEL_compliance-protocol-envelope`).

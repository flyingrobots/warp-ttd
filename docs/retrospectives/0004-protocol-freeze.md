# Retrospective 0004 — Protocol Freeze (Cycle B)

**Date:** 2026-03-30

## What Shipped

1. `--json` flag on all 5 CLI commands (hello, catalog, frame, step, demo).
2. JSONL output format with `envelope` field identifying each protocol type.
3. Protocol contract tests pinning v0.1.0 envelope shapes (5 tests).
4. CLI JSON output contract tests (6 tests).
5. Design doc 0008 — protocol freeze specification.
6. LaneKind `"working-set"` renamed to `"strand"` across protocol, adapters,
   tests, and all design docs.
7. Version bump to v0.1.0.

## Playback — Agent Stakeholder

> Is the protocol version declared in `HostHello` meaningful and enforced?

**Yes.** Contract test asserts `protocolVersion === "0.1.0"`.

> Does every CLI command support `--json`?

**Yes.** All 5 commands tested. 6 tests verify JSONL output format.

> In `--json` mode, is 100% of stdout JSONL with no human text mixed in?

**Yes.** Test asserts every line starts with `{` and is valid JSON.

> Is there a test that pins the protocol envelope shapes at v0.1.0?

**Yes.** 5 tests pin exact field sets for each envelope type.

> Are protocol changes gated behind an explicit version bump?

**Yes.** Contract tests assert exact key sets. Any field change breaks tests.

## Playback — Human Stakeholder

James ran the TUI against a real git-warp repository and confirmed it works.
Reviewed the protocol questions and responded: "LGTM."

## Drift Check

No drift. Design doc 0008 specified 8 scope items; all 8 delivered as
specified. The `"working-set"` → `"strand"` rename was not in the original
scope but was the correct time to do it (pre-freeze).

## Tech/Design Debt

- CLI still hardcodes `EchoFixtureAdapter` — no `--adapter` flag for
  git-warp from the CLI. TUI handles this via the connect wizard.
- `printSection` (human mode) and `printJsonl` (JSON mode) have
  different signatures — the `label` parameter only exists in JSON mode.

## Cool Ideas

- `--json` mode could support `--envelope-filter` to stream only specific
  types (e.g., `--envelope-filter ReceiptSummary` for receipt-only output).
- Protocol version negotiation: adapter could declare minimum/maximum
  supported versions, consumer could request a specific version.

## Verdict

Clean cycle. Hill met. First versioned release. The protocol is frozen and
the machine-readable contract is pinned by tests. Validated against a real
git-warp repo.

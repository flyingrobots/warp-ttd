# Cycle B — Protocol Freeze

**Status:** queued

## Sponsor Human

Application developer who needs stable protocol envelopes to build tooling
against. Wants to know that `HostHello`, `PlaybackFrame`, and
`ReceiptSummary` shapes won't shift without a version bump.

## Sponsor Agent

Coding agent consuming TTD output programmatically. Needs `--json` on every
CLI command and a versioned protocol contract it can rely on.

## Hill

The read-only TTD protocol is frozen at v0.1.0 with explicit versioning,
and every CLI command produces structured JSONL output via `--json`.

## Playback Questions

- Is the protocol version declared in `HostHello` meaningful and enforced?
- Does every CLI command (`hello`, `catalog`, `frame`, `step`, `demo`)
  support `--json`?
- In `--json` mode, is 100% of stdout JSONL with no human text mixed in?
- Is there a test that pins the protocol envelope shapes at v0.1.0?
- Are protocol changes gated behind an explicit version bump?

## Non-Goals

- No Wesley/GraphQL integration yet.
- No new protocol concepts (strands, speculation, sessions).
- No schema code generation.

## Scope

1. Add `--json` flag to all CLI commands.
2. Pin protocol envelope shapes in tests (snapshot-style contract tests).
3. Document the frozen v0.1.0 protocol surface in a design doc.
4. Version bump to `0.1.0`, CHANGELOG entry, git tag.

# Design Doc 0011 — writerId on ReceiptSummary

**Status:** closed
**Cycle:** 0007-writer-id

## Sponsor Human

Developer inspecting a multi-writer lane. Currently sees "3 admitted,
1 rejected" but not WHO wrote the admitted rewrites or WHO was
rejected. The `summary` string mentions the writer, but it is not
structured — it cannot be filtered, sorted, or used for provenance
queries.

## Sponsor Agent

Coding agent building a provenance trace. Needs `writerId` as a
structured field to correlate receipts with writers without parsing
human-readable summary strings.

## Hill

`ReceiptSummary` carries an optional `writerId` field. The git-warp
adapter populates it from `TickReceipt.writer`. The echo fixture and
scenario adapters include it in their fixture data. The protocol
contract test pins the field. The TUI and CLI surface it.

## Changes

### Protocol type

Add `writerId?: string` to `ReceiptSummary`. Optional to preserve
backward compatibility with adapters that don't have writer info.

### GraphQL schema

Add `writerId: String` (nullable) to `type ReceiptSummary`. Bump the
`@wes_version` annotation to `(major: 0, minor: 2)`.

### git-warp adapter

Map `TickReceipt.writer` to `ReceiptSummary.writerId`. The data
already exists at `src/adapters/gitWarpAdapter.ts` line 34
(`readonly writer: string`).

### Echo fixture adapter

Add `writerId` to the existing receipt fixture data. The echo fixture
has two receipts: one for `"echo-writer"` and one for
`"sandbox-writer"`.

### Scenario fixture adapter

`ScenarioReceipt` already has a `writerId` field. Map it into the
generated `ReceiptSummary`.

### TUI

Add writerId column to the receipts table in the Navigator view.

### CLI

The `--json` output already includes all `ReceiptSummary` fields via
`JSON.stringify`. No CLI code change needed — `writerId` will appear
automatically once the protocol type includes it.

### Protocol contract test

Add `writerId` to the ReceiptSummary shape assertion.

## Playback Questions

1. Does `ReceiptSummary` have an optional `writerId` field?
2. Does the git-warp adapter populate it from `TickReceipt.writer`?
3. Does the echo fixture include `writerId` in receipt data?
4. Does the scenario adapter map `ScenarioReceipt.writerId`?
5. Does the protocol contract test pin the field?
6. Does the TUI display writerId in the receipts table?

## Non-Goals

- Not changing the per-lane receipt model.
- Not adding per-operation detail.
- Not making writerId required — adapters without writer info omit it.

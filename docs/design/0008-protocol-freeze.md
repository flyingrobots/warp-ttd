# 0008 — Protocol Freeze (v0.1.0)

**Status:** in progress
**Cycle:** B — Protocol Freeze

## Context

The TTD protocol has been proven across two adapters (echo fixture,
git-warp) and a TUI. The envelope shapes are stable. It is time to
freeze the protocol at v0.1.0 so downstream consumers can build against
a versioned, machine-readable contract.

## Frozen Envelope Set

The following types constitute the v0.1.0 read-only protocol surface.
No fields may be added, removed, or retyped without a protocol version
bump.

| Type | Fields |
|------|--------|
| `HostHello` | hostKind, hostVersion, protocolVersion, schemaId, capabilities |
| `LaneCatalog` | lanes: LaneRef[] |
| `LaneRef` | id, kind, parentId?, writable, description |
| `Coordinate` | laneId, tick |
| `PlaybackHeadSnapshot` | headId, label, currentFrameIndex, trackedLaneIds, writableLaneIds, paused |
| `PlaybackFrame` | headId, frameIndex, lanes: LaneFrameView[] |
| `LaneFrameView` | laneId, coordinate, changed, btrDigest? |
| `ReceiptSummary` | receiptId, headId, frameIndex, laneId, inputTick, outputTick, admittedRewriteCount, rejectedRewriteCount, counterfactualCount, digest, summary |

Supporting types: `HostKind`, `LaneKind`, `Capability`.

## Protocol Version Semantics

`HostHello.protocolVersion` is the contract version. Rules:

- `0.1.0` = first frozen read-only surface
- Patch bump (0.1.x): documentation, clarification, no shape changes
- Minor bump (0.x.0): additive fields (new optional fields, new
  capability strings, new envelope types)
- Major bump (x.0.0): breaking changes (removed fields, type changes,
  semantic changes)

Adapters MUST declare `protocolVersion: "0.1.0"` in their HostHello.
Consumers MAY check this field to verify compatibility.

## CLI `--json` Mode

Every CLI command supports `--json`. In JSON mode:

- 100% of stdout is JSONL (one JSON object per line)
- No human-readable labels, headers, or decorations on stdout
- Errors go to stderr as JSON: `{"error": "message"}`
- Each line has an `"envelope"` field identifying the type

### Output format per command

**`hello --json`**
```jsonl
{"envelope":"HostHello","data":{...}}
```

**`catalog --json`**
```jsonl
{"envelope":"LaneCatalog","data":{...}}
```

**`frame --json`**
```jsonl
{"envelope":"PlaybackHeadSnapshot","data":{...}}
{"envelope":"PlaybackFrame","data":{...}}
{"envelope":"ReceiptSummary","data":{...}}
```
(One line per receipt; empty if no receipts at current frame.)

**`step --json`**
```jsonl
{"envelope":"PlaybackHeadSnapshot","data":{...},"label":"before"}
{"envelope":"PlaybackFrame","data":{...},"label":"stepped"}
{"envelope":"PlaybackHeadSnapshot","data":{...},"label":"after"}
{"envelope":"ReceiptSummary","data":{...}}
```

**`demo --json`**
All envelopes from the full demo sequence, one per line.

## Contract Tests

Snapshot-style tests pin the exact shape of each envelope type at v0.1.0.
These tests assert:

1. Every required field is present and correctly typed
2. No unexpected fields are present
3. `protocolVersion` is `"0.1.0"`

If a future change breaks a contract test, that is the signal to bump
the protocol version.

## Scope

1. Add `--json` flag parsing to CLI
2. Implement JSONL output mode for all 5 commands
3. Add contract tests pinning v0.1.0 envelope shapes
4. Add `--json` output contract tests
5. Write design doc (this file)
6. Bump package.json to `0.1.0`
7. CHANGELOG entry
8. Git tag `v0.1.0`

## Key Files

- `src/cli.ts` — `--json` flag, JSONL output
- `src/protocol.ts` — no changes (shapes already correct)
- `test/protocolContract.spec.ts` — new, pins envelope shapes
- `test/cliJson.spec.ts` — new, pins `--json` output format

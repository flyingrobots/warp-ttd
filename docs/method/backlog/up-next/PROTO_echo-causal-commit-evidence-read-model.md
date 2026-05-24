# Echo causal commit evidence read model

- Lane: `up-next`
- Legend: `PROTO`
- Rank: `0`

## Why

Echo is defining a causal WAL for durable accepted submissions, tick outcomes,
recovery certificates, and retained-material references. WARP TTD should not
own that WAL or parse raw WAL segments, but it must eventually inspect
Echo-projected durability evidence for serious `jedit` debugging.

The key question after restart is:

```text
Was this submitted intent durably accepted into Echo causal history?
```

WARP TTD should answer that through read-only commit evidence posture, not by
becoming a second Echo recovery engine.

## Hill

WARP TTD exposes Echo causal commit evidence through adapter-capability-gated,
host-neutral read models so agents and operators can distinguish accepted,
pending, decided, rejected, obstructed, and recovery-faulted causal history.

## Required Separation

- Echo owns WAL storage, validation, recovery, truncation, and runtime
  admission semantics.
- WARP TTD owns inspection, correlation, explanation, CLI JSON, MCP, and later
  rendering.
- `DebuggerSession` must not gain raw WAL read or recovery methods.
- Missing durability evidence must be explicit absence, not inferred from a
  receipt.

## First Cut

1. Add `READ_CAUSAL_COMMIT_EVIDENCE` once an Echo adapter can truthfully expose
   it.
2. Add optional commit evidence references to receipt, reading, admission, and
   session-family facts.
3. Add `CausalCommitEvidence` and `RecoveryEvidence` read models.
4. Add fixtures before Echo's real WAL is available:
   - accepted pending with commit evidence;
   - decided with tick receipt commit evidence;
   - receipt present but durability unavailable;
   - missing retained material obstruction;
   - clean tail truncation;
   - recovery fault.
5. Expose the model through CLI JSON and MCP before TUI.

## Non-Goals

- No raw Echo WAL parser in WARP TTD core.
- No WAL tail truncation.
- No Echo runtime recovery.
- No debugger-forced recovery posture changes.
- No jedit editor semantics in the durability model.
- No TUI-first WAL view.

## Repo Evidence

- `docs/design/0042-echo-causal-commit-evidence-read-model/echo-causal-commit-evidence-read-model.md`
- `docs/design/0024-admission-chain-read-model/admission-chain-read-model.md`
- `docs/design/0026-debugger-native-shared-family-boundary/debugger-native-shared-family-boundary.md`
- `docs/BEARING.md`

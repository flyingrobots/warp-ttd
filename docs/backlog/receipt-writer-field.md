# Add writerId to ReceiptSummary

**Status:** closed

## Problem

`ReceiptSummary` does not carry a `writerId` field. When multiple writers
contribute to the same lane at the same tick, the receipt display shows
aggregate counts but not WHO wrote what. The writer info exists in
git-warp's `TickReceipt.writer` but is lost in the protocol mapping.

## Context

- warp-ttd steps one or more worldlines together per frame
- Each lane gets one or more receipts per tick (one per writer)
- Writers may write to different worldlines independently
- The `summary` string mentions the writer, but it's not structured

## Proposed Change

Add `writerId?: string` to `ReceiptSummary`. Optional to preserve
backward compatibility. The git-warp adapter already has this data.

This is a protocol change (minor bump — additive optional field).

## Non-Goals

- Not changing the per-lane receipt model
- Not adding per-operation detail (individual ops stay in the summary)

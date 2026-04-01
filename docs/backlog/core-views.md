# Core Views — Worldline, Graph, Provenance

**Status:** queued

## Problem

The TUI currently has a Navigator page that shows frame/receipt/effect
data in stacked boxes, but lacks the three foundational debugging views
that make TTD a real instrument:

1. No worldline history view (git-log-like timeline of ticks)
2. No graph state viewer (nodes, edges, properties, attachments)
3. No provenance viewer (reverse causal cone of a selected value)

## Views

### Worldline Viewer

Like `git log` — ticks as commits, strands as branches.

Protocol requirements:
- `laneCatalog()` for worldline/strand tree
- `frame()` at each tick for lane advancement
- `receipts()` for BTR digests (writer info pending — see receipt-writer-field backlog)
- Need: full tick history enumeration (not just step-by-step)

### WARP Graph Viewer

Full materialized graph at a tick: nodes, edges, properties,
attachments plane.

Protocol requirements:
- Need new adapter methods: `graphState(headId, frameIndex)` or
  similar, returning nodes/edges/properties
- Need: content/attachment access (by hash)
- git-warp has `getNodes()`, `getEdges()`, `getNodeProps()` —
  need to expose through TtdHostAdapter

### Provenance Viewer

Select a value → trace its reverse causal cone through BTR chain.

Protocol requirements:
- Need: per-entity receipt query (which receipts touched entity X)
- git-warp has `patchesFor(entityId)` — need to expose
- Need: per-operation detail in receipts (not just aggregate counts)
- Need: writerId on ReceiptSummary

## Dependencies

- writerId on ReceiptSummary (see receipt-writer-field.md)
- DebuggerSession (scopes navigation state across views)
- Design Vocabulary audit (worldline not timeline, tick not frame)
- Protocol additions for graph state and per-entity provenance queries

## Implementation Order

1. Worldline viewer first (mostly uses existing protocol surface; needs tick-history enumeration beyond step-by-step)
2. Graph viewer second (needs protocol additions for graph state)
3. Provenance viewer third (needs per-entity receipt queries)

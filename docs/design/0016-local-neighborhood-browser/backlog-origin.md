---
title: Local Neighborhood Browser Backlog Origin
status: proposed
---

# Local Neighborhood Browser

**Legend:** CV (CORE_VIEWS)

This cycle promotes `docs/method/backlog/up-next/counterfactual-inspection.md`,
but broadens it deliberately.

The old backlog item was directionally right:

- rejected receipts are counterfactuals
- the debugger should inspect them
- strand forking and comparison should eventually grow from that site

But the Continuum witness work clarified that "show the rejected receipts" is
still too thin. The real product object is a **local neighborhood browser**
that can distinguish:

- law-bearing site truth
- reintegration-bearing seam truth
- richer receipt / explanation shell

That wider framing also pulls two nearby backlog items into the same orbit:

- `docs/method/backlog/up-next/CV_provenance-viewer-design.md`
- `docs/method/backlog/up-next/inspector-redesign.md`

Those are not separate universes. They are neighboring slices over the same
local causal neighborhood.

## Origin

Continuum design packets `0010` through `0013` established:

- `R_core = (J, K, V)`
- `W_core`
- `ReceiptRecord = (W_core, S_receipt)`
- core refinement versus shell refinement

That made it clear that `warp-ttd` should not treat:

- site identity
- reintegration law/evidence
- counterfactual alternatives
- receipt explanation

as one undifferentiated payload.

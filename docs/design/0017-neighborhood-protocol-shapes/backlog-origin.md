---
title: Neighborhood Protocol Shapes Backlog Origin
status: proposed
---

# Neighborhood Protocol Shapes

**Legend:** PROTO

This cycle is the first concrete follow-up promised by
`0016-local-neighborhood-browser`.

That cycle established the product object:

- one local neighborhood browser
- neighborhood core
- reintegration panel
- receipt shell

But it stopped short of saying what the shared contract surface should actually
look like.

This cycle answers exactly that question at the minimum useful level.

## Origin

Two pressures met here:

1. The Continuum witness work clarified:
   - `W_core`
   - `R_core`
   - `ReceiptRecord = (W_core, S_receipt)`
2. `warp-ttd` needs a host-neutral protocol shape before Echo can honestly
   align to it.

So this cycle is the point where the witness math becomes a protocol target.

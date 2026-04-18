---
title: Local Neighborhood Browser
status: proposed
---

# Design Doc — Local Neighborhood Browser

**Cycle:** 0016-local-neighborhood-browser
**Legend:** CV (CORE_VIEWS)
**Type:** feature cycle

## Sponsor Human

Debugger user investigating a local causal site and asking:

- what happened here?
- what else could have happened nearby?
- why did this alternative fail?
- what hidden seam made this one fit?

This user does not want three disconnected surfaces for:

- worldline timeline
- provenance trace
- receipt dump

They want one local place to inspect a site honestly.

## Sponsor Agent

Agent comparing Echo and `git-warp` host behavior at one local site. Needs to
distinguish:

- law-bearing site truth
- reintegration-bearing seam truth
- richer explanatory shell

Without that split, the agent cannot tell whether two hosts:

- agree on the same core judgment
- disagree only in shell richness
- or genuinely disagree about lawful local structure

## Hill

Define a TTD neighborhood browser that treats a local site as a structured
object with three layers:

1. **core witness view**
   - the local site identity and nearby lawful alternatives
2. **reintegration view**
   - seam anchors, obligations, and hidden compatibility evidence
3. **receipt shell view**
   - candidate search, rejection explanations, scheduling / provenance detail

The browser must make counterfactual inspection, provenance inspection, and
inspector redesign converge into one honest surface instead of three drifting
ideas.

## Playback Questions

### Human

1. Can I inspect one local site without reading a raw receipt dump?
2. Can I tell what the nearby alternatives were?
3. Can I tell why one alternative fit and another failed?
4. Can I tell the difference between core truth and extra explanation?

### Agent

1. Can I separate law-bearing site truth from richer receipt shell?
2. Can I compare two hosts and tell whether they share the same core judgment?
3. Can I ask for reintegration-specific detail without dragging in the whole
   receipt shell?
4. Can I see counterfactual alternatives, seam obligations, and provenance
   explanation as one neighborhood object?

## Current Problem

`warp-ttd` currently has good pieces, but they are drifting:

- `0014-worldline-view-rethink` fixes lane topology and per-lane history
- `counterfactual-inspection.md` wants rejected receipts to become a debugger
  feature
- `CV_provenance-viewer-design.md` wants reverse causal explanation
- `inspector-redesign.md` calls out that the Inspector is just a data dump

Those are all symptoms of the same missing product object:

**a local neighborhood around one causal site.**

Without that object, the product will keep producing one of two bad outcomes:

- a flat receipt dump with too much shell and not enough structure
- or thin views that show "what happened" but not "why this fit"

## Core Design Decision

The browser is not "a receipt viewer."

The browser is a **local neighborhood viewer** with three explicit layers:

### 1. Neighborhood Core

This corresponds conceptually to `W_core`.

It should answer:

- what site is this?
- which lanes participate?
- what nearby alternatives exist?
- which are lawful, obstructed, or pending?

This is the law-bearing center.

### 2. Reintegration Panel

This corresponds conceptually to `R_core`.

It should answer:

- where does this site stitch back into the larger whole?
- what obligations bind at those seams?
- what hidden evidence explains fit or failure?

This is the seam-specific explanation layer.

### 3. Receipt Shell Panel

This is the richer explanatory refinement.

It may answer:

- which candidates were considered?
- what blocking relation applied?
- what rejection reasons were recorded?
- what extra runtime or provenance details exist?

This is not the core truth.
It is optional enrichment around that core.

## Product Shape

The simplest honest shape is:

```
┌─ Lane / Site List ───────┬─ Neighborhood Core ───────┬─ Detail Tabs ──────────┐
│ lane tree / local sites  │ site identity             │ [Reintegration]        │
│ current lane highlighted │ participating lanes       │ seam anchors           │
│ candidate sites nearby   │ nearby alternatives       │ obligations            │
│                          │ lawful / obstructed       │ hidden fit evidence    │
│                          │                           │                        │
│                          │                           │ [Receipt Shell]        │
│                          │                           │ candidates considered  │
│                          │                           │ blocking / reasons     │
│                          │                           │ provenance detail      │
└──────────────────────────┴───────────────────────────┴────────────────────────┘
```

The exact rendering may change later, but the semantic split should not.

## What Counts As A "Local Site"

A local site is not simply:

- one receipt
- one frame
- one row in a table

It is a bounded neighborhood anchored at a causal coordinate, lane selection,
or explicit obstruction/counterfactual site.

At minimum it should carry enough identity to say:

- current coordinate
- selected lane or participating lanes
- local footprint / neighborhood boundary
- current outcome or obstruction status

That is the site anchor.

## How Existing Features Re-map

### Counterfactual inspection

Becomes:

- one view into the neighborhood core
- especially the nearby alternatives and rejected outcomes

Not a separate universe.

### Provenance viewer

Becomes:

- one explanatory path over the same site
- especially in the receipt shell and reintegration panels

Not a separate universe.

### Inspector redesign

Becomes:

- the old Inspector is replaced or absorbed by the neighborhood browser for
  local site questions
- raw host metadata and catalog dumps move elsewhere or stay secondary

Not a separate universe.

## Host-Neutral Contract Direction

This cycle is still design, but the direction is already clear.

The future protocol surface should avoid one undifferentiated payload for:

- site identity
- nearby alternatives
- seam obligations
- hidden fit evidence
- candidate search explanation

Instead it should make room for at least:

- a minimal neighborhood-core shape
- a reintegration detail shape
- a receipt-shell shape

That gives Echo and `git-warp` a shared contract target without requiring them
to flatten hot-runtime truth and cold-substrate truth into one debugger blob.

## What This Buys

For the human:

- fewer opaque IDs and dumps
- clearer answer to "why this one?"
- one place to inspect nearby alternatives

For the agent:

- cleaner host comparisons
- cleaner split between core disagreement and shell richness
- a future path to machine-readable counterfactual / provenance inspection

For the stack:

- a product surface that actually respects the witness math

## Non-Goals

- Final protocol schema in this cycle
- Strand forking implementation
- Full provenance graph rendering
- Replacing `0014-worldline-view-rethink`
- Solving all Echo adapter needs in this cycle
- General-purpose graph query UI

## Expected Outputs

- One follow-up design or backlog slice for:
  - minimal neighborhood-core protocol shape
- One follow-up design or backlog slice for:
  - reintegration panel semantics
- One explicit decision on how the old Inspector relates to this surface
- One explicit decision on whether counterfactual inspection backlog can be
  retired into this cycle's follow-up work

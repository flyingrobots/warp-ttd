---
title: PROTO neighborhood core cutover
status: proposed
priority: 1
impact: high
confidence: high
---

# Cut host inspection surfaces over to neighborhood core and receipt shell

## Why

The current debugger still risks collapsing three different things back into one
inspector blob:

- law-bearing local site truth
- reintegration / seam detail
- explanatory runtime shell

The Continuum witness stack gave us a cleaner split:

- `NeighborhoodCoreSummary`
- `ReintegrationDetailSummary`
- `ReceiptShellSummary`

That split now needs to drive actual adapter and session work.

## Goal

Make the host-facing protocol and session model prefer the explicit three-layer
shape over older "frame + receipt dump" habits.

## First concrete cuts

1. Add the minimal `NeighborhoodCoreSummary` path to the session model
2. Add `ReintegrationDetailSummary` as the first-class cash-out of reintegration
   core
3. Keep `ReceiptShellSummary` optional and explanatory
4. Audit existing inspector surfaces so receipt shell never redefines core

## Host expectations

- `git-warp` will likely surface narrow core plus limited shell first
- Echo should pressure-test reintegration detail harder
- browser/TUI views should render core first, seam detail second, shell last

## Why this matters

- keeps the debugger aligned with the ownership map
- prevents receipt sludge from becoming the public contract again
- gives Wesley a cleaner family boundary to compile later

## Dependencies

- `0016-local-neighborhood-browser`
- `0017-neighborhood-protocol-shapes`
- `0014-shared-noun-ownership-map` in Continuum

---
title: CV kairotic neighborhood scoped worldlines
status: proposed
priority: 1
impact: high
confidence: high
---

# Scope worldlines view to the local Kairotic neighborhood

## Why

The current worldlines work is still slightly too repo-global. After the
Continuum lane and witness packets, the cleaner rule is:

- the worldlines panel is a Kairotic selection view
- the selected lane timeline inside it is Chronotic

That means the default worldlines surface should not dump every strand the host
knows about. It should show the lanes relevant to the current local site.

## Desired behavior

Anchor the view at the current coordinate and local site, then show only lanes
that matter to that neighborhood.

Examples of relevance:

- shares the current precursor / merge site
- contributes visible state at the current coordinate
- intersects the current footprint in a read, write, affect, or reintegration
  way
- participates in the current local alternative set or obstruction

## Why this matters

- makes the worldlines view match the new lane ontology
- keeps speculative strand noise out of the default debugging path
- gives the browser and TUI a sane first filter before rulial-ball or aperture
  filtering
- aligns the product with `0016-local-neighborhood-browser` and the Continuum
  witness stack

## Dependencies

- `0016-local-neighborhood-browser`
- `0017-neighborhood-protocol-shapes`
- local host support for neighborhood participation / lane relevance

## First cut

1. Define a neighborhood-scoped lane list in application state
2. Use it as the default source for the worldlines panel
3. Make off-neighborhood lane expansion an explicit secondary action, not the
   default

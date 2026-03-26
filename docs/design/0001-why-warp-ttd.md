# 0001: Why WARP TTD

**Status:** DESIGN
**Date:** 2026-03-26

## Purpose

This note defines what WARP TTD is and what it is not.

WARP TTD is not merely:

- a browser UI
- a CLI subcommand family
- a panel embedded inside a host application
- a pile of host-specific debug helpers

WARP TTD is a cross-host debugger for deterministic graph systems built on
WARP-like causal history.

Its job is to let humans inspect and reason about:

- worldlines
- immutable snapshots
- observer-relative views
- provenance
- receipts
- conflicts
- counterfactuals
- forks and speculative continuations

without rewriting the causal model for each host.

## Core Thesis

TTD is the observer of worldlines.

More concretely, it is a:

- deterministic replay inspector
- conflict and interference explorer
- provenance lens
- boundary transition visualizer
- counterfactual comparison tool

This matters because the debugger is not just a rendering surface. It is a
structured observer over causal history.

## Why A Separate Repo

TTD now spans concerns that cut across multiple projects:

- `git-warp` owns a substrate and thin operational debug surfaces
- `echo` already proved some browser/WASM/playback ideas
- `xyph` is the human-facing application context driving the debugger DX
- `wesley` opens a schema/compiler path for shared protocol and type contracts

That means TTD is no longer "just a folder in Echo" or "just a command family
in git-warp." It is a product and architecture layer in its own right.

## Product Goals

1. Give a human one coherent playback story over many causal lanes.
2. Preserve substrate honesty: no fake global time, no magical mutation path.
3. Make provenance, conflicts, and counterfactuals inspectable rather than
   implicit.
4. Support host-neutral tooling so Echo and git-warp do not grow separate
   debugger ontologies.

## Non-Goals

This repo does not exist to:

1. absorb the substrate implementation from `git-warp` or Echo
2. define a universal GUI framework
3. replace host-owned runtime internals
4. make WARP look like a generic web API product

## Architectural Position

The clean split is:

- substrate repos own causal truth
- `warp-ttd` owns debugger architecture and host-neutral protocol concepts
- host adapters bridge the debugger to each runtime

This also clarifies the role of `PlaybackHead`:

- `PlaybackHead` is a substrate-facing coordination primitive
- TTD is the human-facing debugger system built around such primitives

TTD therefore sits above substrate truth but below host-specific presentation.

## Immediate Consequence

The first milestone for this repo is not "ship the whole debugger."

It is:

1. define the debugger's identity clearly
2. define the protocol surface it needs
3. define the schema/codegen strategy carefully
4. keep the trusted semantics deterministic and narrow

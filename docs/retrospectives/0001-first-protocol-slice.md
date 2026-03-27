# 0001: First Protocol Slice Retrospective

**Date:** 2026-03-26
**Slice:** handwritten protocol + one fixture adapter + one dumb CLI + spec tests

## What We Set Out To Prove

The goal of the first implementation slice was intentionally narrow:

1. define a finite host-neutral protocol surface by hand
2. expose it through one host-shaped adapter
3. consume it from one dumb client
4. make the behavior executable through tests

This slice was explicitly pre-Wesley and pre-GraphQL.

## What Worked

1. The protocol can stay small and still feel real.
2. One host-shaped adapter is enough to prove the basic TTD data flow.
3. Node's built-in TypeScript stripping support lets the repo stay
   zero-dependency for now.
4. The spec tests are a much better anchor than more prose for this slice.

## What We Learned

1. The minimal envelope set is plausible:
   - `HostHello`
   - `LaneCatalog`
   - `PlaybackHeadSnapshot`
   - `PlaybackFrame`
   - `ReceiptSummary`
2. `PlaybackHead` plus `PlaybackFrame` is already enough to express a coherent
   stepping story without inventing fake global substrate time.
3. Receipts belong in the first slice. Without them, the debugger becomes a
   state viewer rather than an explanation surface.

## What Stayed Intentionally Out Of Scope

1. real host integration
2. Wesley generation
3. GraphQL schema authoring
4. rich UI
5. generic query semantics

Keeping these out was correct. The slice would have become muddy otherwise.

## What Needs To Happen Next

1. replace the fixture with one real adapter
2. decide whether Echo or git-warp is the first real target
3. keep the protocol narrow while proving cross-host reuse
4. only then bring Wesley into the loop for codegen/schema authority

## Verdict

This slice succeeded.

It did not prove the full architecture, but it proved the right next thing:
the debugger can be treated as a finite protocol over host adapters rather than
as a vague UI idea.

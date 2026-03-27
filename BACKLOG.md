# BACKLOG

## Current Slice

- [x] carve out `warp-ttd` as its own repo
- [x] capture the first architecture/docs set
- [x] define the first narrow protocol slice
- [x] build one host-shaped adapter and one dumb client
- [x] add tests that act as the spec for the current slice
- [ ] keep the protocol slice intentionally pre-Wesley and pre-GraphQL

## Next

- [ ] replace the in-memory Echo fixture with a real host adapter
- [ ] choose whether Echo or git-warp is the first real adapter target
- [ ] freeze the minimal read-only TTD protocol more formally
- [x] extract a first retrospective for the protocol spike

## Wesley / Schema

- [ ] inspect Echo's existing TTD protocol artifacts in more detail
- [ ] inspect Wesley generation paths relevant to protocol/type/codec output
- [ ] decide the first schema family to formalize in `warp-ttd`
- [ ] define the first Wesley profile constraints as executable checks

## Product / UX

- [ ] define `DebuggerSession` more concretely
- [ ] define the first minimal TTD client workflow beyond the current CLI demo
- [ ] decide what is mandatory in a first `PlaybackHead` snapshot versus deferred

## Risks To Watch

- [ ] GraphQL ecosystem creep into trusted semantics
- [ ] schema over-unification too early
- [ ] TTD scope creep into execution/orchestration ownership
- [ ] confusing compile-time footprint enforcement with full correctness proof

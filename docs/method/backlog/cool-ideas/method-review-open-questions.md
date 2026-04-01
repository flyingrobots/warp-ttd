# METHOD Review — Open Questions

**Status:** cool idea (not a commitment)

Consider whether these belong in METHOD.md, and if so, where:

1. **Escape hatch** — when to break the loop. Hotfixes, security
   patches, "production is on fire." Sometimes you skip to step 3
   and backfill. Every good system acknowledges its own exceptions.

2. **Cool-ideas review cadence** — cool ideas go in the drawer, but
   when does someone open the drawer? Purely opportunistic? Or is
   there a moment in the loop (maybe the retro) where you glance at
   cool-ideas and see if anything graduated?

3. **Legend creation guidance** — when does a domain earn a legend vs.
   just using a bare filename? Is there a threshold?

4. **Decisions live here, not there** — the current position is that
   design docs + retros + git history IS the decision record. If
   that's intentional, state it explicitly so nobody creates an
   `adr/` directory.

5. **Quality gates** — Method describes the workflow loop but not the
   quality contract (linting, type checking, CI). Should Method have
   an opinion, or is CONTRIBUTING.md the right home?

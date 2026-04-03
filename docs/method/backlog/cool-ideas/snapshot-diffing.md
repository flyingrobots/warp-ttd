# Snapshot Diffing

At any two ticks, show what changed in the materialized graph. Not
just "these ops were applied" but "these nodes/edges were
added/removed/modified."

Like `git diff` but for graph state. The protocol already has the
pieces — materialize at tick A, materialize at tick B, diff the
two snapshots. The missing part is the diff algorithm and a
readable output format.

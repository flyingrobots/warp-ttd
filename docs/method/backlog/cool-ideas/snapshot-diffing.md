# Snapshot Diffing

At any two bases, show what changed between graph-shaped materialized readings.
Not just "these ops were applied" but "these nodes/edges were
added/removed/modified in this reading."

Like `git diff`, but for observer-relative readings. The protocol needs the
pieces to name reading A, reading B, their bases, observer plans, postures, and
backing witnesses before diffing the rendered payloads. The missing part is the
diff algorithm and a readable output format.

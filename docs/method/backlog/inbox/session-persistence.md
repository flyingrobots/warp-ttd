# Session Persistence

DebuggerSession has `toJSON()` but no load path. What if sessions
could be saved and restored?

- Resume a debugging session where you left off
- Share a session with someone (or an agent) for pair-debugging
- Attach a session snapshot to a bug report

The serialized form already exists. The missing piece is a
`fromJSON()` constructor and a storage convention.

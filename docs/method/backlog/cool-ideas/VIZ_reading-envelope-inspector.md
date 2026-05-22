# Reading envelope inspector

If the stack is serious that observation is more than "payload after query,"
`warp-ttd` should eventually have a view that makes the full reading envelope
visible.

## Why now

As shared read-side families mature, debugger users and maintainers will need
to see more than the rendered payload:

- plan identity
- coordinate/frontier
- witness reference
- rights and budget posture
- plurality or obstruction posture

Without a dedicated inspection view, those semantics will tend to disappear
behind summarized panels and adapter-specific wrappers.

## Hill

One debugger surface can show a reading as an actual envelope instead of a
payload blob.

## Done looks like

- one panel, CLI view, or MCP shape can render the full reading-envelope view
- the surface helps validate consumer alignment with Echo/Continuum instead of
  inventing a debugger-local substitute
- the view remains optional and inspectable rather than becoming required UI
  clutter

## Repo Evidence

- `docs/design/doctrine.md`
- `docs/design/0026-debugger-native-shared-family-boundary/debugger-native-shared-family-boundary.md`
- `docs/method/backlog/up-next/PROTO_wesley-generated-echo-family-consumption.md`

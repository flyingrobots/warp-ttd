# WESLEY Protocol Publication Boundary

Coordination: `WESLEY_protocol_surface_cutover`

`warp-ttd` already acts like the natural home for the host-neutral debugger
schema at `schemas/warp-ttd-protocol.graphql`, but the publication boundary is
still blurry for Wesley and Echo consumers.

For the current Wesley-sponsored hill, `warp-ttd` needs a boring contract
publisher story: what is authored here, what Wesley compiles from it, what
generated artifacts are stable for consumers, and what remains adapter or
debugger policy instead of shared schema contract.

Work:

- freeze the minimal authored protocol surface Wesley should target
- say which artifacts are published or vendored for consumers
- keep Echo-specific runtime richness capability-gated instead of silently
  redefining the base protocol
- coordinate with `ttd-protocol-rs-ownership` and
  `PROTO_echo-runtime-schema-alignment`
- keep debugger policy and adapter behavior out of Wesley's contract-compiler
  role

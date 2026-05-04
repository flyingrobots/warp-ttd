# Take ownership of ttd-protocol-rs generation

Echo currently has local TTD protocol artifacts that predate warp-ttd:

- `ttd-protocol-rs` crate (generated Rust types)
- `ttd-manifest` crate (vendored IR)
- `schemas/ttd-protocol.graphql` (local schema copy)

Since warp-ttd owns the canonical protocol schema, these artifacts
should either:

1. Generate from warp-ttd's `schemas/warp-ttd-protocol.graphql` via
   Wesley, with Echo consuming the published output.
2. Move the Rust type generation into warp-ttd as a published crate
   that Echo depends on.
3. Stay in Echo but point at warp-ttd's schema as the source of truth.

Option 2 is cleanest: warp-ttd publishes `ttd-protocol-rs`, Echo
consumes it. One schema, one generated output, two consumers.

Wesley's domain-empty cleanup retired its local `schemas/ttd-protocol.graphql`
copy instead of moving another protocol SDL into this repo. The canonical
authored SDL remains `schemas/warp-ttd-protocol.graphql`; any missing old
Wesley protocol nouns should become explicit protocol evolution work here, not
a second schema authority.

Triage: decide which option and coordinate with Echo (see Echo
backlog: `PLATFORM_ttd-schema-reconciliation`).

# CLI

The `warp-ttd` CLI is the current canonical agent-facing surface.

It is not just a human convenience wrapper around the TUI. It is the
first explicit, inspectable boundary for structured debugger access.

## Current status

- Implemented
- Backed by the same `DebuggerSession` and host adapter surfaces the
  TUI uses
- Supports structured `--json` output
- Serves as the current truth for what an agent can inspect without a
  TUI

## Commands

These commands exist today:

- `npm run demo`
- `npm run hello`
- `npm run catalog`
- `npm run frame`
- `npm run step`

The following commands are also available through the CLI entrypoint:

- `hello`
- `catalog`
- `frame`
- `step`
- `effects`
- `deliveries`
- `context`
- `session`
- `worldline`

Example:

```sh
node --experimental-strip-types ./src/cli.ts worldline --json
```

## Agent contract

For agent use, `--json` is the contract.

Rules:

- JSON output must remain structured and machine-readable.
- Human-only text must not appear on stdout in `--json` mode.
- CLI envelopes must reflect the authored schema and application-layer
  runtime types, not ad hoc TUI formatting.
- New inspection capabilities should land in the CLI/JSON surface
  before the TUI depends on them.

## Relationship to the TUI

The TUI is a delivery adapter over the same application/session core.
It should not invent debugger capabilities that the CLI and future MCP
surface cannot express.

That means:

- CLI/JSON proves the structured surface.
- MCP should map onto the same nouns and commands.
- TUI should follow those explicit capabilities, not lead them.

## Next cuts

- Expand worldline and neighborhood inspection in CLI form
- Add explicit lane/site filters where needed
- Keep output aligned with `schemas/warp-ttd-protocol.graphql`
- Use the CLI surface to define the future MCP tool vocabulary

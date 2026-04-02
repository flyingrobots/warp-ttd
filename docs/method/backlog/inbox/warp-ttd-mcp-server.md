# warp-ttd as an MCP Server

The CLI already has `--json`. What if warp-ttd itself was an MCP
server? An agent could inspect worldlines, step through history,
query receipts, compare strands — all through tool calls.

This would make warp-ttd genuinely agent-native, not just
agent-friendly. The debugger's first-class agent surface wouldn't
be a CLI with flags — it would be a tool protocol.

Natural tools: `inspect_frame`, `step`, `seek`, `list_receipts`,
`compare_ticks`, `fork_strand`, `query_provenance`.

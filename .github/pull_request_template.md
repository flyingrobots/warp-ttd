## Issue

- Closes #

## Design / Evidence

- Design doc:
- Manual chapter or update:
- Witness / playback:

## WARP Proof Checklist

- [ ] The linked issue has Method lane/type/legend labels.
- [ ] The design doc uses the WARP design format, or this PR is a narrow fix that does not need a design doc.
- [ ] The agent-first surface is named: MCP, CLI JSON/JSONL, read model, schema, generated artifact, fixture, or deterministic tool output.
- [ ] The authority, admission, and mutation boundary is explicit.
- [ ] Implementation work has at least one non-doc proof test for the actual software surface.
- [ ] Documentation/process tests are evidence-ledger checks only, not the only proof for product/runtime/protocol work.
- [ ] Accessibility, localization, security/redaction, determinism, and compatibility are covered or explicitly not applicable.
- [ ] Follow-on debt has GitHub Issues, not hidden prose.

## Validation

- [ ] `npm run check:method`
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run lint:check`

Trim or add commands only when the design explains why.

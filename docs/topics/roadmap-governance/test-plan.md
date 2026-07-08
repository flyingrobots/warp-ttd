# Test Plan - Roadmap Governance

| Requirement | Contract claim | Evidence | Fixture or input | Measurable oracle | Status |
|---|---|---|---|---|---|
| R-RMAP-1 | Roadmap artifacts are generated from GitHub issue state rather than maintained as independent truth. Child slices are recovered from either visible goalpost sub-issues or child issue parent links. | `scripts/roadmap-dag.mjs`, `ROADMAP.md`, `docs/roadmap-dag.dot`, `docs/roadmap-dag.svg` | Current repository issues, native issue relationships, sub-issue edges, and parent links. | Regeneration produces the committed roadmap Markdown, DOT, and SVG artifacts with the same child slices under local and CI tokens. | covered |
| R-RMAP-2 | CI can detect roadmap DAG drift before merge. | `.github/workflows/roadmap.yml`, `package.json`, `scripts/roadmap-dag.mjs` | Pull request checkout with GitHub token access. | `npm run roadmap:check` exits non-zero when generated artifacts differ from HEAD. | covered |
| R-RMAP-3 | Agents must update roadmap artifacts before opening pull requests for roadmap-governed work. | `AGENTS.md`, `ROADMAP.md` | PR preparation flow for issue-backed work. | The pre-PR checklist requires roadmap refresh before publication. | covered |
| R-RMAP-4 | Software tests assert executable behavior or generated artifact consistency, not Markdown prose. | `test/protocolPublicationBoundary.spec.ts`, `package.json` | Protocol mirror schema and test script inventory. | Remaining tests compare generated TypeScript protocol mirrors to schema-backed contract data. | covered |

## Fixtures

- GitHub Issues, milestones, labels, sub-issue relationships, child parent links, and blocked-by edges for this repository.
- Committed roadmap outputs: `ROADMAP.md`, `docs/roadmap-dag.dot`, and `docs/roadmap-dag.svg`.
- Protocol schema inputs consumed by retained protocol boundary tests.

## Oracles

- Roadmap check exits cleanly only when generated artifacts match the GitHub issue graph.
- Child slice rendering remains stable when GitHub exposes the reverse `subIssues` edge, the child `parent` edge, or both.
- CI roadmap workflow runs the same check used locally.
- Test inventory excludes Markdown/prose-only assertions while retaining protocol mirror contract checks.

## Planned Cases

- Add a fixture-backed offline issue graph for deterministic roadmap generator tests.

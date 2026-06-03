# AGENTS

This guide is for AI agents and human operators recovering context in the WARP TTD repository.

## Agent-Native / Agent-First Doctrine

- WARP TTD is **AGENT-NATIVE** and **AGENT-FIRST**. LLM agents are primary users,
  not afterthoughts.
- Implement new debugger features for agents first through structured surfaces:
  MCP tools, CLI `--json` / JSONL, generated protocol artifacts, and
  deterministic read models.
- Human TUI, browser, and text views follow those same surfaces. They may render
  or compose agent-visible facts, but they must not become the only
  implementation of new debugger behavior.
- For Continuum apps, WARP TTD should be the primary LLM inspection and
  lawful-interaction surface. If an agent must screen-scrape human UI text to use
  a feature, that feature is incomplete.
- Interaction still respects the admission chain. Agent-facing tools do not issue
  authority, perform admission, or mutate host state unless an explicit
  witnessed/admitted control design says so.

## Git Rules

- **NEVER** amend commits.
- **NEVER** rebase or force-push.
- **NEVER** push to `main` without explicit permission.
- Always use standard commits and regular pushes.
- Do not create draft pull requests. Open a normal PR only after the initial
  issue/design commit is pushed, link the GitHub Issue and design doc, and keep
  `work-in-progress` on the issue while cycle work is active.

## Documentation & Planning Map

Do not audit the repository by recursively walking the filesystem. Follow the authoritative manifests:

### 1. The Entrance
- **`README.md`**: Public front door, core value prop, and quick start.
- **`GUIDE.md`**: Orientation, fast path, and system orchestration.

### 2. The Bedrock
- **`ARCHITECTURE.md`**: The authoritative structural reference (Hexagonal, Ports, session logic).
- **`VISION.md`**: Core tenets and the observer geometry mission.
- **`METHOD.md`**: Repo work doctrine (Backlog lanes, Cycle loop).

### 3. The Direction
- **`docs/BEARING.md`**: Current execution gravity and active tensions.
- **GitHub Issues**: Live tracker for pending work, Method lanes, and release
  milestones.
- **`docs/design/`**: Active and landed cycle design documents.

### 4. The Proof
- **`CHANGELOG.md`**: Historical truth of merged behavior.
- **`docs/audit/`**: Structural health and due diligence reports.

## Context Recovery Protocol

When starting a new session or recovering from context loss:

1. **Read `docs/BEARING.md`** to find the current execution gravity.
2. **Read `METHOD.md`** to understand the work doctrine.
3. **Check GitHub Issues**, especially `lane:asap`, `work-in-progress`, and
   active release milestones.
4. **Check `git log -n 5` and `git status`** to verify the current branch state.

## End of Turn Checklist

After altering files:

1. **Verify Truth**: Ensure documentation is updated if behavior or structure changed.
2. **Log Debt**: Add follow-on GitHub Issues with `lane:bad-code` or
   `lane:cool-ideas`.
3. **Commit**: Use focused, conventional commit messages. Propose a draft before executing.
4. **Validate**: Run `npm run check:method`, `npm test`,
   `npm run test:integration`, `npx tsc --noEmit`, `npm run lint`, and
   `npm run lint:check` when relevant.

---
**The goal is determinism. Every feature is defined by its tests.**

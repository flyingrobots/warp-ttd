# METHOD

The WARP TTD work doctrine: GitHub Issues, a loop, and honest bookkeeping.

## Principles

- **AGENT-NATIVE, AGENT-FIRST.** LLM agents are primary users, not an
  afterthought. Default to a structured MCP/CLI/read-model surface before TUI or
  browser rendering; human views compose those surfaces instead of becoming the
  first implementation.
- **The agent and the human sit at the same table.** Both matter. Both are named
  in every design.
- **Tests are the executable spec.** Design names the hill and playback
  questions. Tests prove the answers. Design-doc assertions are evidence-ledger
  checks; they are not implementation proof.
- **GitHub Issues are the live tracker.** Issue labels carry Method lane,
  legend, type, priority, and active-work state. Repository files are the
  evidence ledger for designs, witnesses, retros, manuals, and signposts.
- **Process is calm.** No sprints or velocity theater. A labeled issue queue,
  clear evidence, and a loop for doing it well.

## Structure

| Signpost | Role |
| :--- | :--- |
| **`README.md`** | Public front door and project identity. |
| **`MANUAL.md`** | Durable operator and maintainer manual compiled from design cycles. |
| **`GUIDE.md`** | Orientation and productive-fast path. |
| **`VISION.md`** | Core tenets and the observer geometry mission. |
| **`ARCHITECTURE.md`** | Authoritative structural reference. |
| **`METHOD.md`** | Repo work doctrine (this document). |

## GitHub Issue Lanes

| Label | Purpose |
| :--- | :--- |
| **`lane:asap`** | Imminent work; pull into the next cycle. |
| **`lane:cool-ideas`** | Interesting but not committed work. |
| **`lane:bad-code`** | Technical debt that must be addressed. |
| **`lane:inbox`** | Unprocessed ideas; must be promoted or buried before entering a cycle. |
| **`work-in-progress`** | Someone is actively working the issue. |

Legacy files under `docs/method/backlog/**` are migration evidence until issue
[#72](https://github.com/flyingrobots/warp-ttd/issues/72) retires or stubs
them. Do not treat those directories as the live tracker for new work.

## The Cycle Loop

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Sync: fetch + merge target
    Sync --> Issue: GitHub issue
    Issue --> Branch: title slug branch
    Branch --> Design: design doc
    Design --> PR: pushed PR
    PR --> Red: failing tests
    Red --> Green: passing tests
    Green --> Manualize: manual chapter
    Manualize --> Ready: validation evidence
    Ready --> Retro: findings/debt
    Retro --> Ship: merge to main
    Ship --> [*]
```

1. **Sync**: `git fetch --prune origin`, sync to the merge target branch
   (almost always `origin/main`), and verify a clean worktree.
2. **Issue**: Choose or create the GitHub Issue, set Method labels and milestone,
   and keep the issue as the live tracker.
3. **Branch**: Create a branch from the synced merge target using the issue title
   slug.
4. **Design**: Write the `warp-design-v1` design doc, stage it with any issue
   template/process updates, commit, and push the branch.
5. **PR coordination**: Open a normal pull request as the active cycle
   coordination surface after the initial issue/design commit is pushed, and
   apply `work-in-progress` to the GitHub Issue. Draft PRs are not used in this
   repo; unfinished state lives on the issue label and PR checklist.
6. **Red**: Write failing tests based on the design's playback questions,
   starting with the agent-facing contract when the feature has any inspection
   or interaction surface.
7. **Green**: Implement the solution until tests pass.
8. **Manualize**: Add or update a `MANUAL.md` chapter when the cycle introduces
   durable doctrine, architecture, protocol boundary, operator workflow, or
   agent contract knowledge.
9. **Ready**: Run validation, update the PR checklist, and remove or replace
   stale `work-in-progress` issue state before final review.
10. **Retro**: Document findings and follow-on debt in the retro packet.
11. **Ship**: Merge to `main`. Update `docs/BEARING.md` after merge.

## Design Format

New cycle design docs use `docs/templates/design-cycle.md` and must pass
`npm run check:method`. Existing pre-format designs are listed in
`docs/templates/legacy-design-docs.txt` until migrated.

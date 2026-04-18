# METHOD

The WARP TTD work doctrine: A backlog, a loop, and honest bookkeeping.

## Principles

- **The agent and the human sit at the same table.** Both matter. Both are named in every design. Default to building the agent surface first.
- **Tests are the executable spec.** Design names the hill and the playback questions. Tests prove the answers.
- **The filesystem is the database.** A directory is a priority. A filename is an identity. Moving a file is a decision.
- **Process is calm.** No sprints or velocity theater. A backlog tiered by judgment, and a loop for doing it well.

## Structure

| Signpost | Role |
| :--- | :--- |
| **`README.md`** | Public front door and project identity. |
| **`GUIDE.md`** | Orientation and productive-fast path. |
| **`VISION.md`** | Core tenets and the observer geometry mission. |
| **`ARCHITECTURE.md`** | Authoritative structural reference. |
| **`METHOD.md`** | Repo work doctrine (this document). |

## Backlog Lanes

| Lane | Purpose |
| :--- | :--- |
| **`asap/`** | Imminent work; pull into the next cycle. |
| **`up-next/`** | Queued after `asap/`. |
| **`cool-ideas/`** | Uncommitted experiments. |
| **`bad-code/`** | Technical debt that must be addressed. |
| **`inbox/`** | Unprocessed ideas; must be promoted or buried before entering a cycle. |

## The Cycle Loop

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Pull: asap/
    Pull --> Branch: cycle/
    Branch --> Red: failing tests
    Red --> Green: passing tests
    Green --> Retro: findings/debt
    Retro --> Ship: PR to main
    Ship --> [*]
```

1. **Pull**: Move an item from `asap/` to `docs/design/`.
2. **Branch**: Create `cycle/<cycle_name>`.
3. **Red**: Write failing tests based on the design's playback questions.
4. **Green**: Implement the solution until tests pass.
5. **Retro**: Document findings and follow-on debt in the cycle doc.
6. **Ship**: Open a PR to `main`. Update `docs/BEARING.md` after merge.

## Naming Convention

Backlog and cycle files follow: `<LEGEND>_<slug>.md`
Example: `PROTO_strand-lifecycle.md`

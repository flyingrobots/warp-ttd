# METHOD

A backlog, a loop, and honest bookkeeping.

## Principles

The agent and the human sit at the same table. They see different
things — different failure modes, different interaction surfaces,
different definitions of done. Both perspectives are named in every
design. Both must agree before work is called finished. Build the
agent surface first; it is the foundation the human experience
stands on.

Everything traces to a playback question. If you cannot say which
question your current work answers, you are drifting. Stop. Reconnect
to the design, or change the design. There is no third option.

Tests are the spec. Documentation drifts silently; tests fail loud.
Code exists because a test demanded it. Tests exist because a design
said what should be true. There is no prose layer between intent and
proof.

The filesystem is the database. A directory is a priority. A filename
is an identity. Moving a file is a decision — tracked in version
control, reviewable in a diff. `ls` is the only query you need.

Process should be calm. No sprints. No velocity. No burndown charts.
A backlog of things worth doing, ordered by judgment, and a loop for
doing them well.

## Structure

```
docs/
  method/                           the workflow system
    backlog/                        work not yet started
      inbox/                        raw ideas, from anyone, anytime
      asap/                         do this now
      up-next/                      do this soon
      cool-ideas/                   experiments, wild thoughts
      bad-code/                     tech debt worth tracking
      *.md                          everything else
    legends/                        named domains (see below)
    retro/                          retrospectives
      <cycle>/<task>.md
    graveyard/                      rejected or abandoned ideas
    process.md                      how cycles run
    release.md                      how releases work

  design/                           all intentional description
    <cycle>/<task>.md               cycle design docs
    *.md                            living design documents
```

Signpost documents live at the repository root or one level into
`docs/`. They use `ALL_CAPS.md` naming. If a document needs to be
buried deeper than that, it is not a signpost.

## Backlog

A directory of Markdown files. Each file describes work worth doing.
The filesystem is the index — there is no other.

### Inbox

The inbox is the landing zone. Anyone — human or agent — drops ideas
in at any time. A sentence is enough. No legend, no scope, no ceremony.
Capture the thought before it evaporates. Keep moving.

Agents: if you notice bad code, a cool pattern, a gap — file it in
`inbox/` without breaking flow. The inbox is processed later.

### Priority lanes

- **`inbox/`** — unprocessed. From anyone, anytime.
- **`asap/`** — pull this into a cycle soon.
- **`up-next/`** — next in line. Dependencies are clear.
- **`cool-ideas/`** — worth trying when the time is right. Not
  commitments.
- **`bad-code/`** — tech debt. It works, but it bothers you.

Files that fit no lane sit in the backlog root. That is the
"someday" bucket.

### Naming

Files are named descriptively. Legend prefix if applicable:

```
VIZ_braille-rendering.md
PROTO_strand-lifecycle.md
debt-trailer-codec-dts.md
```

No numeric IDs. The name is the identity.

### Promoting

When a backlog item is pulled into a cycle, it becomes a design doc:

```
docs/method/backlog/asap/PROTO_strand-lifecycle.md
  → docs/design/<cycle>/strand-lifecycle.md
```

The backlog file is removed. The design doc is the new home.

### Commitment

Pull something from the backlog and you are committed. It does not
go back. Either:

- **Finish** — the hill is met.
- **Pivot** — end the cycle early with a retro. Remaining work
  enters the backlog as a new item. The context has changed; the
  original item no longer describes the situation.

Half-started work does not accumulate. Pulling is a deliberate act.

### Maintenance

Backlog maintenance happens at the end of a cycle:

- Process the inbox. Promote, flesh out, or bury.
- Re-prioritize. What you learned changes what matters.
- Clean up. Merge duplicates, update stale items, kill the dead.

Do not reorganize mid-cycle. Throw things in `inbox/` and keep
moving.

### Cycle types

The same loop applies regardless of what a cycle ships:

- **Feature cycles** — design, test, build, ship.
- **Design cycles** — the deliverable is design docs, not code.
- **Debt cycles** — pull from `bad-code/`. The hill is "this no
  longer bothers us."

## Legends

A legend is a named domain — a broad area of the product that spans
many cycles. Each legend lives as a file in `docs/method/legends/`
and describes:

- what it covers
- the human and agent perspectives that care
- what success looks like
- how you know

Legends are not milestones. They do not start or finish. They are
reference frames — stable contexts that give individual tasks meaning.

A legend code (`VIZ`, `PROTO`, `TUI`) prefixes backlog filenames to
signal domain.

## Cycles

A cycle is a unit of shipped work. Design, implementation,
retrospective. Numbered sequentially.

### The loop

0. **Pull** — choose a backlog item. Move it. You are committed.

1. **Design** — write a design doc in `docs/design/<cycle>/`.

   - **Sponsor human** — the perspective that keeps the work honest
   - **Sponsor agent** — the perspective that keeps the contract honest
   - **Hill** — what success looks like
   - **Playback questions** — yes/no, from both perspectives. These
     inform the specs. Write them before anything else.
   - **Non-goals** — what this cycle will not do

2. **RED** — write failing tests. The playback questions become
   executable specifications. Build the agent surface first.

3. **GREEN** — make the tests pass. Code exists because specs
   demanded it.

4. **Playback** — the agent answers the agent questions. The human
   answers the user questions. Write it down. If a clear yes does
   not come, that is the signal.

5. **PR → main** — review loops until merge.

6. **Close** — merge. Write a retro in `docs/method/retro/<cycle>/`.

   - **Drift check** (mandatory) — compare what was built against the
     design. Call out every divergence. Drift is not failure.
     Undocumented drift is.
   - **New debt** — file to `backlog/bad-code/`.
   - **Cool ideas** — file to `backlog/cool-ideas/`.
   - **Backlog maintenance** — process inbox, re-prioritize, clean up.

   Update CHANGELOG. Bump version. Tag if releasing. Update README.

### Playback outcomes

- **Hill met** — merge, close.
- **Hill partially met** — merge what is honest. The retro explains
  the gap. Remaining work enters the backlog.
- **Hill not met** — the cycle still concludes. Write the retro.
  A failed cycle that produces a good retro is worth more than a
  successful cycle with no learnings.

Every cycle ends with a retro. Success is not a prerequisite for
conclusion.

## Graveyard

Rejected or abandoned work moves to `docs/method/graveyard/`. The
file stays, with a note explaining why it was killed. The graveyard
prevents ideas from being re-proposed without context.

## Flow

```
idea
  → backlog/inbox/       (captured, raw)
  → backlog/cool-ideas/  (sorted during maintenance)
  → backlog/up-next/     (prioritized)
  → backlog/asap/        (urgent)
  → design/<cycle>/      (pulled — committed)
  → RED, GREEN, playback
  → retro/<cycle>/       (retro written)
  → CHANGELOG, release

      — or —

  → graveyard/           (rejected, with rationale)
```

## What this system does not have

No milestones. Work is prioritized by judgment, not by calendar.

No roadmap. The backlog is ordered. That is enough.

No index files. The filesystem is the index.

No velocity tracking. Ship good work.

No ticket numbers. Names are descriptive. If you need to reference
a task, use its name.

## Naming

| Convention | Example | When |
|------------|---------|------|
| `ALL_CAPS.md` | `VISION.md` | Signpost — root or `docs/` |
| `lowercase.md` | `doctrine.md` | Everything else |
| `<LEGEND>_<name>.md` | `VIZ_braille.md` | Backlog item with legend |
| `<name>.md` | `debt-trailer-codec.md` | Backlog item without |
| `<cycle>/` | `0010-strand-speculation/` | Cycle directory |

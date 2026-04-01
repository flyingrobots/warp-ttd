# METHOD

A lightweight, filesystem-native system for moving work from idea to
shipped code to retrospective. No milestones. No roadmap. Just a
backlog, cycles, and honest bookkeeping.

## Principles

Work should be intentional. Every piece of code exists because someone
wrote a design doc that said what it should do and why. Every shipped
cycle ends with a retrospective that says what actually happened.
The gap between intent and reality is where learning lives.

The filesystem is the database. Directory structure communicates
priority. File names communicate domain. Moving a file from one
directory to another is a meaningful act — a decision, tracked in
version control, reviewable in a diff.

Process should be calm. There are no sprints, no velocity metrics, no
burndown charts. There is a backlog of things worth doing, ordered by
judgment, and a loop for doing them well.

## Structure

```
docs/
  method/                           the workflow system
    backlog/                        work not yet started
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

Signpost documents — the ones everyone is expected to read — live at
the repository root or one level into `docs/`. They use `ALL_CAPS.md`
naming: `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `VISION.md`,
`METHOD.md`, `docs/GUIDE.md`. If a document needs to be buried deeper
than that, it is not a signpost.

## Backlog

The backlog is a directory of Markdown files. Each file is a
self-contained description of work worth doing. There is no index file —
the filesystem is the index.

### Priority lanes

Priority is communicated through subdirectories:

- **`asap/`** — urgent. Pull this into a cycle soon.
- **`up-next/`** — next in line. Dependencies are clear.
- **`cool-ideas/`** — interesting experiments, far-fetched thoughts, things
  worth trying when the time is right. Not commitments.
- **`bad-code/`** — tech debt. Code that works but bothers you. Separating
  debt from features makes the distinction obvious.

Files that do not fit a named lane sit in the backlog root. That is the
"someday" bucket.

### File naming

Files are named descriptively. If the work belongs to a legend (see
below), prefix the filename with the legend code:

```
VIZ_braille-rendering.md
PROTO_strand-lifecycle.md
debt-trailer-codec-dts.md
```

There are no numeric IDs. The name is the identity.

### Promoting work

When a backlog item is pulled into a cycle, it becomes a design doc:

```
docs/method/backlog/asap/PROTO_strand-lifecycle.md
  → docs/design/<cycle>/strand-lifecycle.md
```

The backlog file is removed. The design doc is the new home.

## Legends

A legend is a named domain — a broad area of the product that spans
multiple cycles. Legends are defined in `docs/method/legends/` as
individual Markdown files.

Each legend describes:

- **What it covers** — the area of the product or system
- **Sponsor users** — the human and agent perspectives that care
- **Hills** — what success looks like for this domain
- **Playback questions** — how you know the hills are met

Legends are not milestones. They do not have deadlines or completion
criteria. They are reference frames — stable contexts that give
individual tasks meaning.

A legend code (e.g., `VIZ`, `PROTO`, `TUI`) prefixes backlog filenames
to signal which domain a task belongs to.

## Cycles

A cycle is a unit of shipped work. It has a design phase, an
implementation phase, and a retrospective. Cycles are numbered
sequentially (`0001`, `0002`, ...).

### Design

Before writing code, write a design doc. Place it in
`docs/design/<cycle>/`:

```
docs/design/0010-strand-speculation/strand-lifecycle.md
```

A design doc should define:

- **Sponsor human** — the human perspective that keeps the work honest
- **Sponsor agent** — the agent/tool perspective
- **Hill** — a clear statement of what success looks like
- **Playback questions** — yes/no questions answered after implementation
- **Non-goals** — what this cycle explicitly does not do

### Development loop

1. **Design** — write or revise the design doc.
2. **Tests as spec** — encode expected behavior as failing tests.
3. **Implement** — make the tests pass.
4. **Playback** — answer every playback question from both the human
   and agent perspectives. Write the answers down. If you cannot get
   a clear yes, that is the signal.
5. **Retrospective** — write a retro in `docs/method/retro/<cycle>/`.
   The retro includes a drift check (what diverged from the design),
   new debt logged to `backlog/bad-code/`, and cool ideas captured
   to `backlog/cool-ideas/`.
6. **Update README** — the root README reflects reality after every
   cycle.
7. **Close** — update CHANGELOG, tag if releasing.

### Playback

After implementation, before the retro, run a dual playback:

1. The agent answers every playback question.
2. Stop. The human answers every playback question.
3. Both perspectives must agree the hill is met before proceeding.

Outcomes:

- **Hill met** — proceed to retrospective, merge, close.
- **Hill partially met** — merge what is honest. The retro explains
  the gap. Remaining work goes to the backlog as debt.
- **Hill not met** — do not merge. Re-scope or abandon. Capture
  learnings.

## Graveyard

When a backlog item is rejected or abandoned, move it to
`docs/method/graveyard/`. Do not delete it. The file should include
a brief note explaining why it was killed.

The graveyard prevents ideas from being re-proposed without context.
If someone wants to revive a graveyard item, the history is right there.

## Flow

The full lifecycle of a piece of work:

```
idea
  → docs/method/backlog/cool-ideas/  (captured)
  → docs/method/backlog/up-next/     (prioritized)
  → docs/method/backlog/asap/        (urgent)
  → docs/design/<cycle>/             (pulled into cycle, designed)
  → implemented, tested, played back
  → docs/method/retro/<cycle>/       (retrospective written)
  → CHANGELOG updated, released

      — or —

  → docs/method/graveyard/           (rejected, with rationale)
```

## What this system does not have

- **No milestones.** Work is prioritized by judgment, not by calendar.
- **No roadmap.** The backlog is ordered. That is enough.
- **No index files.** The filesystem is the index. `ls` is the query.
- **No velocity tracking.** Ship good work. That is the metric.
- **No ticket numbers.** File names are descriptive. If you need to
  reference a task, use its name.

## Naming conventions

| Convention | Example | When |
|------------|---------|------|
| `ALL_CAPS.md` | `VISION.md`, `ARCHITECTURE.md` | Signpost docs at root or `docs/` |
| `lowercase.md` | `doctrine.md`, `glossary.md` | Everything else |
| `<LEGEND>_<name>.md` | `VIZ_braille.md` | Backlog items with a legend |
| `<name>.md` | `debt-trailer-codec.md` | Backlog items without a legend |
| `<cycle>/` | `0010-strand-speculation/` | Cycle directories in design/ and retro/ |

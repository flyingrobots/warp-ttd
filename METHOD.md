# METHOD

A lightweight, filesystem-native system for moving work from idea to
shipped code to retrospective. No milestones. No roadmap. Just a
backlog, cycles, and honest bookkeeping.

## Principles

### Agents are first-class

Agents are first-class users of the product. They have distinct needs
from humans — different interaction patterns, different failure modes,
different definitions of "good UX." Every design doc names a sponsor
agent alongside a sponsor human, because an agent's perspective on
whether a hill is met is as legitimate as a human's.

Agents are also first-class peers in the development cycle. They write
code, review designs, run playbacks, and ship work. The dual-playback
gate exists because both perspectives — human and agent — must agree
before work is called done.

Build the agent surface first. The agent operates at the protocol
level, which is the low-level foundation the human experience sits on.
Getting that right first means the human-level experience has solid
ground to stand on.

### Everything traces to a playback

Nothing should be done "because we can" or "because it seemed right."
Every action during a cycle should trace back to a playback question.
Playback questions are written during design, before any code exists.
They are the "why" made answerable.

If you cannot explain which playback question your current work
serves, you are drifting. Stop and reconnect to the design, or
acknowledge that the design needs to change.

### Tests are the spec

Documentation drifts; tests fail loud. Every piece of code exists
because a test demanded it, and every test exists because a design doc
said what should be true. There is no layer of prose between the design
and the executable specification.

### The filesystem is the database

Directory structure communicates priority. File names communicate
domain. Moving a file from one directory to another is a meaningful
act — a decision, tracked in version control, reviewable in a diff.

### Process should be calm

There are no sprints, no velocity metrics, no burndown charts. There
is a backlog of things worth doing, ordered by judgment, and a loop
for doing them well.

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

Signpost documents — the ones everyone is expected to read — live at
the repository root or one level into `docs/`. They use `ALL_CAPS.md`
naming: `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `VISION.md`,
`METHOD.md`, `docs/GUIDE.md`. If a document needs to be buried deeper
than that, it is not a signpost.

## Backlog

The backlog is a directory of Markdown files. Each file is a
self-contained description of work worth doing. There is no index file —
the filesystem is the index.

### Inbox

The inbox (`backlog/inbox/`) is the landing zone for raw ideas. Anyone
— human or agent — can toss something in at any time. No ceremony
required. Write down what you can: a sentence, a paragraph, a sketch.
It does not need a legend, a full design, or even a clear scope. The
point is to capture the thought before it evaporates.

Agents should use the inbox freely. If you notice bad code while
working, a cool pattern worth exploring, or a feature gap — drop a
file in `inbox/` and keep moving. Do not break flow to organize it.

The inbox is processed during backlog maintenance (see below).

### Priority lanes

Priority is communicated through subdirectories:

- **`inbox/`** — raw ideas, unprocessed. From anyone, anytime.
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

### Commitment

Once you pull something from the backlog, you are committed. You
cannot put it back. Either:

- **Finish** — the hill is met, the cycle closes normally.
- **Pivot** — end the cycle early with a retrospective explaining why.
  Remaining work goes back to the backlog as a new item (not the
  original — the context has changed).

This prevents half-started work from accumulating. Pulling from the
backlog is a deliberate act with consequences.

### Backlog maintenance

Backlog maintenance happens at the end of a cycle, during the close
phase. This is when you:

- Process the inbox — promote items to priority lanes, add legends,
  flesh out descriptions, or move to the graveyard.
- Re-prioritize — shift items between lanes based on what you learned
  during the cycle.
- Clean up — merge duplicates, update stale items, kill dead ideas.

Do not reorganize the backlog mid-cycle. During active work, just
throw things in `inbox/` and keep moving.

### Cycle types

Not every cycle ships features. The same loop applies to all cycle
types:

- **Feature cycles** — the default. Design, test, build, ship.
- **Design cycles** — pure design iteration. The deliverable is design
  docs, not code. Useful for exploratory work or system-level
  planning.
- **Debt cycles** — pay down tech debt. Pull from `bad-code/`.
  The hill is "this code no longer bothers us."

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

### Development loop

0. **Pull from backlog** — choose a backlog item. Move it out of its
   priority lane. This is the start of a cycle.

1. **Design** — write a design doc in `docs/design/<cycle>/`. Use
   IBM Design Thinking-inspired framing:

   - **Sponsor human** — the human perspective that keeps the work honest
   - **Sponsor agent** — the agent/tool perspective that keeps the
     protocol and machine-readable contract honest
   - **Hill** — a clear statement of what success looks like
   - **Playback questions** — yes/no questions that will be answered
     after implementation, from both perspectives. These inform the
     specs. Write them now.
   - **Non-goals** — what this cycle explicitly does not do

2. **RED — write failing tests** — the design doc's playback questions
   become executable specifications. Tests are the literal spec. No
   documentation layer sits between intent and verification. Build the
   agent-facing surface first — it operates at the low level you need
   anyway to make the user-level experience work.

3. **GREEN — implement** — write code until the tests pass. Code
   exists because specs demanded it.

4. **Playback** — answer every playback question from both perspectives.
   The agent checks the agent playback questions. The human is prompted
   to check the user playback questions. Write the answers down. If you
   cannot get a clear yes, that is the signal.

5. **PR → main** — open a pull request. Review loops until merge is
   accepted.

6. **Close** — merge. Write a retrospective in
   `docs/method/retro/<cycle>/`. The retro includes a drift check
   (what diverged from the design), new debt logged to
   `backlog/bad-code/`, and cool ideas captured to
   `backlog/cool-ideas/`. Update CHANGELOG, bump version, tag if
   releasing, update README, maintain the backlog.

### Playback

After implementation, before the retro, run a dual playback:

1. The agent answers every agent playback question.
2. Stop. The human answers every user playback question.
3. Both perspectives must agree the hill is met before proceeding.

Outcomes:

- **Hill met** — proceed to retrospective, merge, close.
- **Hill partially met** — merge what is honest. The retro explains
  the gap. Remaining work goes to the backlog.
- **Hill not met** — the cycle still concludes. Write the retro. Be
  honest about what happened and why. The learnings usually surface
  new backlog items — sometimes better-scoped versions of the
  original idea, sometimes entirely different work that the failed
  attempt revealed. A failed cycle that produces a good retro is
  more valuable than a successful cycle with no learnings.

Every cycle ends with a retro. Success is not a prerequisite for
conclusion.

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
  → docs/method/backlog/inbox/       (captured, raw)
  → docs/method/backlog/cool-ideas/  (sorted during backlog maintenance)
  → docs/method/backlog/up-next/     (prioritized)
  → docs/method/backlog/asap/        (urgent)
  → docs/design/<cycle>/             (pulled into cycle — committed)
  → RED (failing tests), GREEN (implement), playback
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

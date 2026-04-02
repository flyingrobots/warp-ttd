# Design Doc — Worldline Viewer

**Cycle:** 0010-worldline-viewer
**Legend:** CORE_VIEWS
**Type:** design cycle

## Sponsor Human

Developer debugging a multi-writer WARP system. The Navigator shows
where I am right now — position, receipts, effects at one frame. But
I need to see the full causal history at once. Where did this
worldline come from? Where did the strands fork? Which ticks had
conflicts? I need a `git log` for causal history.

## Sponsor Agent

Agent building automated inspection workflows. Needs structured
access to the full tick history of a worldline — tick indices, writer
attribution, strand fork points, BTR digests. The `--json` surface
should expose this without the agent having to step through one tick
at a time.

## Hill

A developer can see the full causal history of a worldline as a
scrollable view, identify strand forks, writer contributions, and
conflict-heavy ticks at a glance, and jump to any tick to inspect
it further.

## Playback Questions

### Agent

1. Can the agent get the full tick history of a worldline as
   structured JSONL output?
2. Does the output include writer attribution per tick?
3. Does the output include strand fork points?
4. Can the agent filter by worldline or strand?

### User

1. Can the user scroll through the full causal history?
2. Are strand forks visually distinct from linear ticks?
3. Can the user see which writers contributed at each tick without
   opening the receipt detail?
4. Can the user jump from the worldline view to the Navigator at a
   selected tick?
5. Does the view handle a worldline with 1000+ ticks without
   becoming unusable?

## Non-Goals

- This cycle does not build the Graph Viewer or Provenance Viewer.
- This cycle does not implement strand creation or mutation — those
  are observation surfaces only.
- This cycle does not require a real host adapter. Scenario fixtures
  are the test bed.
- This cycle does not replace the Navigator. The worldline viewer
  is a sibling view, not a replacement.

## Relationship to Navigator

The Navigator (cycle 0009) answers: "what is happening at this
frame?" — position bar, receipt summary, effect summary, lane tree.
It is a single-frame detail view.

The Worldline Viewer answers: "what is the full history?" — a
scrollable list of all ticks with strand topology, writer
attribution, and conflict indicators. It is a multi-frame overview.

The two views complement each other. The expected interaction:
scroll the worldline to find an interesting tick, select it, switch
to Navigator for detail.

## Design Decisions to Make

### Display model

The worldline is a vertical scrollable list. Each row is a tick.
Ticks are displayed newest-first (like `git log`). Strand forks
appear as tree connectors (like `git log --graph`).

A tick row shows:
- Tick index
- BTR digest (truncated, like a short commit hash)
- Writer(s) who contributed
- Conflict indicator (if any receipts were rejected)
- Strand label (if not the canonical worldline)

### Scroll and selection

The view has a cursor. Arrow keys move the cursor. Enter or a
keybinding jumps the Navigator to the selected tick.

For large histories, the view must virtualize — render only the
visible window plus a buffer, not the entire history.

### Rendering module

Follow the navigatorLayout pattern: a pure function module
(`worldlineLayout`) that takes protocol data and terminal dimensions,
returns renderable lines. Fully testable without TUI.

### Agent surface

A `worldline --json` CLI command that outputs the full tick history
as JSONL. Each line is a tick record with index, digest, writers,
strand, and conflict indicator.

### Data source

The current adapter surface exposes `getLaneCatalog()` (lane list)
and `getFrame(index)` (single frame). The worldline viewer needs
the full tick sequence.

Options:
1. Iterate `getFrame()` for every tick — works but O(n) calls.
2. Add a `getWorldlineHistory()` adapter method — cleaner but
   requires protocol addition.
3. Build the history client-side by stepping through — same as 1
   but via stepping.

For the prototype, option 1 is fine. The fixture adapters are fast.
A real adapter optimization can come later.

## Expected Outputs

- `src/tui/worldlineLayout.ts` — pure rendering module
- `test/worldlineLayout.spec.ts` — unit tests
- TUI page wiring (new page or panel)
- `worldline` CLI command with `--json`
- Backlog items for anything deferred

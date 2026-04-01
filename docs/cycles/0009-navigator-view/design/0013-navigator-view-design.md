# Design Doc 0013 — Navigator View Design

**Status:** in progress
**Cycle:** 0009-navigator-view

## Sponsor Human

Operator inspecting causal history across hot and cold hosts. Needs
one coherent view that makes substrate facts legible — regardless of
whether the backing adapter is Echo, git-warp, or a future host. The
current Navigator is a stack of boxes added as features landed. It
needs to become an intentional observer projection.

## Sponsor Agent

Coding agent reading `--json` output or driving the TUI via MCP.
Needs the Navigator's visual structure to map cleanly onto protocol
envelopes so the agent can predict what data appears where.

## Hill

The Navigator has an intentional layout organized around the shared
protocol nouns, not around implementation artifacts. The layout
works identically regardless of which host adapter is connected.

## Context: What the Navigator IS

The Navigator is the primary observer projection in warp-ttd. Per
Continuum architecture, warp-ttd is the observer plane over both
runtime temperatures (hot Echo, cold git-warp). The Navigator is
where the operator reads causal geometry:

- Where am I in the worldline? (frame position)
- What happened at this tick? (receipts — who wrote what)
- What effects were produced? (emissions)
- What happened to those effects? (delivery observations)
- What is the execution context? (live/replay/debug)

Both Echo and git-warp should "look the same" through this view.
The Navigator consumes the protocol surface, not the host.

## Current State (what's wrong)

```
┌─ Causal Provenance ──────────────────┐
│  (decorative animated shader)        │  ← not real data
└──────────────────────────────────────┘
┌─ Playback Head ──────────────────────┐
│  Frame N / label                     │
│  * wl:main      tick 3               │
│    ws:sandbox   tick 1               │
│  Receipts: 2                         │  ← count buried in text
└──────────────────────────────────────┘
┌─ Receipts ───────────────────────────┐
│  Lane     Writer   Admitted Rej  CF  │
│  wl:main  alice    3        0    0   │
└──────────────────────────────────────┘
┌─ Effects [live] ─────────────────────┐
│  Effect    Lane     Sink     Status  │
│  diag      wl:main  tui-log  deliv   │
└──────────────────────────────────────┘
┌─ Pins (1) ───────────────────────────┐
│  [f2] notification → network: suppr  │
└──────────────────────────────────────┘
  Status flash line
  [n/→] Fwd  [p/←] Back  [g] Jump ...
```

Problems:

1. **Decorative DAG shader** occupies 10 rows showing nothing real.
   It was ported from warp-lens. It should either show real lane
   structure or be removed.

2. **Frame info mixes concerns.** "Frame N / label" and the lane
   coordinate table are useful but conflated with a receipt count.
   The playback head position is the most important thing on screen
   but doesn't get visual prominence.

3. **Vertical stacking doesn't scale.** Every protocol noun gets a
   box. With receipts, effects, and pins all visible, the navigator
   overflows any reasonable terminal height. No prioritization.

4. **No capability-driven layout.** If an adapter doesn't declare
   `read:effect-emissions`, the Effects box just doesn't appear.
   But the layout doesn't adapt — it leaves a gap. The layout
   should respond to what the host actually provides.

5. **Lane coordinates are hard to scan.** The lane list is plain
   text with tick numbers. In a multi-lane scenario with strands,
   this becomes a wall of text.

6. **No visual hierarchy.** Everything has equal weight. The
   operator can't quickly answer "what happened?" because nothing
   is foregrounded.

## Design Principles

### 1. Protocol nouns are the layout primitives

The Navigator's structure should map directly to the protocol
surface. Each section corresponds to a protocol type:

| Protocol Noun | Navigator Section |
|---------------|-------------------|
| PlaybackHeadSnapshot | Position bar (frame index, head label, mode) |
| PlaybackFrame + LaneFrameView | Lane table (coordinate + changed status per lane) |
| ReceiptSummary | Receipt table (writer, admitted/rejected/CF per lane) |
| EffectEmissionSummary + DeliveryObservationSummary | Effects table (emission → delivery outcome) |
| ExecutionContext | Mode badge in position bar |
| PinnedObservation (session) | Pins panel (comparison data) |

### 2. Position bar is the anchor

The single most important information: **where am I?**

```
 Frame 3 of 12 │ wl:main │ live │ 2 receipts │ 1 effect
```

One line. Always visible. Frame index, primary lane, execution
mode, and counts. This replaces the 6-line "Playback Head" box.

### 3. Lanes show causal structure, not just coordinates

Replace the plain text lane list with a compact table that shows
parent-child relationships:

```
 Lane              Kind        Tick  Changed
 wl:main           worldline      3  *
 └ ws:sandbox      strand         1
```

The tree structure (indent + connector) makes strand parentage
visible at a glance. This is the "DAG" the decorative shader was
pretending to show.

### 4. Receipts and effects share horizontal space

Instead of stacking vertically (receipts THEN effects), use a
two-column layout when terminal width permits:

```
┌─ Receipts ──────────┬─ Effects [live] ──────────┐
│ Lane   Writer  A R C│ diag → tui-log: delivered  │
│ wl:main alice  3 0 0│ diag → chunk:   delivered  │
└─────────────────────┴────────────────────────────┘
```

Falls back to vertical stacking on narrow terminals.

### 5. The decorative shader goes

Replace the animated DAG shader with the real lane tree from
principle 3. The Navigator should not show decoration in place
of data.

### 6. Capability-driven sections

If the adapter doesn't declare a capability, the corresponding
section is omitted — not shown empty. The layout contracts to
fill available space:

- No `read:effect-emissions` → no Effects column
- No `read:receipts` → no Receipts column
- No receipts at this frame → section collapses to "(none)"

### 7. Pins sit at the bottom, always

Pins are comparison data — the operator looks at them *relative
to* the current frame. They should be visually separated from
the current-frame data and anchored at the bottom.

## Proposed Layout

### Full-featured (wide terminal, all capabilities)

```
 Frame 3 of 12 │ wl:main │ live │ 2 receipts │ 1 effect
─────────────────────────────────────────────────────────
 Lane              Kind        Tick  Chg
 wl:main           worldline      3   *
 └ ws:sandbox      strand         1

┌─ Receipts ──────────────────┬─ Effects [live] ─────────┐
│ Lane    Writer  Adm Rej  CF │ Kind  Lane    Sink  Stat  │
│ wl:main alice     3   0   0 │ diag  wl:main tui   deliv │
│ wl:main bob       1   1   0 │ diag  wl:main chunk deliv │
└─────────────────────────────┴──────────────────────────┘

 ═══ Pins ═══
 [f2] notification → network: suppressed (replay)

 Pinned: diagnostic at frame 3
 [n/→] Fwd  [p/←] Back  [g] Jump  [P] Pin  [u] Unpin
```

### Narrow terminal (< 80 cols)

```
 Frame 3 │ wl:main │ live

 wl:main     worldline  tick 3 *
 └ ws:sandbox strand    tick 1

 ─ Receipts ─
 wl:main alice 3/0/0
 wl:main bob   1/1/0

 ─ Effects [live] ─
 diag → tui-log: delivered
 diag → chunk:   delivered

 [f2] notif → network: suppressed
 [n] Fwd [p] Back [g] Jump [P] Pin
```

### Minimal (no effects, no receipts at frame 0)

```
 Frame 0 │ wl:main │ live

 wl:main     worldline  tick 0

 (no activity at this frame)

 [n/→] Fwd  [g] Jump  [d] Disconnect
```

## Playback Questions

1. Is the decorative DAG shader removed?
2. Does the position bar show frame index, lane, mode, and counts
   on one line?
3. Does the lane table show parent-child structure with tree
   connectors?
4. Do receipts and effects share horizontal space on wide terminals?
5. Does the layout adapt when capabilities are missing?
6. Does the layout collapse gracefully on narrow terminals?
7. Can both a human and an agent answer "what happened at this
   frame?" within 2 seconds of looking at the Navigator?

## Non-Goals

- Not adding new protocol concepts.
- Not redesigning the TUI framework or page architecture.
- Not implementing the full comparison view for pins (that's the
  pin-design cycle).
- Not changing the Inspector page layout (separate concern).

## Implementation Notes

- The position bar is a single `stringToSurface` call, not a box.
- The lane tree can be built from `LaneCatalog` (for parentage) +
  `PlaybackFrame.lanes` (for current coordinates).
- Horizontal split uses bijou's existing `createSurface` + `blit`
  for side-by-side placement. No new framework features needed.
- Terminal width detection already exists in bijou (`ResizeMsg`).
  Use `w >= 100` as the threshold for horizontal layout.

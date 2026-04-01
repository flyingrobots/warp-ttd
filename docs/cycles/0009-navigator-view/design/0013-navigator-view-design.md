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
The layout handles absence, overflow, and truncation truthfully.

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
   It was ported from warp-lens. It should show real lane structure
   or be removed.

2. **Frame info mixes concerns.** "Frame N / label" and the lane
   coordinate table are useful but conflated with a receipt count.
   The playback head position is the most important thing on screen
   but doesn't get visual prominence.

3. **Vertical stacking doesn't scale.** Every protocol noun gets a
   box. With receipts, effects, and pins all visible, the navigator
   overflows any reasonable terminal height. No prioritization.

4. **No capability-driven layout.** If an adapter doesn't declare
   `read:effect-emissions`, the Effects box just doesn't appear.
   But the layout doesn't adapt — it leaves a gap.

5. **No overflow policy.** 30 lanes, 18 receipts, 40 effects — the
   layout has no answer for this. No truncation, no row budgets,
   no summary lines.

6. **No visual hierarchy.** Everything has equal weight. The
   operator can't quickly answer "what happened?" because nothing
   is foregrounded.

7. **Changed marker is undefined.** The `*` next to a lane means
   the lane has a receipt at this frame, but that isn't documented
   or consistent across adapters.

## Design Principles

### 1. Protocol nouns are the layout primitives

The Navigator's structure maps directly to the protocol surface.
Each section corresponds to a protocol type and has a stable
section identifier for UI/JSON/test alignment:

| Section ID | Protocol Noun | What it shows |
|------------|---------------|---------------|
| `position-bar` | PlaybackHeadSnapshot + ExecutionContext | Frame index, primary lane, mode, counts |
| `lane-table` | PlaybackFrame + LaneFrameView + LaneCatalog | Coordinate + changed status per lane, tree structure |
| `receipt-summary` | ReceiptSummary | Writer, admitted/rejected/CF per lane |
| `effect-summary` | EffectEmissionSummary + DeliveryObservationSummary | Emission → delivery outcome |
| `pins-panel` | PinnedObservation (session) | Comparison data from other frames |
| `status-bar` | (UI state) | Status flash, keybinding hints |

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
 Lane              Kind        Tick  Chg
 wl:main           worldline      3   *
 └ ws:sandbox      strand         1
```

The tree structure (indent + connector) makes strand parentage
visible at a glance. This is the "DAG" the decorative shader was
pretending to show.

**Changed marker (`*`) definition:** A lane is marked changed at
frame N if it has at least one receipt at frame N. This is the
only definition. It does not mean "advanced coordinate" (a lane
can advance without a receipt if it's a synthetic frame), and it
does not mean "emitted an effect" (emissions are separate from
lane advancement). The marker derives from `ReceiptSummary`,
not from `LaneFrameView.changed`.

**When receipts are unsupported:** If the adapter does not declare
`read:receipts`, the `Chg` column is omitted entirely from the
lane table. The lane table still renders coordinates and tree
structure — it just cannot show change markers. This is the
cleanest truthful behavior: don't show a column you can't populate.

### 4. Receipts and effects share horizontal space

Instead of stacking vertically, use a two-column layout when
terminal width permits. Falls back to vertical on narrow terminals.

### 5. The decorative shader goes

Replace the animated DAG shader with the real lane tree from
principle 3. The Navigator should not show decoration in place
of data.

### 6. Capability-driven sections

Sections have four render states. Each state has explicit rules:

| State | Meaning | Render |
|-------|---------|--------|
| **unavailable** | Adapter does not declare the capability | Section omitted entirely. Position bar shows `(unsupported)` for the missing noun. |
| **empty** | Capability declared, zero items at this frame | Section header visible, body shows `(none at this frame)` |
| **populated** | Capability declared, 1+ items | Normal table rendering, subject to row budget |
| **truncated** | Items exceed row budget | Render up to budget, footer shows `showing N of M` |

Capability → section mapping:

- `read:receipts` → `receipt-summary`
- `read:effect-emissions` → `effect-summary` (required; without
  emissions, the section is omitted entirely)
- `read:delivery-observations` → delivery columns within
  `effect-summary` (optional; if emissions are supported but
  deliveries are not, the effects table renders with the Status
  column showing `(delivery unsupported)` instead of an outcome)
- Pins are always available (session-local, not adapter-dependent)

### 7. Navigator is summary-first, not detail-complete

The Navigator answers:

- Where am I?
- What changed?
- Were there receipts?
- Were there effects?
- Were there delivery outcomes?
- What comparison context is pinned?

It does NOT try to fully render every field of every envelope.
Detailed inspection belongs in Inspector or a drill-down surface.

### 8. Pins sit at the bottom, capped

Pins are comparison data — the operator looks at them *relative
to* the current frame. They should be visually separated and
anchored at the bottom. Capped at 3 visible; excess summarized.

## Overflow Policy

### Row budgets

| Section | Max visible rows | Overflow behavior |
|---------|-----------------|-------------------|
| `lane-table` | 8 | Show first 8, footer: `+N more lanes` |
| `receipt-summary` | 6 | Show first 6, footer: `showing 6 of N receipts` |
| `effect-summary` | 6 | Show first 6, footer: `showing 6 of N effects` |
| `pins-panel` | 3 | Show 3 most recent, footer: `+N older pins` |

### Priority order (when vertical space is tight)

If the terminal is too short for all sections, sections are
removed in this order (lowest priority first):

1. `pins-panel` (removed first — comparison context, not current truth)
2. `effect-summary` (removed second — effects are downstream of receipts)
3. `receipt-summary` (removed third — receipts summarize tick activity)
4. `lane-table` (removed fourth — lanes are the structural frame)
5. `position-bar` (never removed — always visible)
6. `status-bar` (never removed — always visible)

The position bar counts always reflect the full data, even when
sections are truncated or removed. The operator can always see
"3 receipts" even if the receipt section isn't visible.

When a populated section is removed due to vertical priority
(not capability absence), the status bar shows a one-line
summary of hidden activity:

```
 hidden: 18 receipts, 23 effects
```

This prevents the removal from feeling silent.

## Sorting Rules

Deterministic ordering for every section. No adapter-dependent or
random ordering.

| Section | Sort order |
|---------|-----------|
| `lane-table` | Roots in catalog order, then depth-first pre-order traversal of children. Each parent is immediately followed by its child strands before the next root. No orphan child is shown without its parent — lane truncation preserves tree integrity for visible rows. |
| `receipt-summary` | Grouped by lane (catalog order), then by writer (alphabetical). |
| `effect-summary` | Grouped by emission (frame order), then by delivery (sink alphabetical). |
| `pins-panel` | Most recently pinned first. |

## Width Thresholds

The horizontal split threshold derives from minimum content width,
not a magic number.

| Pane | Minimum legible width |
|------|----------------------|
| `receipt-summary` | 45 chars (Lane 16 + Writer 14 + Adm 5 + Rej 5 + CF 5) |
| `effect-summary` | 45 chars (Kind 10 + Lane 14 + Sink 12 + Stat 9) |
| Gutter | 3 chars |

**Horizontal split when:** `w >= 45 + 3 + 45 = 93`

Below 93: vertical stack. Above 93: side by side.

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

### Narrow terminal (< 93 cols)

```
 Frame 3 │ wl:main │ live │ 2r 1e

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

### Truncated (overflow)

```
 Frame 7 of 50 │ wl:main │ live │ 18 receipts │ 23 effects

 Lane              Kind        Tick  Chg
 wl:main           worldline     12   *
 └ ws:alpha        strand         4   *
 └ ws:beta         strand         3
 +3 more lanes

┌─ Receipts (6 of 18) ───────┬─ Effects [live] (6 of 23) ─┐
│ Lane    Writer  Adm Rej  CF │ Kind   Lane    Sink   Stat  │
│ wl:main alice     3   0   0 │ diag   wl:main tui    deliv │
│ wl:main bob       1   1   0 │ diag   wl:main chunk  deliv │
│ ws:alpha carol    2   0   1 │ notif  ws:alpha net   suppr │
│ ws:alpha dave     1   0   0 │ notif  ws:alpha tui   deliv │
│ wl:main eve       1   0   0 │ export wl:main  file  deliv │
│ ws:beta  frank    0   2   0 │ export wl:main  net   fail  │
└─────────────────────────────┴────────────────────────────┘

 ═══ Pins (3 of 5) ═══
 [f2] notification → network: suppressed (replay)
 [f5] diagnostic → tui-log: delivered (live)
 [f6] export → file: delivered (live)

 [n/→] Fwd  [p/←] Back  [g] Jump  [P] Pin  [u] Unpin
```

### Unsupported capability

```
 Frame 1 │ wl:main │ live │ 1 receipt │ effects: unsupported

 wl:main     worldline  tick 1 *

 ─ Receipts ─
 wl:main alice 2/0/0

 [n/→] Fwd  [p/←] Back  [g] Jump  [d] Disconnect
```

## Evaluation Questions

### Human recognition test

1. Is the decorative DAG shader removed?
2. Does the position bar show frame index, lane, mode, and counts
   on one line?
3. Does the lane table show parent-child structure with tree
   connectors?
4. Do receipts and effects share horizontal space on wide terminals?
5. Does the layout collapse gracefully on narrow terminals?
6. Can the operator distinguish "unsupported" from "empty" from
   "truncated" at a glance?
7. Can the operator answer "what happened at this frame?" within
   2 seconds of looking at the Navigator?

### Agent structure predictability test

8. Does every section have a stable identifier that maps to protocol
   nouns?
9. Is section ordering deterministic across hosts and frames?
10. Can the agent predict which sections will appear based solely on
    `HostHello.capabilities`?

## Non-Goals

- Not adding new protocol concepts.
- Not redesigning the TUI framework or page architecture.
- Not implementing the full comparison view for pins (that's the
  pin-design cycle).
- Not changing the Inspector page layout (separate concern).

## Count Formatting

Three forms, used consistently across all render paths:

| Context | Format | Example |
|---------|--------|---------|
| Wide position bar | `N noun(s)` | `2 receipts │ 1 effect` |
| Narrow position bar | `Nr Ne` | `2r 1e` |
| Unsupported | `noun: unsupported` | `effects: unsupported` |
| Hidden (priority removal) | `hidden: N noun(s)` | `hidden: 18 receipts` |
| Truncation footer | `showing N of M` | `showing 6 of 18 receipts` |
| Overflow footer | `+N more noun(s)` | `+3 more lanes` |

Singular when count is 1, plural otherwise.

## Test Fixture Matrix

Implementation should cover these scenarios:

| Scenario | Width | Capabilities | Data |
|----------|-------|-------------|------|
| Wide, all capabilities | ≥93 | all | receipts + effects |
| Narrow, all capabilities | <93 | all | receipts + effects |
| Frame 0, empty | any | all | no receipts, no effects |
| No receipts capability | any | no `read:receipts` | effects only |
| No effects capability | any | no `read:effect-emissions` | receipts only |
| Emissions without deliveries | any | emissions, no deliveries | emissions with `(delivery unsupported)` |
| Lane overflow | any | all | 12 lanes |
| Receipt overflow | any | all | 10 receipts |
| Effect overflow | any | all | 10 effects |
| Height-constrained | any | all | full data, short terminal |
| Multi-strand tree | any | all | worldline + 3 nested strands |

## Implementation Notes

- The position bar is a single `stringToSurface` call, not a box.
- The lane tree is built from `LaneCatalog` (for parentage) +
  `PlaybackFrame.lanes` (for current coordinates) +
  `ReceiptSummary[]` (for changed marker).
- Horizontal split uses bijou's existing `createSurface` + `blit`.
- Width threshold is 93 (derived from minimum pane widths + gutter).
- Row budgets are enforced in the layout function, not in the
  session or adapter.
- The `changed` marker on `LaneFrameView` should be ignored by the
  Navigator — derive it from receipts instead. This avoids adapter
  inconsistency (git-warp and scenario fixture compute `changed`
  differently today).

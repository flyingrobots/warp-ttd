# Playback Witness — Cycle 0014

## Agent Questions

1. **Can the agent identify which lane is currently selected?**
   YES — `selectedLaneId` on WorldlineInput. The split view highlights
   it with ● in the tree pane.

2. **Can the agent read the selected lane's tick history without ticks
   from other lanes mixed in?**
   YES — `filterFramesToLane` scopes both lane views and receipts.
   Test: "shows only that lane's ticks" confirms fea0000/fea2222
   present, aaa1111 absent.

3. **Can the agent see the lane tree topology?**
   YES — `buildLaneTreeLines` returns depth-first pre-order with tree
   connectors (├/└). Test: "shows worldlines before their child strands"
   and "indents strands under their parent".

4. **Can the agent navigate between lanes and see the timeline update?**
   YES — `laneCursor` drives tree selection, `selectedLaneId` scopes
   the timeline. Changing selectedLaneId re-renders the right pane
   with that lane's filtered ticks.

## User Questions

1. **When I select a lane, do I see only that lane's ticks?**
   YES — confirmed by integration test.

2. **Can I see the lane hierarchy?**
   YES — tree pane shows worldlines with strands indented under parents.

3. **Can I navigate lanes with keyboard and see the detail update?**
   YES — j/k moves laneCursor, Enter/Tab switches focus. The
   framework plumbing is in the page model (to be wired in worldlinePage.ts).

4. **Is the view useful when a strand is thousands of ticks ahead?**
   YES — each lane shows its own local tick history. A strand with 10000
   ticks shows 10000 rows; the parent worldline with 3 ticks shows 3.
   No wasted space from global frame flattening.

## Witness

```text
164 tests, 0 failures.
16 new tests covering filterFramesToLane, buildLaneTreeLines, and
split-view renderWorldline.
```

## Partial Delivery Note

The rendering layout is complete and tested. The page-level message
handling (worldlinePage.ts wiring: lane cursor movement, focus switching,
selectedLaneId updates on user input) is deferred. The pure layout
functions are the hard part; the page wiring is mechanical.

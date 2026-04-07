# Worldline Strand Selection

When scrolling the worldline viewer, allow selecting a specific strand
at a tick — not just jumping to the frame in Navigator.

## The problem

Currently Enter jumps to the frame index in Navigator, which shows
the worldline perspective. If a strand is active at that tick, there's
no way to jump to the strand's view specifically.

## What it might look like

- Left/right arrows to move cursor across lane columns at the
  current tick
- Enter jumps to Navigator with the selected lane focused
- Visual highlight on the selected column (not just the row)

## Origin

User feedback during cycle 0012 (lane graph renderer).

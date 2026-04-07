# Worldline + Inspector Split View

Render the inspector detail panel alongside the worldline graph in a
side-by-side layout. The graph rails and frame list occupy the left
gutter (~30 cols), the inspector for the selected tick fills the
remaining width on the right.

## Why

The worldline view currently wastes most of the terminal width — the
graph gutter + frame index only uses ~20 columns. The inspector data
(receipts, writers, effects, delivery observations) is on a separate
page. Combining them puts the topology and the detail in one view.

## What it might look like

```
● ● ┆ ┆ ┆  ! 112  │  alice, dave
● ●   ┆ ┆     111  │  Receipts (3)
● ● ┆   ┆     110  │    wl:alpha  alice  2 admitted
● ● ┆ ┆       109  │    wl:beta   dave   1 admitted
● ●   ┆ ┆   > 108  │    strand:ll bob    1 rejected
● ● ┆   ┆     107  │  Effects (1)
                    │    emit:net delivered
```

## Origin

User feedback during cycle 0012: "you could probably fit the entire
inspector view next to the graphs."

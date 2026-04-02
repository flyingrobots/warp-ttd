# Multi-Writer Heatmap

For multi-writer scenarios, show a heatmap of which writers are
active at which ticks. Rows are writers, columns are ticks, cells
are colored by activity (admitted ops, rejected ops, idle).

Instantly reveals contention patterns, quiet periods, and which
writers are stepping on each other. Could render in braille chars
for density or block chars for readability.

# Navigator table overflow at narrow widths

The Navigator's side-by-side Receipts/Effects tables clip at
terminal widths near the HORIZONTAL_THRESHOLD (93 chars). Column
text wraps into the box border or gets truncated mid-word.

Needs either:
- A lower breakpoint for side-by-side → stacked fallback
- Column truncation with ellipsis
- Dynamic column widths based on available space
- Or just always stack at widths under ~120

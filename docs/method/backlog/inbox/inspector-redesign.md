# Inspector page redesign

The Inspector page is a raw data dump — host metadata, lane catalog,
receipt fields. It's not clear what the user should do with it or
how to interpret the information.

Problems:
- Receipt IDs are opaque (receipt:scenario:0434 means nothing)
- Tick ranges (199 -> 200) have no visual context
- No connection to what you were looking at in Navigator/Worldline
- Lane catalog is a flat list with [ro]/[rw] — doesn't show topology
- Host metadata is useful once, not on every visit
- No keybinding hints or interaction — it's a static wall of text

Needs a design cycle to figure out what the Inspector is FOR and
what questions it answers that Navigator and Worldline don't.

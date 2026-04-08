# Bijou App Frame Migration

**Legend:** CV (CORE_VIEWS)

Migrate warp-ttd from hand-rolled Surface blits to Bijou's
`createFramedApp()` shell and composable building blocks.

## The problem

`src/tui/main.ts` manually reimplements tabbed navigation, pane
focus, keybinding hints, page transitions, and connect/disconnect
flow. Bijou already provides all of this through `createFramedApp()`
plus a rich component library. We're hand-rolling what the framework
gives us for free.

## What Bijou provides (v4.1.0)

### App shell — `createFramedApp()`

- Tabbed interface (multi-page navigation)
- Per-pane scroll/focus state isolation
- Command palette (Ctrl+P) with page-scoped actions
- Help viewer (keybinding reference, bound to ?)
- Quit confirmation (Q/Ctrl+C)
- Overlay layers (modals, drawers, toasts, notifications)
- Transition shaders (40+ page transition effects)
- Notification stack with history
- Layout presets (side-by-side, stacked, focused)
- Session state serialize/restore

### Components we should adopt

| Component | Package | Replaces |
|-----------|---------|----------|
| `splitPane` | bijou-tui | Hand-rolled side-by-side in navigatorLayout |
| `dagPane` | bijou-tui | Custom lane graph renderer (cycle 0012) |
| `browsableList` | bijou-tui | Custom scroll/selection in worldlineLayout |
| `navigableTable` | bijou-tui | Custom receipt/effect tables in navigatorLayout |
| `accordion` | bijou-tui | N/A — new capability for lane expand/collapse |
| `tree` | bijou core | N/A — new capability for lane hierarchy |
| `timeline` | bijou core | N/A — per-lane tick events with status dots |
| `panels` | bijou-tui | Manual page/pane switching in main.ts |
| `overlay` | bijou-tui | N/A — modals/drawers for deep inspection |
| `focusArea` | bijou-tui | Custom viewport clipping |
| `statusBar` | bijou-tui | Custom keybinding hints line |
| `commandPalette` | bijou-tui | N/A — searchable actions |
| `canvas` | bijou-tui | Custom shader rendering in dagShader/bgShader |
| `notificationStack` | bijou-tui | N/A — conflict/capability alerts |

### New in 4.1.0

- `bijou-mcp` — MCP server exposing all Bijou components as
  rendering tools. Interesting for agent-driven UI generation.

## What migration looks like

### Phase 1: Shell migration

Replace `main.ts` TEA loop with `createFramedApp()`. Each current
"page" (Connect, Navigator, Worldline, Inspector) becomes a page
definition with its own model/update/view. The app frame handles
tab switching, keybinding help, quit confirmation, and overlays.

### Phase 2: Component adoption

Replace hand-rolled rendering in each page:

- **Navigator**: `splitPane` for side-by-side layout,
  `navigableTable` for receipt/effect tables, `tree` for lane tree
- **Worldline**: `dagPane` for lane topology, `browsableList` for
  per-lane tick history, `splitPane` for graph + detail
- **Inspector**: `accordion` for collapsible data sections,
  `navigableTable` for raw data
- **Connect**: `browsableList` for adapter selection

### Phase 3: New capabilities

With the framework doing the heavy lifting:

- Command palette for debugger actions (step, seek, pin, etc.)
- Drawer for deep receipt/provenance inspection
- Notifications for conflict detection, capability changes
- Layout presets (side-by-side, stacked, focused) user-switchable
- Transition shaders between pages

## What we keep

- `src/protocol.ts` — unchanged
- `src/adapter.ts` + adapters — unchanged
- `src/app/debuggerSession.ts` — unchanged
- `src/tui/navigatorLayout.ts` pure helpers (buildPositionBar,
  buildLaneTree, etc.) — reusable as data transforms feeding
  Bijou components
- `src/tui/worldlineLayout.ts` pure helpers (buildTickRows, etc.)
  — same
- `src/tui/laneGraph.ts` — column assignment may feed dagPane nodes

## What we delete

- Manual page switching in `main.ts`
- Manual keybinding hint rendering
- Manual Surface.fill + blit composition
- Custom scroll/viewport logic (replaced by focusArea/viewport)
- The entire `renderWorldline`/`blitTickRows` render path (replaced
  by Bijou building blocks)

## References

- Bijou source: `~/git/bijou`
- App frame: `bijou-tui/src/app-frame*.ts` (8 files)
- App skeleton: `bijou-tui-app/src/index.ts`
- Examples: `~/git/bijou/examples/` (80+ working examples)
- Published: `@flyingrobots/bijou` v4.1.0, `@flyingrobots/bijou-tui`
  v4.1.0

## Origin

Discovered during cycle 0012 feedback — realized we were hand-rolling
what the framework provides. User (framework author) confirmed.

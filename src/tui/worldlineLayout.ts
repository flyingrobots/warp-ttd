/**
 * Worldline layout — pure rendering logic, testable without a terminal.
 *
 * All functions take data and return Surfaces or plain data structures.
 * The bijou BijouContext is injected so tests can provide a stub.
 *
 * Cycle 0010 — Worldline Viewer.
 */
import {
  createSurface,
  stringToSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { LaneFrameView, LaneRef, ReceiptSummary } from "../protocol.ts";
import { formatWriterRef } from "../protocol.ts";
import { assignColumns, buildGraphGutterCells, laneColor } from "./laneGraph.ts";
import type { GutterCell, LaneActivity } from "./laneGraph.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_VISIBLE_TICKS = 50;
export const DIGEST_LENGTH = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TickRow {
  frameIndex: number;
  laneId: string;
  tick: number;
  digest: string;
  writers: string[];
  hasConflict: boolean;
  strandIds: string[];
  activeLaneIds: string[];
}

export interface FrameData {
  frameIndex: number;
  lanes: LaneFrameView[];
  receipts: ReceiptSummary[];
}

export interface WorldlineInput {
  frames: FrameData[];
  catalog: LaneRef[];
  cursor: number;
  w: number;
  h: number;
  ctx: BijouContext;
  /** When set, renders split view: lane tree + per-lane timeline. */
  selectedLaneId?: string;
  /** Cursor position in the lane tree (left pane). */
  laneCursor?: number;
}

export interface LaneTreeLine {
  laneId: string;
  label: string;
  depth: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

function uniqueWriters(receipts: readonly ReceiptSummary[]): string[] {
  const seen = new Set<string>();
  for (const r of receipts) {
    if (r.writer !== undefined) seen.add(formatWriterRef(r.writer));
  }
  return [...seen];
}

function frameToTickRow(frame: FrameData, strandIds: Set<string>): TickRow | undefined {
  const primaryLane = frame.lanes[0];
  if (primaryLane === undefined) return undefined;

  return {
    frameIndex: frame.frameIndex,
    laneId: primaryLane.laneId,
    tick: primaryLane.coordinate.tick,
    digest: primaryLane.btrDigest ?? "",
    writers: uniqueWriters(frame.receipts),
    hasConflict: frame.receipts.some((r) => r.rejectedRewriteCount > 0),
    strandIds: frame.lanes.filter((l) => strandIds.has(l.laneId)).map((l) => l.laneId),
    activeLaneIds: frame.lanes.filter((l) => l.changed).map((l) => l.laneId),
  };
}

/**
 * Transform frame history into renderable tick rows, newest first.
 */
export function buildTickRows(
  frames: FrameData[],
  catalog: readonly LaneRef[],
): TickRow[] {
  const strandIds = new Set(
    catalog.filter((l) => l.kind === "STRAND").map((l) => l.id),
  );

  const rows: TickRow[] = [];
  for (const frame of frames) {
    const row = frameToTickRow(frame, strandIds);
    if (row !== undefined) rows.push(row);
  }

  rows.sort((a, b) => b.frameIndex - a.frameIndex);
  return rows;
}

/**
 * Render a single tick row to a string.
 */
export function buildTickLine(
  row: TickRow,
  opts: { width: number; selected: boolean; gutter?: string },
): string {
  const marker = opts.selected ? "> " : "  ";
  const conflict = row.hasConflict ? "! " : "  ";
  const frame = String(row.frameIndex).padStart(4);
  const digest = row.digest.slice(0, DIGEST_LENGTH).padEnd(DIGEST_LENGTH);

  const line = `${marker}${opts.gutter ?? ""}${conflict}${frame}  ${digest}`;
  return line.slice(0, opts.width);
}

/**
 * Virtual scroll: return the visible window of items centered on cursor.
 */
export function scrollWindow<T>(
  items: T[],
  cursor: number,
  windowSize: number,
): { visible: T[]; offset: number } {
  if (items.length <= windowSize) {
    return { visible: items, offset: 0 };
  }

  let offset = cursor - Math.floor(windowSize / 2);
  if (offset < 0) offset = 0;
  if (offset > items.length - windowSize) offset = items.length - windowSize;

  return {
    visible: items.slice(offset, offset + windowSize),
    offset,
  };
}

// ---------------------------------------------------------------------------
// Lane filtering (cycle 0014 — split view)
// ---------------------------------------------------------------------------

/**
 * Filter frame history to only frames where the given lane participated.
 * Receipts and lane views are scoped to that lane only.
 */
export function filterFramesToLane(
  frames: readonly FrameData[],
  laneId: string,
): FrameData[] {
  const result: FrameData[] = [];
  for (const f of frames) {
    const laneView = f.lanes.filter((l) => l.laneId === laneId);
    if (laneView.length === 0) continue;
    result.push({
      frameIndex: f.frameIndex,
      lanes: laneView,
      receipts: f.receipts.filter((r) => r.laneId === laneId),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Lane tree (cycle 0014 — split view)
// ---------------------------------------------------------------------------

interface TreeWalkCtx { depth: number; prefix: string; isLast: boolean }

function treeConnector(ctx: TreeWalkCtx): string {
  if (ctx.depth === 0) return "";
  return ctx.isLast ? "└ " : "├ ";
}

function treeNextPrefix(ctx: TreeWalkCtx): string {
  if (ctx.depth === 0) return "  ";
  return `${ctx.prefix}${ctx.isLast ? "  " : "│ "}`;
}

interface TreeWalkState {
  childrenOf: (id: string) => LaneRef[];
  out: LaneTreeLine[];
}

function walkLaneTree(lane: LaneRef, ctx: TreeWalkCtx, state: TreeWalkState): void {
  state.out.push({ laneId: lane.id, label: `${ctx.prefix}${treeConnector(ctx)}${lane.id}`, depth: ctx.depth });
  const np = treeNextPrefix(ctx);
  for (const [i, child] of state.childrenOf(lane.id).entries()) {
    const siblings = state.childrenOf(lane.id);
    walkLaneTree(child, { depth: ctx.depth + 1, prefix: np, isLast: i === siblings.length - 1 }, state);
  }
}

/** Build navigable tree lines from lane catalog (depth-first pre-order). */
export function buildLaneTreeLines(catalog: readonly LaneRef[]): LaneTreeLine[] {
  const roots = catalog.filter((l) => l.parentId === undefined);
  const state: TreeWalkState = {
    childrenOf: (parentId: string): LaneRef[] => catalog.filter((l) => l.parentId === parentId),
    out: [],
  };
  for (const root of roots) walkLaneTree(root, { depth: 0, prefix: "", isLast: false }, state);
  return state.out;
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

interface BlitTickArgs {
  final: Surface;
  rows: TickRow[];
  catalog: readonly LaneRef[];
  cursor: number;
  w: number;
  h: number;
  startY: number;
}

const GRAPH_MIN_WIDTH = 40;

function isNewStrand(id: string, seen: Set<string>, strands: Set<string>): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  return strands.has(id);
}

function detectForks(
  rows: readonly TickRow[],
  catalog: readonly LaneRef[],
): Map<number, string[]> {
  const seen = new Set<string>();
  const strands = new Set(
    catalog.filter((l) => l.kind === "STRAND").map((l) => l.id),
  );
  const result = new Map<number, string[]>();
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r === undefined) continue;
    const forks = r.activeLaneIds.filter((id) => isNewStrand(id, seen, strands));
    if (forks.length > 0) result.set(r.frameIndex, forks);
  }
  return result;
}

function collectAliveLanes(rows: readonly TickRow[]): Set<string> {
  const alive = new Set<string>();
  for (const r of rows) {
    for (const id of r.activeLaneIds) alive.add(id);
  }
  return alive;
}

function buildRowActivity(
  row: TickRow,
  columns: Map<string, number>,
  alive: Set<string>,
): LaneActivity {
  const activeSet = new Set(row.activeLaneIds);
  const activity: LaneActivity = new Map();
  for (const [laneId] of columns) {
    if (activeSet.has(laneId)) {
      activity.set(laneId, "active");
    } else if (alive.has(laneId)) {
      activity.set(laneId, "pass");
    }
  }
  return activity;
}

interface GraphState {
  columns: Map<string, number>;
  catalog: readonly LaneRef[];
  forksByFrame: Map<number, string[]>;
  alive: Set<string>;
}

function rowGutterCells(row: TickRow, graph: GraphState): GutterCell[] {
  const activity = buildRowActivity(row, graph.columns, graph.alive);
  const forks = graph.forksByFrame.get(row.frameIndex) ?? [];
  return buildGraphGutterCells({
    columns: graph.columns,
    catalog: graph.catalog,
    activity,
    forks,
  });
}

function gutterWidth(cells: readonly GutterCell[]): number {
  return cells.length > 0 ? cells.length * 2 : 0;
}

function buildGraphState(
  rows: readonly TickRow[],
  catalog: readonly LaneRef[],
  w: number,
): GraphState | null {
  const columns = assignColumns(catalog);
  if (w < GRAPH_MIN_WIDTH || columns.size === 0) return null;
  return { columns, catalog, forksByFrame: detectForks(rows, catalog), alive: collectAliveLanes(rows) };
}

interface GutterBlitArgs {
  final: Surface;
  cells: readonly GutterCell[];
  x: number;
  y: number;
}

function blitGutterCells(args: GutterBlitArgs): void {
  let cx = args.x;
  for (const cell of args.cells) {
    args.final.set(cx, args.y, { char: cell.char, fg: laneColor(cell.column) });
    cx += 1;
    args.final.set(cx, args.y, { char: cell.separator, fg: laneColor(cell.separatorColumn) });
    cx += 1;
  }
}

function blitTickRows(args: BlitTickArgs): void {
  const { final, rows, catalog, cursor, w, h, startY } = args;
  const bodyHeight = h - 4;
  const { visible, offset } = scrollWindow(rows, cursor, bodyHeight > 0 ? bodyHeight : 1);
  const graph = buildGraphState(rows, catalog, w);

  let y = startY;
  for (const [i, row] of visible.entries()) {
    const cells = graph !== null ? rowGutterCells(row, graph) : [];
    const gw = gutterWidth(cells);
    const line = buildTickLine(row, { width: w - 1 - gw, selected: offset + i === cursor });
    if (cells.length > 0) blitGutterCells({ final, cells, x: 1, y });
    final.blit(stringToSurface(line, w - 1 - gw, 1), 1 + gw, y);
    y += 1;
  }
}

// ---------------------------------------------------------------------------
// Split view rendering (cycle 0014)
// ---------------------------------------------------------------------------

const SPLIT_MIN_WIDTH = 60;
const TREE_PANE_RATIO = 0.3;
const MIN_TREE_WIDTH = 20;
const MAX_TREE_WIDTH = 40;

function blitLaneTree(args: {
  final: Surface;
  catalog: readonly LaneRef[];
  selectedLaneId: string;
  laneCursor: number;
  x: number;
  w: number;
  h: number;
}): void {
  const { final, catalog, selectedLaneId, laneCursor, x, w, h } = args;
  const treeLines = buildLaneTreeLines(catalog);
  const bodyHeight = h - 4;
  const { visible, offset } = scrollWindow(treeLines, laneCursor, bodyHeight > 0 ? bodyHeight : 1);

  final.blit(stringToSurface(" Lanes", w - 1, 1), x, 0);
  final.blit(stringToSurface("\u2500".repeat(w), w, 1), x, 1);

  let y = 2;
  for (const [i, line] of visible.entries()) {
    const isSelected = line.laneId === selectedLaneId;
    const isCursor = offset + i === laneCursor;
    const marker = isCursor ? "> " : "  ";
    const text = `${marker}${isSelected ? "\u25cf " : "  "}${line.label}`;
    final.blit(stringToSurface(text.slice(0, w - 1), w - 1, 1), x, y);
    y += 1;
  }
}

function blitPaneHeader(args: { final: Surface; title: string; x: number; w: number }): void {
  args.final.blit(stringToSurface(` ${args.title}`, args.w - 1, 1), args.x, 0);
  args.final.blit(stringToSurface("\u2500".repeat(args.w), args.w, 1), args.x, 1);
}

interface TimelinePaneArgs {
  final: Surface;
  frames: readonly FrameData[];
  catalog: readonly LaneRef[];
  selectedLaneId: string;
  cursor: number;
  x: number;
  w: number;
  h: number;
}

function blitTimelinePane(args: TimelinePaneArgs): void {
  const { final, frames, catalog, selectedLaneId, cursor, x, w, h } = args;
  const rows = buildTickRows(filterFramesToLane(frames, selectedLaneId), catalog);
  blitPaneHeader({ final, title: selectedLaneId, x, w });
  if (rows.length === 0) { final.blit(stringToSurface(" No ticks.", w - 1, 1), x, 2); return; }
  const { visible, offset } = scrollWindow(rows, cursor, Math.max(1, h - 4));
  let y = 2;
  for (const [i, row] of visible.entries()) {
    final.blit(stringToSurface(buildTickLine(row, { width: w - 1, selected: offset + i === cursor }), w - 1, 1), x, y);
    y += 1;
  }
}

function renderSplitView(input: WorldlineInput): Surface {
  const { frames, catalog, cursor, w, h, selectedLaneId, laneCursor } = input;
  const final = createSurface(w, h);
  final.fill({ char: " " });

  const rawTreeW = Math.floor(w * TREE_PANE_RATIO);
  const treeW = Math.max(MIN_TREE_WIDTH, Math.min(MAX_TREE_WIDTH, rawTreeW));
  const timelineW = w - treeW - 1;

  blitLaneTree({ final, catalog, selectedLaneId: selectedLaneId ?? "", laneCursor: laneCursor ?? 0, x: 0, w: treeW, h });

  // Vertical separator
  for (let y = 0; y < h; y++) {
    final.set(treeW, y, { char: "\u2502" });
  }

  blitTimelinePane({ final, frames, catalog, selectedLaneId: selectedLaneId ?? "", cursor, x: treeW + 1, w: timelineW, h });

  final.blit(stringToSurface(" h/l lanes  j/k ticks  Enter select  Tab switch  q back", w - 1, 1), 0, h - 1);

  return final;
}

function renderNarrowSplit(input: WorldlineInput): Surface {
  const { frames, catalog, cursor, w, h, selectedLaneId } = input;
  const final = createSurface(w, h);
  final.fill({ char: " " });
  blitTimelinePane({ final, frames, catalog, selectedLaneId: selectedLaneId ?? "", cursor, x: 0, w, h });
  final.blit(stringToSurface(" h/l lanes  \u2191/\u2193 ticks  q back", w - 1, 1), 0, h - 1);
  return final;
}

function renderLegacy(input: WorldlineInput): Surface {
  const { frames, catalog, cursor, w, h } = input;
  const final = createSurface(w, h);
  final.fill({ char: " " });
  if (frames.length === 0) {
    final.blit(stringToSurface(" No history available.", w - 1, 1), 1, 0);
    return final;
  }
  blitPaneHeader({ final, title: "Worldline", x: 0, w });
  blitTickRows({ final, rows: buildTickRows(frames, catalog), catalog, cursor, w, h, startY: 2 });
  final.blit(stringToSurface(" \u2191/\u2193 scroll  Enter select  ! conflict  q back", w - 1, 1), 0, h - 1);
  return final;
}

/**
 * Render the worldline viewer as a Surface.
 */
export function renderWorldline(input: WorldlineInput): Surface {
  const { w, selectedLaneId } = input;
  if (selectedLaneId !== undefined && w >= SPLIT_MIN_WIDTH) return renderSplitView(input);
  if (selectedLaneId !== undefined) return renderNarrowSplit(input);
  return renderLegacy(input);
}

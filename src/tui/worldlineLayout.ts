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
import { assignColumns, buildGraphGutter } from "./laneGraph.ts";
import type { LaneActivity } from "./laneGraph.ts";

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
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

function uniqueWriters(receipts: readonly ReceiptSummary[]): string[] {
  const seen = new Set<string>();
  for (const r of receipts) {
    if (r.writerId !== undefined) seen.add(r.writerId);
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
    catalog.filter((l) => l.kind === "strand").map((l) => l.id),
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
function formatStrands(ids: readonly string[]): string {
  return ids.length > 0 ? ` [${ids.join(", ")}]` : "";
}

export function buildTickLine(
  row: TickRow,
  opts: { width: number; selected: boolean; gutter?: string },
): string {
  const marker = opts.selected ? "> " : "  ";
  const conflict = row.hasConflict ? "! " : "  ";
  const digest = row.digest.slice(0, DIGEST_LENGTH).padEnd(DIGEST_LENGTH);
  const frame = String(row.frameIndex).padStart(4);
  const writers = row.writers.join(", ");

  const line = `${marker}${opts.gutter ?? ""}${conflict}${frame}  ${digest}  ${writers}${formatStrands(row.strandIds)}`;
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
    catalog.filter((l) => l.kind === "strand").map((l) => l.id),
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

function rowGutter(row: TickRow, graph: GraphState): string {
  const activity = buildRowActivity(row, graph.columns, graph.alive);
  const forks = graph.forksByFrame.get(row.frameIndex) ?? [];
  return buildGraphGutter({
    columns: graph.columns,
    catalog: graph.catalog,
    activity,
    forks,
  });
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

function blitTickRows(args: BlitTickArgs): void {
  const { final, rows, catalog, cursor, w, h, startY } = args;
  const bodyHeight = h - 4;
  const { visible, offset } = scrollWindow(rows, cursor, bodyHeight > 0 ? bodyHeight : 1);
  const graph = buildGraphState(rows, catalog, w);

  let y = startY;
  for (const [i, row] of visible.entries()) {
    const gutter = graph !== null ? rowGutter(row, graph) : undefined;
    const line = buildTickLine(row, { width: w - 1, selected: offset + i === cursor, gutter });
    final.blit(stringToSurface(line, w - 1, 1), 1, y);
    y += 1;
  }
}

/**
 * Render the worldline viewer as a Surface.
 */
export function renderWorldline(input: WorldlineInput): Surface {
  const { frames, catalog, cursor, w, h } = input;
  const final = createSurface(w, h);
  final.fill({ char: " " });

  if (frames.length === 0) {
    final.blit(stringToSurface(" No history available.", w - 1, 1), 1, 0);
    return final;
  }

  final.blit(stringToSurface(" Worldline", w - 1, 1), 0, 0);
  final.blit(stringToSurface("\u2500".repeat(w), w, 1), 0, 1);
  blitTickRows({ final, rows: buildTickRows(frames, catalog), catalog, cursor, w, h, startY: 2 });
  final.blit(stringToSurface(" \u2191/\u2193 scroll  Enter select  q back", w - 1, 1), 0, h - 1);

  return final;
}

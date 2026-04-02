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
export function buildTickLine(
  row: TickRow,
  opts: { width: number; selected: boolean },
): string {
  const marker = opts.selected ? "> " : "  ";
  const conflict = row.hasConflict ? "! " : "  ";
  const digest = row.digest.slice(0, DIGEST_LENGTH).padEnd(DIGEST_LENGTH);
  const frame = String(row.frameIndex).padStart(4);
  const writerStr = row.writers.length > 0 ? row.writers.join(", ") : "";
  const strandStr =
    row.strandIds.length > 0 ? ` [${row.strandIds.join(", ")}]` : "";

  const line = `${marker}${conflict}${frame}  ${digest}  ${writerStr}${strandStr}`;
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
  cursor: number;
  w: number;
  h: number;
  startY: number;
}

function blitTickRows(args: BlitTickArgs): void {
  const { final, rows, cursor, w, h, startY } = args;
  const bodyHeight = h - 4;
  const { visible, offset } = scrollWindow(rows, cursor, bodyHeight > 0 ? bodyHeight : 1);
  let y = startY;
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i];
    if (row === undefined) continue;
    const line = buildTickLine(row, { width: w - 1, selected: offset + i === cursor });
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
  blitTickRows({ final, rows: buildTickRows(frames, catalog), cursor, w, h, startY: 2 });
  final.blit(stringToSurface(" \u2191/\u2193 scroll  Enter select  q back", w - 1, 1), 0, h - 1);

  return final;
}

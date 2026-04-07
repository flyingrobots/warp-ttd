/**
 * Lane graph renderer — pure functions for column assignment and
 * graph gutter rendering.
 *
 * Cycle 0012 — Lane Graph Renderer.
 */
import type { LaneRef } from "../protocol.ts";

/** Activity state for a lane at a given tick. */
export type LaneActivityState = "active" | "pass" | "quiet";

/** Map from lane ID to its activity state at a given tick. */
export type LaneActivity = Map<string, LaneActivityState>;

/**
 * Assign a stable column index to each lane. Worldlines get the
 * lowest columns, strands follow. Order within each group matches
 * catalog order.
 */
export function assignColumns(
  catalog: readonly LaneRef[],
): Map<string, number> {
  const columns = new Map<string, number>();
  const worldlines = catalog.filter((l) => l.kind === "worldline");
  const strands = catalog.filter((l) => l.kind === "strand");

  let col = 0;
  for (const lane of [...worldlines, ...strands]) {
    columns.set(lane.id, col);
    col += 1;
  }

  return columns;
}

/** Character lookup: [isStrand][state] → glyph */
const GLYPHS: Record<string, Record<string, string>> = {
  worldline: { active: "●", pass: "│", quiet: "·" },
  strand: { active: "●", pass: "┆", quiet: "·" },
};

function resolveGlyph(kind: string, state: string, isFork: boolean): string {
  if (isFork) return "├";
  return GLYPHS[kind]?.[state] ?? " ";
}

interface GraphGutterArgs {
  columns: Map<string, number>;
  catalog: readonly LaneRef[];
  activity: LaneActivity;
  forks: readonly string[];
}

interface GutterLookup {
  colToLane: Map<number, string>;
  laneById: Map<string, LaneRef>;
  activity: LaneActivity;
  forkSet: Set<string>;
}

function resolveColumn(col: number, ctx: GutterLookup): string {
  const laneId = ctx.colToLane.get(col);
  if (laneId === undefined) return " ";
  const lane = ctx.laneById.get(laneId);
  const state = ctx.activity.get(laneId);
  if (lane === undefined || state === undefined) return " ";
  return resolveGlyph(lane.kind, state, ctx.forkSet.has(laneId));
}

export interface GutterCell {
  char: string;
  column: number;
}

const LANE_COLORS: readonly string[] = [
  "#4ec9b0", "#569cd6", "#c586c0", "#ce9178",
  "#dcdcaa", "#9cdcfe", "#d7ba7d", "#b5cea8",
];

export function laneColor(column: number): string {
  return LANE_COLORS[column % LANE_COLORS.length] ?? "#cccccc";
}

/**
 * Build graph gutter as structured cells with column indices.
 * Each cell carries the glyph and its column for color mapping.
 */
export function buildGraphGutterCells(args: GraphGutterArgs): GutterCell[] {
  const totalCols = args.columns.size;
  if (totalCols === 0) return [];

  const colToLane = new Map<number, string>();
  for (const [id, c] of args.columns) colToLane.set(c, id);
  const ctx: GutterLookup = {
    colToLane,
    laneById: new Map(args.catalog.map((l) => [l.id, l])),
    activity: args.activity,
    forkSet: new Set(args.forks),
  };

  const cells: GutterCell[] = [];
  for (let c = 0; c < totalCols; c++) {
    cells.push({ char: resolveColumn(c, ctx), column: c });
  }
  return cells;
}

/**
 * Build a fixed-width graph gutter string for one tick row.
 *
 * Each column occupies 2 characters: the rail char + a space.
 * Total width = columnCount * 2.
 */
export function buildGraphGutter(args: GraphGutterArgs): string {
  const cells = buildGraphGutterCells(args);
  if (cells.length === 0) return " ";
  return cells.map((c) => c.char).join(" ") + " ";
}

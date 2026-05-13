/**
 * Navigator layout — pure rendering logic, testable without a terminal.
 *
 * All functions take data and return Surfaces. The bijou BijouContext
 * is injected so tests can provide a stub.
 */
import {
  createSurface,
  stringToSurface,
  boxSurface,
  tableSurface
} from "@flyingrobots/bijou";
import type { TableColumn } from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { SessionSnapshot, PinnedObservation } from "../app/debuggerSession.ts";
import {
  formatDeliveryOutcome,
  formatExecutionMode,
  formatLaneKind,
  formatWriterRef,
} from "../protocol.ts";
import type { AdapterCapability, LaneRef, WriterRef } from "../protocol.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_LANES = 8;
export const MAX_RECEIPTS = 6;
export const MAX_EFFECTS = 6;
export const MAX_PINS = 3;
export const HORIZONTAL_THRESHOLD = 93;

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

export function hasAdapterCap(
  caps: readonly AdapterCapability[],
  cap: AdapterCapability
): boolean {
  return caps.includes(cap);
}

export function pluralize(n: number, noun: string): string {
  return n === 1 ? `${n.toString()} ${noun}` : `${n.toString()} ${noun}s`;
}

function writerSortKey(writer?: WriterRef): string {
  if (writer === undefined) {
    return "";
  }

  return `${writer.writerId}\u0000${writer.worldlineId}\u0000${writer.headId ?? ""}`;
}

/** Build lane tree: roots in catalog order, depth-first pre-order. */
export function buildLaneTree(catalog: readonly LaneRef[]): LaneRef[] {
  const roots = catalog.filter((l) => l.parentId === undefined);
  const childrenOf = (parentId: string): LaneRef[] =>
    catalog.filter((l) => l.parentId === parentId);

  const result: LaneRef[] = [];
  for (const root of roots) {
    result.push(root);
    const addChildren = (parent: string): void => {
      for (const child of childrenOf(parent)) {
        result.push(child);
        addChildren(child.id);
      }
    };
    addChildren(root.id);
  }
  return result;
}

export function truncateRows<T>(rows: readonly T[], max: number): { visible: T[]; total: number } {
  return { visible: rows.slice(0, max), total: rows.length };
}

export interface PositionBarArgs {
  snap: SessionSnapshot;
  caps: readonly AdapterCapability[];
  catalog: readonly LaneRef[];
  wide: boolean;
}

function receiptPositionText(args: PositionBarArgs): string {
  if (!hasAdapterCap(args.caps, "READ_RECEIPTS")) return "receipts: unsupported";

  return args.wide
    ? pluralize(args.snap.receipts.length, "receipt")
    : `${args.snap.receipts.length.toString()}r`;
}

function effectPositionText(args: PositionBarArgs): string {
  if (!hasAdapterCap(args.caps, "READ_EFFECT_EMISSIONS")) return "effects: unsupported";

  return args.wide
    ? pluralize(args.snap.emissions.length, "effect")
    : `${args.snap.emissions.length.toString()}e`;
}

export function buildPositionBar(args: PositionBarArgs): string {
  const { snap, catalog } = args;
  const parts = [
    `Frame ${snap.frame.frameIndex.toString()}`,
    catalog[0]?.id ?? "\u2014",
    formatExecutionMode(snap.execCtx.mode),
    receiptPositionText(args),
    effectPositionText(args)
  ];

  return parts.join(" \u2502 ");
}

export function buildLaneLines(
  catalog: readonly LaneRef[],
  snap: SessionSnapshot,
  hasReceipts: boolean
): { lines: string[]; header: string; total: number } {
  const laneTree = buildLaneTree(catalog);
  const receiptLanes = new Set(snap.receipts.map((r) => r.laneId));
  const { visible, total } = truncateRows(laneTree, MAX_LANES);

  const lines = visible.map((lane) => {
    const frameView = snap.frame.lanes.find((l) => l.laneId === lane.id);
    const tick = frameView !== undefined ? frameView.coordinate.tick.toString() : "\u2014";
    const prefix = lane.parentId !== undefined ? " \u2514 " : " ";
    const chgCol = hasReceipts ? (receiptLanes.has(lane.id) ? " *" : "  ") : "";
    return `${prefix}${lane.id.padEnd(16)} ${formatLaneKind(lane.kind).padEnd(10)} tick ${tick.padStart(3)}${chgCol}`;
  });
  if (total > MAX_LANES) {
    lines.push(` +${(total - MAX_LANES).toString()} more lanes`);
  }

  const header = hasReceipts
    ? " Lane             Kind       Tick  Chg"
    : " Lane             Kind       Tick";

  return { lines, header, total };
}

export function buildReceiptRows(snap: SessionSnapshot, max: number): { rows: string[][]; total: number } {
  const sorted = [...snap.receipts].sort((a, b) => {
    const lc = a.laneId.localeCompare(b.laneId);
    if (lc !== 0) return lc;
    return writerSortKey(a.writer).localeCompare(writerSortKey(b.writer));
  });
  const { visible, total } = truncateRows(sorted, max);
  const rows = visible.map((r) => [
    r.laneId,
    r.writer === undefined ? "\u2014" : formatWriterRef(r.writer),
    r.admittedRewriteCount.toString(),
    r.rejectedRewriteCount.toString(),
    r.counterfactualCount.toString()
  ]);
  return { rows, total };
}

export function buildEffectRows(
  snap: SessionSnapshot,
  caps: readonly AdapterCapability[],
  max: number
): { rows: string[][]; total: number } {
  const hasDeliveries = hasAdapterCap(caps, "READ_DELIVERY_OBSERVATIONS");
  const allRows: string[][] = snap.emissions.flatMap((em) => {
    if (!hasDeliveries) {
      return [[em.effectKind, em.laneId, "\u2014", "(delivery unsupported)"]];
    }
    const deliveries = snap.observations.filter((o) => o.emissionId === em.emissionId);
    if (deliveries.length === 0) {
      return [[em.effectKind, em.laneId, "(none)", "emitted"]];
    }
    return deliveries.map((o) => [
      em.effectKind,
      em.laneId,
      o.sinkId.replace("sink:", ""),
      formatDeliveryOutcome(o.outcome),
    ]);
  });
  const { visible, total } = truncateRows(allRows, max);
  return { rows: visible, total };
}

export function buildPinLines(pins: readonly PinnedObservation[]): { lines: string[]; total: number } {
  const { visible, total } = truncateRows(pins, MAX_PINS);
  const lines = visible.map((p) =>
    `  [f${p.pinnedAt.toString()}] ${p.emission.effectKind} \u2192 ${p.observation.sinkId.replace("sink:", "")}: ${p.observation.outcome}`
  );
  if (total > MAX_PINS) {
    lines.push(`  +${(total - MAX_PINS).toString()} older pins`);
  }
  return { lines, total };
}

// ---------------------------------------------------------------------------
// Surface rendering (needs BijouContext for styling)
// ---------------------------------------------------------------------------

export interface NavigatorInput {
  snap: SessionSnapshot;
  caps: readonly AdapterCapability[];
  catalog: readonly LaneRef[];
  pins: readonly PinnedObservation[];
  error: string | null;
  jumpInput: string | null;
  w: number;
  h: number;
  ctx: BijouContext;
}

interface NavigatorRenderState {
  final: Surface;
  input: NavigatorInput;
  wide: boolean;
  hasReceipts: boolean;
  hasEmissions: boolean;
}

function createNavigatorState(input: NavigatorInput): NavigatorRenderState {
  const final = createSurface(input.w, input.h);
  final.fill({ char: " " });

  return {
    final,
    input,
    wide: input.w >= HORIZONTAL_THRESHOLD,
    hasReceipts: hasAdapterCap(input.caps, "READ_RECEIPTS"),
    hasEmissions: hasAdapterCap(input.caps, "READ_EFFECT_EMISSIONS")
  };
}

function renderPositionAndLanes(state: NavigatorRenderState): number {
  const { final, input, wide, hasReceipts } = state;
  const { snap, caps, catalog, w } = input;
  let y = 0;

  final.blit(stringToSurface(` ${buildPositionBar({ snap, caps, catalog, wide })}`, w - 1, 1), 1, y);
  final.blit(stringToSurface("\u2500".repeat(w - 2), w - 2, 1), 1, y + 1);
  y += 2;

  const laneData = buildLaneLines(catalog, snap, hasReceipts);
  final.blit(stringToSurface(laneData.header, w - 2, 1), 1, y);
  for (const [index, line] of laneData.lines.entries()) {
    final.blit(stringToSurface(line, w - 2, 1), 1, y + 1 + index);
  }

  return y + laneData.lines.length + 2;
}

function renderSummarySections(state: NavigatorRenderState, startY: number): void {
  const { final, input, wide, hasReceipts, hasEmissions } = state;
  const { snap, caps, w, ctx } = input;
  const args: RenderSectionArgs = { final, snap, caps, w, startY, ctx };

  if (wide && hasReceipts && hasEmissions) {
    renderSideBySide(args);
    return;
  }

  renderStacked({ ...args, hasReceipts, hasEmissions });
}

function renderPins(state: NavigatorRenderState): void {
  const { final, input } = state;
  const { pins, error, w, h } = input;
  const flashY = h - 3;
  const pinsEndY = error !== null ? flashY - 1 : flashY;

  if (pins.length === 0) return;

  const pinData = buildPinLines(pins);
  const pinStartY = pinsEndY - pinData.lines.length - 1;
  final.blit(stringToSurface(` \u2550\u2550\u2550 Pins (${pinData.total.toString()}) \u2550\u2550\u2550`, w - 2, 1), 1, pinStartY);
  for (const [index, line] of pinData.lines.entries()) {
    final.blit(stringToSurface(line, w - 2, 1), 1, pinStartY + 1 + index);
  }
}

function renderStatus(state: NavigatorRenderState): void {
  const { final, input } = state;
  const { error, jumpInput, w, h } = input;
  const statusY = h - 2;
  const flashY = h - 3;

  if (error !== null) {
    final.blit(stringToSurface(` ${error}`, w - 2, 1), 1, flashY);
  }

  const controlText = jumpInput !== null
    ? ` Jump to frame: ${jumpInput}_  [Enter] Go  [Esc] Cancel`
    : " [n/\u2192] Fwd  [p/\u2190] Back  [g] Jump  [P] Pin  [u] Unpin  [d] Disc";
  final.blit(stringToSurface(controlText, w - 2, 1), 1, statusY);
}

export function renderNavigator(input: NavigatorInput): Surface {
  const state = createNavigatorState(input);
  const y = renderPositionAndLanes(state);
  renderSummarySections(state, y);
  renderPins(state);
  renderStatus(state);

  return state.final;
}

// --- Internal render helpers ---

interface RenderSectionArgs {
  final: Surface;
  snap: SessionSnapshot;
  caps: readonly AdapterCapability[];
  w: number;
  startY: number;
  ctx: BijouContext;
}

function receiptTitle(total: number): string {
  return total > MAX_RECEIPTS
    ? ` Receipts (${MAX_RECEIPTS.toString()} of ${total.toString()}) `
    : " Receipts ";
}

function effectTitle(snap: SessionSnapshot, total: number): string {
  return total > MAX_EFFECTS
    ? ` Effects [${snap.execCtx.mode}] (${MAX_EFFECTS.toString()} of ${total.toString()}) `
    : ` Effects [${snap.execCtx.mode}] `;
}

function compactReceiptColumns(): TableColumn[] {
  return [
    { header: "Lane", width: 14 }, { header: "Writer", width: 10 },
    { header: "Adm", width: 4 }, { header: "Rej", width: 4 }, { header: "CF", width: 3 }
  ];
}

function stackedReceiptColumns(): TableColumn[] {
  return [
    { header: "Lane", width: 14 }, { header: "Writer", width: 12 },
    { header: "Adm", width: 5 }, { header: "Rej", width: 5 }, { header: "CF", width: 4 }
  ];
}

function effectColumns(compact: boolean): TableColumn[] {
  return compact
    ? [
      { header: "Kind", width: 10 }, { header: "Lane", width: 10 },
      { header: "Sink", width: 10 }, { header: "Stat", width: 8 }
    ]
    : [
      { header: "Kind", width: 12 }, { header: "Lane", width: 14 },
      { header: "Sink", width: 12 }, { header: "Stat", width: 10 }
    ];
}

interface BoxedTableArgs {
  columns: TableColumn[];
  rows: string[][];
  title: string;
  width: number;
  ctx: BijouContext;
}

function boxedTable(args: BoxedTableArgs): Surface {
  const { columns, rows, title, width, ctx } = args;
  return boxSurface(tableSurface({ columns, rows, ctx }), { title, width, ctx });
}

interface SideBySideEffectArgs {
  args: RenderSectionArgs;
  eRows: string[][];
  eTotal: number;
  halfW: number;
  rBox: Surface;
  y: number;
}

function renderSideBySideEffects(input: SideBySideEffectArgs): number {
  const { args, eRows, eTotal, halfW, rBox, y } = input;
  const { final, snap, ctx: bijouCtx } = args;

  if (eRows.length === 0) {
    const empty = stringToSurface(" (none at this frame)", halfW - 4, 1);
    final.blit(boxSurface(empty, { title: effectTitle(snap, eTotal), width: halfW, ctx: bijouCtx }), halfW + 2, y);
    return y + rBox.height + 1;
  }

  const eBox = boxedTable({
    columns: effectColumns(true),
    rows: eRows,
    title: effectTitle(snap, eTotal),
    width: halfW,
    ctx: bijouCtx
  });
  final.blit(eBox, halfW + 2, y);
  return y + Math.max(rBox.height, eBox.height) + 1;
}

function renderSideBySide(args: RenderSectionArgs): number {
  const { final, snap, caps, w, startY, ctx: bijouCtx } = args;
  let y = startY;
  const halfW = Math.floor((w - 3) / 2);
  const { rows: rRows, total: rTotal } = buildReceiptRows(snap, MAX_RECEIPTS);
  const { rows: eRows, total: eTotal } = buildEffectRows(snap, caps, MAX_EFFECTS);

  if (rRows.length > 0) {
    const rBox = boxedTable({
      columns: compactReceiptColumns(),
      rows: rRows,
      title: receiptTitle(rTotal),
      width: halfW,
      ctx: bijouCtx
    });
    final.blit(rBox, 1, y);

    y = renderSideBySideEffects({ args, eRows, eTotal, halfW, rBox, y });
  } else {
    final.blit(stringToSurface(" (no receipts at this frame)", w - 2, 1), 1, y);
    y += 2;
  }

  return y;
}

function renderStackedReceipts(args: RenderSectionArgs): number {
  const { final, snap, w, startY, ctx: bijouCtx } = args;
  const { rows, total } = buildReceiptRows(snap, MAX_RECEIPTS);

  if (rows.length === 0) {
    final.blit(stringToSurface(" (no receipts at this frame)", w - 2, 1), 1, startY);
    return startY + 2;
  }

  const tbl = tableSurface({ columns: stackedReceiptColumns(), rows, ctx: bijouCtx });
  final.blit(boxSurface(tbl, { title: receiptTitle(total), width: w - 2, ctx: bijouCtx }), 1, startY);
  return startY + tbl.height + 3;
}

function renderStackedEffects(args: RenderSectionArgs): number {
  const { final, snap, caps, w, startY, ctx: bijouCtx } = args;
  const { rows, total } = buildEffectRows(snap, caps, MAX_EFFECTS);

  if (rows.length === 0) {
    final.blit(stringToSurface(" (no effects at this frame)", w - 2, 1), 1, startY);
    return startY + 2;
  }

  const tbl = tableSurface({ columns: effectColumns(false), rows, ctx: bijouCtx });
  final.blit(boxSurface(tbl, { title: effectTitle(snap, total), width: w - 2, ctx: bijouCtx }), 1, startY);
  return startY + tbl.height + 3;
}

function renderStacked(args: RenderSectionArgs & { hasReceipts: boolean; hasEmissions: boolean }): number {
  const { hasReceipts, hasEmissions, startY } = args;
  let y = startY;

  if (hasReceipts) {
    y = renderStackedReceipts({ ...args, startY: y });
  }

  if (hasEmissions) {
    y = renderStackedEffects({ ...args, startY: y });
  }

  return y;
}

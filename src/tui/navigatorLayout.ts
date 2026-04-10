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
import { formatEffectKind } from "../EffectKind.ts";
import {
  formatDeliveryOutcome,
  formatExecutionMode,
  formatLaneKind,
  formatWriterRef,
} from "../protocol.ts";
import type { Capability, LaneRef, WriterRef } from "../protocol.ts";

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

export function hasCap(caps: readonly Capability[], cap: Capability): boolean {
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
  caps: readonly Capability[];
  catalog: readonly LaneRef[];
  wide: boolean;
}

export function buildPositionBar(args: PositionBarArgs): string {
  const { snap, caps, catalog, wide } = args;
  const parts = [
    `Frame ${snap.frame.frameIndex.toString()}`,
    catalog[0]?.id ?? "\u2014",
    formatExecutionMode(snap.execCtx.mode)
  ];
  if (hasCap(caps, "READ_RECEIPTS")) {
    parts.push(wide ? pluralize(snap.receipts.length, "receipt") : `${snap.receipts.length.toString()}r`);
  } else {
    parts.push("receipts: unsupported");
  }
  if (hasCap(caps, "READ_EFFECT_EMISSIONS")) {
    parts.push(wide ? pluralize(snap.emissions.length, "effect") : `${snap.emissions.length.toString()}e`);
  } else {
    parts.push("effects: unsupported");
  }
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
  caps: readonly Capability[],
  max: number
): { rows: string[][]; total: number } {
  const hasDeliveries = hasCap(caps, "READ_DELIVERY_OBSERVATIONS");
  const allRows: string[][] = snap.emissions.flatMap((em) => {
    if (!hasDeliveries) {
      return [[formatEffectKind(em.effectKind), em.laneId, "\u2014", "(delivery unsupported)"]];
    }
    const deliveries = snap.observations.filter((o) => o.emissionId === em.emissionId);
    if (deliveries.length === 0) {
      return [[formatEffectKind(em.effectKind), em.laneId, "(none)", "emitted"]];
    }
    return deliveries.map((o) => [
      formatEffectKind(em.effectKind),
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
    `  [f${p.pinnedAt.toString()}] ${formatEffectKind(p.emission.effectKind)} \u2192 ${p.observation.sinkId.replace("sink:", "")}: ${p.observation.outcome}`
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
  caps: readonly Capability[];
  catalog: readonly LaneRef[];
  pins: readonly PinnedObservation[];
  error: string | null;
  jumpInput: string | null;
  w: number;
  h: number;
  ctx: BijouContext;
}

export function renderNavigator(input: NavigatorInput): Surface {
  const { snap, caps, catalog, pins, error, jumpInput, w, h, ctx: bijouCtx } = input;
  const final = createSurface(w, h);
  final.fill({ char: " " });
  const wide = w >= HORIZONTAL_THRESHOLD;
  const hasReceipts = hasCap(caps, "READ_RECEIPTS");
  const hasEmissions = hasCap(caps, "READ_EFFECT_EMISSIONS");
  let y = 0;

  // --- position-bar ---
  final.blit(stringToSurface(` ${buildPositionBar({ snap, caps, catalog, wide })}`, w - 1, 1), 1, y);
  y += 1;
  final.blit(stringToSurface("\u2500".repeat(w - 2), w - 2, 1), 1, y);
  y += 1;

  // --- lane-table ---
  const laneData = buildLaneLines(catalog, snap, hasReceipts);
  final.blit(stringToSurface(laneData.header, w - 2, 1), 1, y);
  y += 1;
  for (const line of laneData.lines) {
    final.blit(stringToSurface(line, w - 2, 1), 1, y);
    y += 1;
  }
  y += 1;

  // --- receipt-summary + effect-summary ---
  const renderArgs: RenderSectionArgs = { final, snap, caps, w, startY: y, ctx: bijouCtx };
  if (wide && hasReceipts && hasEmissions) {
    renderSideBySide(renderArgs);
  } else {
    renderStacked({ ...renderArgs, hasReceipts, hasEmissions });
  }

  // --- pins-panel ---
  const statusY = h - 2;
  const flashY = h - 3;
  const pinsEndY = error !== null ? flashY - 1 : flashY;

  if (pins.length > 0) {
    const pinData = buildPinLines(pins);
    const pinStartY = pinsEndY - pinData.lines.length - 1;
    final.blit(stringToSurface(` \u2550\u2550\u2550 Pins (${pinData.total.toString()}) \u2550\u2550\u2550`, w - 2, 1), 1, pinStartY);
    for (let i = 0; i < pinData.lines.length; i++) {
      final.blit(stringToSurface(pinData.lines[i] ?? "", w - 2, 1), 1, pinStartY + 1 + i);
    }
  }

  // --- status-bar ---
  if (error !== null) {
    final.blit(stringToSurface(` ${error}`, w - 2, 1), 1, flashY);
  }

  const controlText = jumpInput !== null
    ? ` Jump to frame: ${jumpInput}_  [Enter] Go  [Esc] Cancel`
    : " [n/\u2192] Fwd  [p/\u2190] Back  [g] Jump  [P] Pin  [u] Unpin  [d] Disc";
  final.blit(stringToSurface(controlText, w - 2, 1), 1, statusY);

  return final;
}

// --- Internal render helpers ---

interface RenderSectionArgs {
  final: Surface;
  snap: SessionSnapshot;
  caps: readonly Capability[];
  w: number;
  startY: number;
  ctx: BijouContext;
}

function renderSideBySide(args: RenderSectionArgs): number {
  const { final, snap, caps, w, startY, ctx: bijouCtx } = args;
  let y = startY;
  const halfW = Math.floor((w - 3) / 2);
  const { rows: rRows, total: rTotal } = buildReceiptRows(snap, MAX_RECEIPTS);
  const { rows: eRows, total: eTotal } = buildEffectRows(snap, caps, MAX_EFFECTS);

  const rTitle = rTotal > MAX_RECEIPTS ? ` Receipts (${MAX_RECEIPTS.toString()} of ${rTotal.toString()}) ` : " Receipts ";
  const eTitle = eTotal > MAX_EFFECTS
    ? ` Effects [${snap.execCtx.mode}] (${MAX_EFFECTS.toString()} of ${eTotal.toString()}) `
    : ` Effects [${snap.execCtx.mode}] `;

  if (rRows.length > 0) {
    const rCols: TableColumn[] = [
      { header: "Lane", width: 14 }, { header: "Writer", width: 10 },
      { header: "Adm", width: 4 }, { header: "Rej", width: 4 }, { header: "CF", width: 3 }
    ];
    const rBox = boxSurface(tableSurface({ columns: rCols, rows: rRows, ctx: bijouCtx }), { title: rTitle, width: halfW, ctx: bijouCtx });
    final.blit(rBox, 1, y);

    if (eRows.length > 0) {
      const eCols: TableColumn[] = [
        { header: "Kind", width: 10 }, { header: "Lane", width: 10 },
        { header: "Sink", width: 10 }, { header: "Stat", width: 8 }
      ];
      const eBox = boxSurface(tableSurface({ columns: eCols, rows: eRows, ctx: bijouCtx }), { title: eTitle, width: halfW, ctx: bijouCtx });
      final.blit(eBox, halfW + 2, y);
      y += Math.max(rBox.height, eBox.height) + 1;
    } else {
      final.blit(boxSurface(stringToSurface(" (none at this frame)", halfW - 4, 1), { title: eTitle, width: halfW, ctx: bijouCtx }), halfW + 2, y);
      y += rBox.height + 1;
    }
  } else {
    final.blit(stringToSurface(" (no receipts at this frame)", w - 2, 1), 1, y);
    y += 2;
  }

  return y;
}

function renderStacked(args: RenderSectionArgs & { hasReceipts: boolean; hasEmissions: boolean }): number {
  const { final, snap, caps, w, startY, ctx: bijouCtx, hasReceipts, hasEmissions } = args;
  let y = startY;

  if (hasReceipts) {
    const { rows, total } = buildReceiptRows(snap, MAX_RECEIPTS);
    const title = total > MAX_RECEIPTS ? ` Receipts (${MAX_RECEIPTS.toString()} of ${total.toString()}) ` : " Receipts ";
    if (rows.length > 0) {
      const cols: TableColumn[] = [
        { header: "Lane", width: 14 }, { header: "Writer", width: 12 },
        { header: "Adm", width: 5 }, { header: "Rej", width: 5 }, { header: "CF", width: 4 }
      ];
      const tbl = tableSurface({ columns: cols, rows, ctx: bijouCtx });
      final.blit(boxSurface(tbl, { title, width: w - 2, ctx: bijouCtx }), 1, y);
      y += tbl.height + 3;
    } else {
      final.blit(stringToSurface(" (no receipts at this frame)", w - 2, 1), 1, y);
      y += 2;
    }
  }

  if (hasEmissions) {
    const { rows, total } = buildEffectRows(snap, caps, MAX_EFFECTS);
    const title = total > MAX_EFFECTS
      ? ` Effects [${snap.execCtx.mode}] (${MAX_EFFECTS.toString()} of ${total.toString()}) `
      : ` Effects [${snap.execCtx.mode}] `;
    if (rows.length > 0) {
      const cols: TableColumn[] = [
        { header: "Kind", width: 12 }, { header: "Lane", width: 14 },
        { header: "Sink", width: 12 }, { header: "Stat", width: 10 }
      ];
      const tbl = tableSurface({ columns: cols, rows, ctx: bijouCtx });
      final.blit(boxSurface(tbl, { title, width: w - 2, ctx: bijouCtx }), 1, y);
      y += tbl.height + 3;
    } else {
      final.blit(stringToSurface(" (no effects at this frame)", w - 2, 1), 1, y);
      y += 2;
    }
  }

  return y;
}

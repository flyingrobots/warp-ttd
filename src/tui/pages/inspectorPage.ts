/**
 * Inspector page — detailed frame and receipt breakdown.
 */
import {
  vstack,
} from "@flyingrobots/bijou-tui";
import {
  createSurface,
  stringToSurface,
  boxSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";
import type { NeighborhoodCoreSummary } from "../../app/NeighborhoodCoreSummary.ts";
import type { ReintegrationDetailSummary } from "../../app/ReintegrationDetailSummary.ts";
import type { ReceiptShellSummary } from "../../app/ReceiptShellSummary.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface InspectorModel {
  time: number;
  sessionCtx: SessionContext | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type InspectorMsg =
  | { type: "pulse"; dt: number }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" };

export function buildNeighborhoodCoreLines(core: NeighborhoodCoreSummary): string {
  const lines = [
    ` Site: ${core.siteId}`,
    ` Summary: ${core.summary}`,
    ` Outcome: ${core.outcome}`,
    ` Coordinate: ${core.coordinate.laneId}@${core.coordinate.tick.toString()}`,
    ` Primary Lane: ${core.primaryLaneId}`,
    ` Primary Worldline: ${core.primaryWorldlineId}`,
    ` Participating Lanes: ${core.participatingLaneIds.length.toString()}`
  ];

  for (const laneId of core.participatingLaneIds) {
    lines.push(` Lane: ${laneId}`);
  }

  if (core.alternatives.length === 0) {
    lines.push(" Alternatives: none");
  } else {
    lines.push(` Alternatives: ${core.alternatives.length.toString()}`);
  }

  for (const alternative of core.alternatives) {
    lines.push(
      ` Alternative: ${alternative.kind} [${alternative.outcome}] ${alternative.summary}`
    );
  }

  return lines.join("\n");
}

export function buildReintegrationLines(detail: ReintegrationDetailSummary): string {
  const lines = [
    ` Site: ${detail.siteId}`,
    ` Summary: ${detail.summary}`,
  ];

  for (const anchor of detail.anchors) {
    lines.push(` Anchor: ${anchor.kind} ${anchor.laneId ?? anchor.anchorId}`);
  }

  for (const obligation of detail.obligations) {
    lines.push(` Obligation: ${obligation.kind} [${obligation.status}]`);
  }

  for (const evidence of detail.evidence) {
    lines.push(` Evidence: ${evidence.visibility} ${evidence.evidenceId}`);
  }

  return lines.join("\n");
}

export function buildReceiptShellLines(shell: ReceiptShellSummary): string {
  const lines = [
    ` Site: ${shell.siteId}`,
    ` Summary: ${shell.summary}`,
    ` Receipts: ${shell.receiptIds.length.toString()}`,
    ` Candidates: ${shell.candidateCount.toString()}`,
    ` Rejected: ${shell.rejectedCount.toString()}`,
    ` Blocking: ${shell.hasBlockingRelation ? "yes" : "no"}`
  ];

  for (const receiptId of shell.receiptIds) {
    lines.push(` Receipt: ${receiptId}`);
  }

  return lines.join("\n");
}

function hasReintegrationContent(detail: ReintegrationDetailSummary): boolean {
  return detail.anchors.length > 0 || detail.obligations.length > 0;
}

interface InspectorRenderArgs {
  model: InspectorModel;
  size: { w: number; h: number };
  ctx: BijouContext;
}

interface BoxBlitArgs {
  final: Surface;
  content: string;
  title: string;
  width: number;
  y: number;
  ctx: BijouContext;
}

interface InspectorDetailBlitArgs {
  final: Surface;
  sessionCtx: SessionContext;
  width: number;
  startY: number;
  ctx: BijouContext;
}

interface InspectorOverviewBlitArgs {
  final: Surface;
  sessionCtx: SessionContext;
  width: number;
  ctx: BijouContext;
}

function disconnectedInspectorSurface(args: InspectorRenderArgs): Surface {
  const { model, size, ctx } = args;
  const bg = renderWaveShader(size.w, size.h, model.time);
  return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Neighborhood", ctx);
}

function contextInfoLines(sessionCtx: SessionContext): string {
  const { session, hello } = sessionCtx;
  return vstack(
    ` Host Kind:    ${hello.hostKind}`,
    ` Version:      ${hello.hostVersion}`,
    ` Protocol:     ${hello.protocolVersion}`,
    ` Session Mode: ${session.snapshot.execCtx.mode}`,
    ` Capabilities: ${hello.capabilities.length.toString()}`,
    ` Catalog Lanes: ${sessionCtx.catalog.lanes.length.toString()}`,
    ` Session:      ${session.sessionId.slice(0, 8)}`,
  );
}

function blitBox(args: BoxBlitArgs): number {
  const surface = stringToSurface(args.content, args.width - 2, args.content.split("\n").length);
  const boxed = boxSurface(surface, { title: args.title, width: args.width, ctx: args.ctx });
  args.final.blit(boxed, 1, args.y);
  return boxed.height;
}

function blitInspectorDetails(args: InspectorDetailBlitArgs): void {
  const { snapshot } = args.sessionCtx.session;
  const detailLines = buildReintegrationLines(snapshot.reintegrationDetail);
  const detailVisible = hasReintegrationContent(snapshot.reintegrationDetail);
  let y = args.startY;

  if (detailVisible) {
    y += blitBox({
      final: args.final,
      content: detailLines,
      title: " Reintegration Detail ",
      width: args.width,
      y,
      ctx: args.ctx
    }) + 1;
  }

  if (snapshot.receiptShell.receiptIds.length > 0) {
    blitBox({
      final: args.final,
      content: buildReceiptShellLines(snapshot.receiptShell),
      title: " Receipt Shell ",
      width: args.width,
      y,
      ctx: args.ctx
    });
  }
}

function blitInspectorOverview(args: InspectorOverviewBlitArgs): number {
  const coreHeight = blitBox({
    final: args.final,
    content: buildNeighborhoodCoreLines(args.sessionCtx.session.snapshot.neighborhoodCore),
    title: " Neighborhood Core ",
    width: args.width,
    y: 1,
    ctx: args.ctx
  });
  const contextHeight = blitBox({
    final: args.final,
    content: contextInfoLines(args.sessionCtx),
    title: " Context ",
    width: args.width,
    y: coreHeight + 3,
    ctx: args.ctx
  });

  return coreHeight + contextHeight + 5;
}

function connectedInspectorSurface(args: InspectorRenderArgs): Surface {
  const { model, size, ctx } = args;
  const final = createSurface(size.w, size.h);
  const sessionCtx = model.sessionCtx;

  if (sessionCtx === null) {
    throw new TypeError("connectedInspectorSurface requires a session context");
  }

  final.fill({ char: " " });

  const boxWidth = size.w - 2;
  const detailStartY = blitInspectorOverview({
    final,
    sessionCtx,
    width: boxWidth,
    ctx
  });
  blitInspectorDetails({
    final,
    sessionCtx,
    width: boxWidth,
    startY: detailStartY,
    ctx
  });

  return final;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function renderInspector(args: InspectorRenderArgs): Surface {
  if (args.model.sessionCtx === null) {
    return disconnectedInspectorSurface(args);
  }

  return connectedInspectorSurface(args);
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function inspectorPage(ctx: BijouContext): FramePage<InspectorModel, InspectorMsg> {
  const initial: InspectorModel = {
    time: 0,
    sessionCtx: null,
  };

  return {
    id: "inspect",
    title: "Neighborhood",
    init: () => [initial, []],

    update: (msg, model): [InspectorModel, []] => {
      if (!isPageMsg<InspectorMsg>(msg)) return [model, []];
      const m = msg;
      if (m.type === "pulse") return [{ ...model, time: model.time + m.dt }, []];
      if (m.type === "session-ready") return [{ ...model, sessionCtx: m.ctx }, []];
      return [{ ...initial, time: model.time }, []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderInspector({ model, size: { w, h }, ctx }),
    }),
  };
}

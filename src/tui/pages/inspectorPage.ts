/**
 * Neighborhood page — local site browser with core, seam, and shell layers.
 */
import {
  browsableListSurface,
  createBrowsableListState,
  createKeyMap,
  hstackSurface,
  placeSurface,
  vstack,
  vstackSurface
} from "@flyingrobots/bijou-tui";
import type {
  BrowsableListItem,
  BrowsableListState,
  Cmd,
  FramePage
} from "@flyingrobots/bijou-tui";
import {
  boxSurface,
  stringToSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";
import type { NeighborhoodCoreSummary } from "../../app/NeighborhoodCoreSummary.ts";
import type { NeighborhoodSiteCatalog } from "../../app/NeighborhoodSiteCatalog.ts";
import { NeighborhoodFocusSummary } from "../../app/NeighborhoodFocusSummary.ts";
import type { ReintegrationDetailSummary } from "../../app/ReintegrationDetailSummary.ts";
import type { ReceiptShellSummary } from "../../app/ReceiptShellSummary.ts";

interface InspectorModel {
  time: number;
  sessionCtx: SessionContext | null;
  selectedSiteId: string | null;
  focus: NeighborhoodFocusSummary | null;
}

type InspectorMsg =
  | { type: "pulse"; dt: number }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "site-up" }
  | { type: "site-down" }
  | { type: "disconnect" };

type InspectorUpdateResult = [InspectorModel, InspectorCmd[]];
type InspectorCmd = Cmd<InspectorMsg>;

interface InspectorRenderArgs {
  model: InspectorModel;
  size: { w: number; h: number };
  ctx: BijouContext;
}

interface InspectorSurfaceBuildArgs {
  sessionCtx: SessionContext;
  focus: NeighborhoodFocusSummary;
  selectedSiteId: string | null;
  width: number;
  ctx: BijouContext;
}

interface BoxFromLinesArgs {
  lines: string;
  title: string;
  width: number;
  ctx: BijouContext;
}

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

export function buildNeighborhoodFocusLines(
  focus: NeighborhoodFocusSummary
): string {
  const lines = [
    ` Site: ${focus.siteId}`,
    ` Kind: ${focus.kind}`,
    ` Outcome: ${focus.outcome}`,
    ` Label: ${focus.label}`,
    ` Summary: ${focus.summary}`,
    ` Coordinate: ${focus.coordinate.laneId}@${focus.coordinate.tick.toString()}`,
    ` Selected Lane: ${focus.selectedLaneId}`,
    ` Selected Worldline: ${focus.selectedWorldlineId}`,
    ` Primary Lane: ${focus.primaryLaneId}`,
    ` Primary Worldline: ${focus.primaryWorldlineId}`,
    ` Participating Lanes: ${focus.participatingLaneIds.length.toString()}`
  ];

  if (focus.parentSiteId !== undefined) {
    lines.splice(1, 0, ` Parent Site: ${focus.parentSiteId}`);
  }

  for (const laneId of focus.participatingLaneIds) {
    lines.push(` Lane: ${laneId}`);
  }

  return lines.join("\n");
}

export function buildNeighborhoodSiteItems(
  catalog: NeighborhoodSiteCatalog
): BrowsableListItem[] {
  return catalog.sites.map((site) => ({
    label: site.label,
    value: site.siteId,
    description: site.outcome
  }));
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

function initialInspectorModel(): InspectorModel {
  return {
    time: 0,
    sessionCtx: null,
    selectedSiteId: null,
    focus: null
  };
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
    ` Session:      ${session.sessionId.slice(0, 8)}`
  );
}

function siteListHeight(siteCount: number): number {
  return Math.max(1, Math.min(8, siteCount));
}

function buildSiteListState(
  catalog: NeighborhoodSiteCatalog,
  selectedSiteId: string | null
): BrowsableListState {
  const items = buildNeighborhoodSiteItems(catalog);
  const height = siteListHeight(items.length);
  const base = createBrowsableListState({ items, height });
  const activeSiteId = catalog.normalizeSelection(selectedSiteId);
  const focusIndex = Math.max(0, items.findIndex((item) => item.value === activeSiteId));
  const maxScroll = Math.max(0, items.length - height);

  return {
    ...base,
    focusIndex,
    scrollY: Math.max(0, Math.min(focusIndex, maxScroll))
  };
}

function boxFromLines(args: BoxFromLinesArgs): Surface {
  const content = stringToSurface(args.lines, args.width - 2, args.lines.split("\n").length);
  return boxSurface(content, { title: args.title, width: args.width, ctx: args.ctx });
}

function buildSiteRailSurface(args: InspectorSurfaceBuildArgs): Surface {
  const state = buildSiteListState(args.sessionCtx.session.snapshot.neighborhoodSites, args.selectedSiteId);
  const list = browsableListSurface(state, { width: args.width - 2, ctx: args.ctx });
  return boxSurface(list, { title: " Sites ", width: args.width, ctx: args.ctx });
}

function buildFocusSurface(args: InspectorSurfaceBuildArgs): Surface {
  return boxFromLines({
    lines: buildNeighborhoodFocusLines(args.focus),
    title: " Neighborhood Focus ",
    width: args.width,
    ctx: args.ctx
  });
}

function buildContextSurface(
  sessionCtx: SessionContext,
  width: number,
  ctx: BijouContext
): Surface {
  return boxFromLines({
    lines: contextInfoLines(sessionCtx),
    title: " Context ",
    width,
    ctx
  });
}

function buildTopRowSurface(args: InspectorSurfaceBuildArgs): Surface {
  if (args.width < 72) {
    return vstackSurface(buildSiteRailSurface(args), buildFocusSurface(args));
  }

  const railWidth = Math.max(24, Math.min(32, Math.floor(args.width * 0.32)));

  return hstackSurface(
    1,
    buildSiteRailSurface({ ...args, width: railWidth }),
    buildFocusSurface({ ...args, width: args.width - railWidth - 1 })
  );
}

function buildReintegrationSurface(
  sessionCtx: SessionContext,
  width: number,
  ctx: BijouContext
): Surface | null {
  if (!hasReintegrationContent(sessionCtx.session.snapshot.reintegrationDetail)) {
    return null;
  }

  return boxFromLines({
    lines: buildReintegrationLines(sessionCtx.session.snapshot.reintegrationDetail),
    title: " Reintegration Detail ",
    width,
    ctx
  });
}

function buildReceiptShellSurface(
  sessionCtx: SessionContext,
  width: number,
  ctx: BijouContext
): Surface | null {
  if (sessionCtx.session.snapshot.receiptShell.receiptIds.length === 0) {
    return null;
  }

  return boxFromLines({
    lines: buildReceiptShellLines(sessionCtx.session.snapshot.receiptShell),
    title: " Receipt Shell ",
    width,
    ctx
  });
}

function buildDetailSurfaces(
  sessionCtx: SessionContext,
  width: number,
  ctx: BijouContext
): Surface[] {
  const surfaces = [buildContextSurface(sessionCtx, width, ctx)];
  const reintegrationSurface = buildReintegrationSurface(sessionCtx, width, ctx);
  const receiptShellSurface = buildReceiptShellSurface(sessionCtx, width, ctx);

  if (reintegrationSurface !== null) {
    surfaces.push(reintegrationSurface);
  }

  if (receiptShellSurface !== null) {
    surfaces.push(receiptShellSurface);
  }

  return surfaces;
}

function buildNeighborhoodSurface(args: InspectorRenderArgs): Surface {
  const sessionCtx = args.model.sessionCtx;
  const focus = args.model.focus;

  if (sessionCtx === null || focus === null) {
    throw new TypeError("buildNeighborhoodSurface requires a session context");
  }

  const content = vstackSurface(
    buildTopRowSurface({
      sessionCtx,
      focus,
      selectedSiteId: args.model.selectedSiteId,
      width: args.size.w,
      ctx: args.ctx
    }),
    ...buildDetailSurfaces(sessionCtx, args.size.w, args.ctx)
  );

  return placeSurface(content, {
    width: args.size.w,
    height: args.size.h,
    hAlign: "left",
    vAlign: "top"
  });
}

function renderInspector(args: InspectorRenderArgs): Surface {
  if (args.model.sessionCtx === null) {
    return disconnectedInspectorSurface(args);
  }

  return buildNeighborhoodSurface(args);
}

function moveSelectedSite(model: InspectorModel, delta: number): InspectorUpdateResult {
  if (model.sessionCtx === null) {
    return [model, []];
  }

  return [{
    ...model,
    selectedSiteId: model.sessionCtx.session.snapshot.neighborhoodSites.moveSelection(
      model.selectedSiteId,
      delta
    )
  }, []];
}

function handleSessionReady(
  model: InspectorModel,
  ctx: SessionContext
): InspectorUpdateResult {
    return [{
      ...model,
      sessionCtx: ctx,
      selectedSiteId: ctx.session.snapshot.neighborhoodSites.normalizeSelection(
        model.selectedSiteId
      ),
      focus: null
    }, []];
}

function navigationUpdate(msg: InspectorMsg, model: InspectorModel): InspectorUpdateResult | null {
  if (msg.type === "site-up") {
    return moveSelectedSite(model, -1);
  }

  if (msg.type === "site-down") {
    return moveSelectedSite(model, 1);
  }

  return null;
}

function simpleUpdate(msg: InspectorMsg, model: InspectorModel): InspectorUpdateResult | null {
  if (msg.type === "pulse") {
    return [{ ...model, time: model.time + msg.dt }, []];
  }

  if (msg.type === "session-ready") {
    return handleSessionReady(model, msg.ctx);
  }

  if (msg.type === "disconnect") {
    return [{ ...initialInspectorModel(), time: model.time }, []];
  }

  return null;
}

function updateInspectorModel(
  msg: InspectorMsg,
  model: InspectorModel
): InspectorUpdateResult {
  const simple = simpleUpdate(msg, model);

  if (simple !== null) {
    return simple;
  }

  return navigationUpdate(msg, model) ?? [model, []];
}

export function inspectorPage(ctx: BijouContext): FramePage<InspectorModel, InspectorMsg> {
  return {
    id: "inspect",
    title: "Neighborhood",
    init: () => [initialInspectorModel(), []],
    keyMap: createKeyMap<InspectorMsg>()
      .bind("up", "Previous site", { type: "site-up" })
      .bind("k", "Previous site", { type: "site-up" })
      .bind("down", "Next site", { type: "site-down" })
      .bind("j", "Next site", { type: "site-down" }),
    update: (msg, model): InspectorUpdateResult => {
      if (!isPageMsg<InspectorMsg>(msg)) {
        return [model, []];
      }

      return updateInspectorModel(msg, model);
    },
    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderInspector({ model, size: { w, h }, ctx }),
    }),
  };
}

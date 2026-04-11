/**
 * Cross-page session synchronization.
 *
 * The connect page owns the session lifecycle. When session state
 * changes, the shell propagates it to all other pages. The worldline
 * cursor is kept in sync with the session's current frame index.
 */
import type { FrameModel, Cmd, FramedAppMsg } from "@flyingrobots/bijou-tui";
import type { SessionContext } from "./pages/shared.ts";
import { buildTickRows, filterFramesToLane } from "./worldlineLayout.ts";
import { laneCursorForLaneId } from "./pages/worldlinePage.ts";
import type { FrameData } from "./worldlineLayout.ts";
import type { LaneRef } from "../protocol.ts";
import { NeighborhoodFocusSummary } from "../app/NeighborhoodFocusSummary.ts";
import type { NeighborhoodSiteCatalog } from "../app/NeighborhoodSiteCatalog.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page messages are heterogeneous by design
type AnyMsg = any;
type FModel = FrameModel<AnyMsg>;
type FMsg = FramedAppMsg<AnyMsg>;

interface ConnectPageModel {
  sessionCtx: SessionContext | null;
  connecting: boolean;
}

interface NavigatorPageModel {
  sessionCtx: SessionContext | null;
  jumpInput: string | null;
}

interface InspectorPageModel {
  sessionCtx: SessionContext | null;
  selectedSiteId: string | null;
  focus: NeighborhoodFocusSummary | null;
}

interface WorldlinePageModel {
  sessionCtx: SessionContext | null;
  frames: FrameData[];
  cursor: number;
  selectedLaneId: string | null;
  laneCursor: number;
  focus: NeighborhoodFocusSummary | null;
}

export function getSessionCtx(model: FModel): SessionContext | null {
  const connect = getConnectModel(model);
  return connect?.sessionCtx ?? null;
}

export function getSelectedSiteId(model: FModel): string | null {
  const inspector = getInspectorModel(model);
  return inspector?.selectedSiteId ?? null;
}

function getRawPageModel(model: FModel, pageId: string): object | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Bijou stores heterogeneous page models behind one frame boundary
  const value = model.pageModels[pageId];
  if (typeof value !== "object" || value === null) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- validated object boundary for page model parsing
  return value;
}

function isConnectModel(value: object): value is ConnectPageModel {
  return "sessionCtx" in value && "connecting" in value;
}

function isNavigatorModel(value: object): value is NavigatorPageModel {
  return "sessionCtx" in value && "jumpInput" in value;
}

function isInspectorModel(value: object): value is InspectorPageModel {
  return "sessionCtx" in value && "selectedSiteId" in value;
}

function hasWorldlineFrames(value: object): value is { frames: FrameData[] } {
  return "frames" in value && Array.isArray(value.frames);
}

function hasWorldlineCursor(value: object): value is { cursor: number } {
  return "cursor" in value && typeof value.cursor === "number";
}

function hasWorldlineSelection(value: object): value is { selectedLaneId: string | null; laneCursor: number } {
  return "selectedLaneId" in value &&
    "laneCursor" in value &&
    typeof value.laneCursor === "number";
}

function isWorldlineModel(value: object): value is WorldlinePageModel {
  return hasWorldlineFrames(value) && hasWorldlineCursor(value) && hasWorldlineSelection(value);
}

function getConnectModel(model: FModel): ConnectPageModel | null {
  const value = getRawPageModel(model, "connect");
  return value !== null && isConnectModel(value) ? value : null;
}

function getNavigatorModel(model: FModel): NavigatorPageModel | null {
  const value = getRawPageModel(model, "nav");
  return value !== null && isNavigatorModel(value) ? value : null;
}

function getInspectorModel(model: FModel): InspectorPageModel | null {
  const value = getRawPageModel(model, "inspect");
  return value !== null && isInspectorModel(value) ? value : null;
}

function getWorldlineModel(model: FModel): WorldlinePageModel | null {
  const value = getRawPageModel(model, "worldline");
  return value !== null && isWorldlineModel(value) ? value : null;
}

function withUpdatedPageModel(model: FModel, pageId: string, pageModel: object): FModel {
  return {
    ...model,
    pageModels: {
      ...model.pageModels,
      [pageId]: pageModel
    }
  };
}

function propagateSessionContext(model: FModel, sessionCtx: SessionContext | null): FModel {
  const navigator = getNavigatorModel(model);
  const worldline = getWorldlineModel(model);
  const inspector = getInspectorModel(model);

  if (navigator === null || worldline === null || inspector === null) {
    return model;
  }

  return {
    ...model,
    pageModels: {
      ...model.pageModels,
      nav: { ...navigator, sessionCtx },
      worldline: { ...worldline, sessionCtx },
      inspect: { ...inspector, sessionCtx }
    }
  };
}

function resetWorldlineSession(worldline: WorldlinePageModel): WorldlinePageModel {
  return {
    ...worldline,
    frames: [],
    cursor: 0,
    selectedLaneId: null,
    laneCursor: 0
  };
}

export function syncSession(
  model: FModel,
  sessionCtx: SessionContext | null,
): [FModel, Cmd<FMsg>[]] {
  const withSession = propagateSessionContext(model, sessionCtx);
  if (sessionCtx !== null) {
    const worldline = getWorldlineModel(withSession);
    if (worldline === null) {
      return [withSession, []];
    }
    const loadCmd = makeWorldlineLoadCmd(sessionCtx);
    return [withUpdatedPageModel(withSession, "worldline", resetWorldlineSession(worldline)), [loadCmd as Cmd<FMsg>]];
  }
  return [withSession, []];
}

function makeWorldlineLoadCmd(
  sessionCtx: SessionContext,
): (emit: (msg: FMsg) => void) => Promise<void> {
  return async (emit): Promise<void> => {
    try {
      const adapter = sessionCtx.session.adapter;
      const headId = sessionCtx.session.snapshot.head.headId;
      const maxFrame = await adapter.seekToFrame(headId, Number.MAX_SAFE_INTEGER);
      const frames: FrameData[] = [];
      for (let i = 0; i <= maxFrame.frameIndex; i++) {
        const f = await adapter.frame(headId, i);
        const r = await adapter.receipts(headId, i);
        frames.push({ frameIndex: f.frameIndex, lanes: f.lanes, receipts: r });
      }
      emit({ type: "worldline-loaded", frames, sessionId: sessionCtx.session.sessionId } as FMsg);
    } catch {
      // Silently ignore — worldline view will show empty state
    }
  };
}

function cursorForFrame(
  frames: FrameData[],
  catalog: readonly import("../protocol.ts").LaneRef[],
  frameIndex: number,
): number {
  const rows = buildTickRows(frames, catalog);
  const idx = rows.findIndex((r) => r.frameIndex === frameIndex);
  return idx >= 0 ? idx : 0;
}

function selectedFrames(
  frames: FrameData[],
  selectedLaneId: string | null
): FrameData[] {
  if (selectedLaneId === null) {
    return frames;
  }

  return filterFramesToLane(frames, selectedLaneId);
}

interface WorldlineCursorArgs {
  readonly catalog: readonly LaneRef[];
  readonly frames: FrameData[];
  readonly selectedLaneId: string | null;
  readonly frameIndex: number;
}

function worldlineCursorForFrame(args: WorldlineCursorArgs): number {
  return cursorForFrame(selectedFrames(args.frames, args.selectedLaneId), args.catalog, args.frameIndex);
}

export interface SiteDrivenWorldlineFocus {
  readonly selectedLaneId: string | null;
  readonly laneCursor: number;
  readonly cursor: number;
}

interface SiteDrivenWorldlineFocusArgs {
  readonly catalog: readonly LaneRef[];
  readonly displayCatalog: readonly LaneRef[];
  readonly neighborhoodSites: NeighborhoodSiteCatalog;
  readonly selectedSiteId: string | null;
  readonly frames: FrameData[];
  readonly currentFrameIndex: number;
}

export function siteDrivenWorldlineFocus(args: SiteDrivenWorldlineFocusArgs): SiteDrivenWorldlineFocus {
  const selectedLaneId = args.neighborhoodSites.selectedLaneId(args.selectedSiteId);
  return {
    selectedLaneId,
    laneCursor: laneCursorForLaneId(args.displayCatalog, selectedLaneId ?? undefined),
    cursor: worldlineCursorForFrame({
      catalog: args.catalog,
      frames: args.frames,
      selectedLaneId,
      frameIndex: args.currentFrameIndex
    })
  };
}

export function handleWorldlineLoaded(model: FModel, frames: FrameData[], sessionId: string | undefined): FModel {
  const loaded = loadedWorldlineState(model, sessionId);
  if (loaded === null) {
    return model;
  }
  return applyLoadedWorldline(model, loaded, frames);
}

function sessionChanged(sessionCtx: SessionContext | null, sessionId: string | undefined): boolean {
  return sessionId !== undefined && sessionCtx?.session.sessionId !== sessionId;
}

interface LoadedWorldlineState {
  readonly sessionCtx: SessionContext | null;
  readonly worldline: WorldlinePageModel;
}

function loadedWorldlineState(
  model: FModel,
  sessionId: string | undefined
): LoadedWorldlineState | null {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  if (sessionChanged(sessionCtx, sessionId) || worldline === null) {
    return null;
  }
  return { sessionCtx, worldline };
}

function applyLoadedWorldline(
  model: FModel,
  loaded: LoadedWorldlineState,
  frames: FrameData[]
): FModel {
  const cursor = worldlineCursorForFrame({
    catalog: loaded.sessionCtx?.catalog.lanes ?? [],
    frames,
    selectedLaneId: loaded.worldline.selectedLaneId,
    frameIndex: loaded.sessionCtx?.session.snapshot.head.currentFrameIndex ?? 0
  });
  return withUpdatedPageModel(model, "worldline", {
    ...loaded.worldline,
    frames,
    cursor
  });
}

export function syncWorldlineCursor(model: FModel): FModel {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  if (sessionCtx === null || worldline === null) {
    return model;
  }
  const cursor = worldlineCursorForFrame({
    catalog: sessionCtx.catalog.lanes,
    frames: worldline.frames,
    selectedLaneId: worldline.selectedLaneId,
    frameIndex: sessionCtx.session.snapshot.head.currentFrameIndex
  });
  if (worldline.cursor === cursor) {
    return model;
  }
  return withUpdatedPageModel(model, "worldline", { ...worldline, cursor });
}

function selectedLaneIdForModel(model: FModel, sessionCtx: SessionContext): string | null {
  const selectedSiteId = getSelectedSiteId(model);
  return sessionCtx.session.snapshot.neighborhoodSites.selectedLaneId(selectedSiteId);
}

function selectedSiteIdForFocus(model: FModel, sessionCtx: SessionContext): string {
  return sessionCtx.session.snapshot.neighborhoodSites.normalizeSelection(getSelectedSiteId(model));
}

interface NeighborhoodFocusState {
  readonly inspector: InspectorPageModel;
  readonly worldline: WorldlinePageModel;
  readonly selectedSiteId: string;
  readonly focus: NeighborhoodFocusSummary;
}

function computeWorldlineSelection(model: FModel, sessionCtx: SessionContext): {
  selectedLaneId: string | null;
  laneCursor: number;
} {
  const selectedLaneId = selectedLaneIdForModel(model, sessionCtx);
  const scopedCatalog = sessionCtx.session.snapshot.neighborhoodCore.buildDisplayCatalog(
    sessionCtx.catalog.lanes
  );
  return {
    selectedLaneId,
    laneCursor: laneCursorForLaneId(scopedCatalog, selectedLaneId ?? undefined)
  };
}

export function syncNeighborhoodSelection(model: FModel): FModel {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  const inspector = getInspectorModel(model);
  if (sessionCtx === null || worldline === null || inspector === null) {
    return model;
  }

  const selectedSiteId = sessionCtx.session.snapshot.neighborhoodSites.siteIdForLaneId(
    worldline.selectedLaneId,
    inspector.selectedSiteId
  );

  if (inspector.selectedSiteId === selectedSiteId) {
    return model;
  }

  return withUpdatedPageModel(model, "inspect", { ...inspector, selectedSiteId });
}

export function syncNeighborhoodFocus(model: FModel): FModel {
  const state = neighborhoodFocusState(model);
  if (state === null) {
    return model;
  }

  if (sameNeighborhoodFocusState(state)) {
    return model;
  }

  return {
    ...model,
    pageModels: {
      ...model.pageModels,
      inspect: {
        ...state.inspector,
        selectedSiteId: state.selectedSiteId,
        focus: state.focus
      },
      worldline: {
        ...state.worldline,
        focus: state.focus
      }
    }
  };
}

function neighborhoodFocusState(model: FModel): NeighborhoodFocusState | null {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  const inspector = getInspectorModel(model);
  if (sessionCtx === null || worldline === null || inspector === null) {
    return null;
  }

  const selectedSiteId = selectedSiteIdForFocus(model, sessionCtx);
  return {
    inspector,
    worldline,
    selectedSiteId,
    focus: NeighborhoodFocusSummary.fromSelection(
      sessionCtx.session.snapshot.neighborhoodCore,
      sessionCtx.session.snapshot.neighborhoodSites,
      selectedSiteId
    )
  };
}

function sameNeighborhoodFocusState(state: NeighborhoodFocusState): boolean {
  return sameNeighborhoodFocus(state.inspector.focus, state.focus) &&
    sameNeighborhoodFocus(state.worldline.focus, state.focus) &&
    state.inspector.selectedSiteId === state.selectedSiteId;
}

export function syncSiteDrivenWorldlineFocus(model: FModel): FModel {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  if (sessionCtx === null || worldline === null) {
    return model;
  }
  const focus = siteDrivenWorldlineFocusForModel(model, sessionCtx, worldline);
  if (sameWorldlineFocus(worldline, focus)) {
    return model;
  }
  return withUpdatedPageModel(model, "worldline", {
    ...worldline,
    selectedLaneId: focus.selectedLaneId,
    laneCursor: focus.laneCursor,
    cursor: focus.cursor
  });
}

function siteDrivenWorldlineFocusForModel(
  model: FModel,
  sessionCtx: SessionContext,
  worldline: WorldlinePageModel
): SiteDrivenWorldlineFocus {
  return siteDrivenWorldlineFocus({
    catalog: sessionCtx.catalog.lanes,
    displayCatalog: sessionCtx.session.snapshot.neighborhoodCore.buildDisplayCatalog(
      sessionCtx.catalog.lanes
    ),
    neighborhoodSites: sessionCtx.session.snapshot.neighborhoodSites,
    selectedSiteId: getSelectedSiteId(model),
    frames: worldline.frames,
    currentFrameIndex: sessionCtx.session.snapshot.head.currentFrameIndex
  });
}

function sameWorldlineFocus(
  worldline: WorldlinePageModel,
  focus: SiteDrivenWorldlineFocus
): boolean {
  return worldline.selectedLaneId === focus.selectedLaneId &&
    worldline.laneCursor === focus.laneCursor &&
    worldline.cursor === focus.cursor;
}

function sameNeighborhoodFocus(
  left: NeighborhoodFocusSummary | null,
  right: NeighborhoodFocusSummary
): boolean {
  if (left === null) {
    return false;
  }

  return JSON.stringify(left.toJSON()) === JSON.stringify(right.toJSON());
}

export function syncWorldlineSelection(model: FModel): FModel {
  const sessionCtx = getSessionCtx(model);
  const worldline = getWorldlineModel(model);
  if (sessionCtx === null || worldline === null) {
    return model;
  }
  const { selectedLaneId, laneCursor } = computeWorldlineSelection(model, sessionCtx);
  if (worldline.selectedLaneId === selectedLaneId && worldline.laneCursor === laneCursor) {
    return model;
  }
  return withUpdatedPageModel(model, "worldline", { ...worldline, selectedLaneId, laneCursor });
}

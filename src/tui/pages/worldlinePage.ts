/**
 * Worldline page — scrollable tick history with lane graph.
 */
import {
  createKeyMap,
} from "@flyingrobots/bijou-tui";
import {
  stringToSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { renderWorldline, buildTickRows } from "../worldlineLayout.ts";
import { buildLaneTreeLines, filterFramesToLane, type FrameData } from "../worldlineLayout.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";
import type { LaneRef } from "../../protocol.ts";
import type { NeighborhoodCoreSummary } from "../../app/NeighborhoodCoreSummary.ts";
import type { NeighborhoodFocusSummary } from "../../app/NeighborhoodFocusSummary.ts";
import type { Cmd } from "@flyingrobots/bijou-tui";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface WorldlineModel {
  time: number;
  sessionCtx: SessionContext | null;
  frames: FrameData[];
  cursor: number;
  selectedLaneId: string | null;
  laneCursor: number;
  focus: NeighborhoodFocusSummary | null;
}

type WorldlineUpdateResult = [WorldlineModel, WorldlineCmd[]];
type WorldlineCmd = Cmd<WorldlineMsg>;

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type WorldlineMsg =
  | { type: "pulse"; dt: number }
  | { type: "cursor-up" }
  | { type: "cursor-down" }
  | { type: "lane-left" }
  | { type: "lane-right" }
  | { type: "select-tick" }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" }
  | { type: "worldline-loaded"; frames: FrameData[]; sessionId: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialWorldlineModel(): WorldlineModel {
  return {
    time: 0,
    sessionCtx: null,
    frames: [],
    cursor: 0,
    selectedLaneId: null,
    laneCursor: 0,
    focus: null,
  };
}

interface WorldlineRenderArgs {
  model: WorldlineModel;
  size: { w: number; h: number };
  ctx: BijouContext;
}

function disconnectedWorldlineSurface(args: WorldlineRenderArgs): Surface {
  const { model, size, ctx } = args;
  const bg = renderWaveShader(size.w, size.h, model.time);
  return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Worldline", ctx);
}

function worldlineCatalog(model: WorldlineModel): LaneRef[] {
  if (model.sessionCtx === null) {
    return [];
  }

  return scopeCatalogToNeighborhood(
    model.sessionCtx.catalog.lanes,
    model.sessionCtx.session.snapshot.neighborhoodCore
  );
}

function renderConnectedWorldline(args: WorldlineRenderArgs): Surface {
  const { model, size, ctx } = args;
  const selectedLaneId = model.focus?.selectedLaneId ?? model.selectedLaneId;
  const input = {
    frames: model.frames,
    catalog: worldlineCatalog(model),
    cursor: model.cursor,
    w: size.w,
    h: size.h,
    ctx,
    laneCursor: model.laneCursor,
  };
  if (selectedLaneId === null) {
    return renderWorldline(input);
  }
  return renderWorldline({ ...input, selectedLaneId });
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function renderWorldlinePage(args: WorldlineRenderArgs): Surface {
  const { model } = args;
  if (model.sessionCtx === null) {
    return disconnectedWorldlineSurface(args);
  }

  return renderConnectedWorldline(args);
}

export function scopeCatalogToNeighborhood(
  catalog: readonly LaneRef[],
  neighborhoodCore: NeighborhoodCoreSummary
): LaneRef[] {
  return neighborhoodCore.buildDisplayCatalog(catalog);
}

export function laneCursorForLaneId(
  catalog: readonly LaneRef[],
  selectedLaneId: string | undefined
): number {
  if (selectedLaneId === undefined) {
    return 0;
  }

  const lines = buildLaneTreeLines(catalog);
  const index = lines.findIndex((line) => line.laneId === selectedLaneId);
  return index >= 0 ? index : 0;
}

export function selectedLaneIdForLaneCursor(
  catalog: readonly LaneRef[],
  laneCursor: number
): string | null {
  const lines = buildLaneTreeLines(catalog);
  const safeCursor = Math.max(0, Math.min(laneCursor, lines.length - 1));
  const line = lines[safeCursor];
  return line?.laneId ?? null;
}

function selectedFrames(model: WorldlineModel): FrameData[] {
  const selectedLaneId = model.focus?.selectedLaneId ?? model.selectedLaneId;

  if (selectedLaneId === null) {
    return model.frames;
  }

  return filterFramesToLane(model.frames, selectedLaneId);
}

function tickCursorForFrames(frames: readonly FrameData[], cursor: number): number {
  const max = Math.max(frames.length - 1, 0);
  return Math.max(0, Math.min(cursor, max));
}

function moveWorldlineCursor(model: WorldlineModel, delta: number): WorldlineUpdateResult {
  const frames = selectedFrames(model);
  const max = Math.max(frames.length - 1, 0);
  const nextCursor = Math.max(0, Math.min(model.cursor + delta, max));
  return [{ ...model, cursor: nextCursor }, []];
}

function moveLaneSelection(model: WorldlineModel, delta: number): WorldlineUpdateResult {
  const catalog = worldlineCatalog(model);
  if (catalog.length === 0) {
    return [model, []];
  }

  const treeLines = buildLaneTreeLines(catalog);
  const maxCursor = Math.max(treeLines.length - 1, 0);
  const nextLaneCursor = Math.max(0, Math.min(model.laneCursor + delta, maxCursor));
  const nextLaneId = selectedLaneIdForLaneCursor(catalog, nextLaneCursor);
  const nextFrames = nextLaneId === null ? model.frames : filterFramesToLane(model.frames, nextLaneId);
  const nextCursor = tickCursorForFrames(nextFrames, model.cursor);

  return [{
    ...model,
    selectedLaneId: nextLaneId,
    laneCursor: nextLaneCursor,
    cursor: nextCursor
  }, []];
}

function handleSessionReady(model: WorldlineModel, ctx: SessionContext): WorldlineUpdateResult {
  // Shell-level syncSession issues the worldline load command,
  // so the page only resets state and waits for worldline-loaded.
  return [{
    ...model,
    sessionCtx: ctx,
    frames: [],
    cursor: 0,
    selectedLaneId: null,
    laneCursor: 0,
    focus: null
  }, []];
}

function handleDisconnect(model: WorldlineModel): WorldlineUpdateResult {
  return [{ ...initialWorldlineModel(), time: model.time }, []];
}

function buildSeekCommand(model: WorldlineModel): WorldlineCmd[] {
  if (model.sessionCtx === null) {
    return [];
  }

  const rows = buildTickRows(selectedFrames(model), model.sessionCtx.catalog.lanes);
  const selected = rows[model.cursor];

  if (selected === undefined) {
    return [];
  }

  const session = model.sessionCtx.session;
  return [async (): Promise<void> => {
    try {
      await session.seekToFrame(selected.frameIndex);
    } catch {
      // Silently ignore seek errors from worldline
    }
  }];
}

function simpleWorldlineUpdate(
  msg: WorldlineMsg,
  model: WorldlineModel
): WorldlineUpdateResult | null {
  if (msg.type === "pulse") {
    return [{ ...model, time: model.time + msg.dt }, []];
  }

  if (msg.type === "session-ready") {
    return handleSessionReady(model, msg.ctx);
  }

  if (msg.type === "disconnect") {
    return handleDisconnect(model);
  }

  return null;
}

function navigationWorldlineUpdate(
  msg: WorldlineMsg,
  model: WorldlineModel
): WorldlineUpdateResult {
  if (msg.type === "lane-left") {
    return moveLaneSelection(model, -1);
  }

  if (msg.type === "lane-right") {
    return moveLaneSelection(model, 1);
  }

  if (msg.type === "cursor-up") {
    return moveWorldlineCursor(model, -1);
  }

  if (msg.type === "cursor-down") {
    return moveWorldlineCursor(model, 1);
  }

  return [model, buildSeekCommand(model)];
}

function updateWorldlineModel(
  msg: WorldlineMsg,
  model: WorldlineModel
): WorldlineUpdateResult {
  const simpleUpdate = simpleWorldlineUpdate(msg, model);

  if (simpleUpdate !== null) {
    return simpleUpdate;
  }

  return navigationWorldlineUpdate(msg, model);
}

function worldlineKeyMap(): ReturnType<typeof createKeyMap<WorldlineMsg>> {
  return createKeyMap<WorldlineMsg>()
    .bind("up", "Scroll up", { type: "cursor-up" })
    .bind("k", "Scroll up", { type: "cursor-up" })
    .bind("down", "Scroll down", { type: "cursor-down" })
    .bind("j", "Scroll down", { type: "cursor-down" })
    .bind("left", "Previous lane", { type: "lane-left" })
    .bind("h", "Previous lane", { type: "lane-left" })
    .bind("right", "Next lane", { type: "lane-right" })
    .bind("l", "Next lane", { type: "lane-right" })
    .bind("enter", "Jump to tick", { type: "select-tick" });
}

function buildWorldlinePageDefinition(
  ctx: BijouContext
): FramePage<WorldlineModel, WorldlineMsg> {
  return {
    id: "worldline",
    title: "Worldline",
    init: () => [initialWorldlineModel(), []],
    keyMap: worldlineKeyMap(),
    update: (msg, model): WorldlineUpdateResult => {
      if (!isPageMsg<WorldlineMsg>(msg)) {
        return [model, []];
      }

      return updateWorldlineModel(msg, model);
    },
    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderWorldlinePage({ model, size: { w, h }, ctx }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function worldlinePage(ctx: BijouContext): FramePage<WorldlineModel, WorldlineMsg> {
  return buildWorldlinePageDefinition(ctx);
}

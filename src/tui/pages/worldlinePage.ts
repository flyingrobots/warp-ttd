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
import { buildLaneTreeLines, type FrameData } from "../worldlineLayout.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";
import type { LaneRef } from "../../protocol.ts";
import type { NeighborhoodCoreSummary } from "../../app/NeighborhoodCoreSummary.ts";
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
  | { type: "select-tick" }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" }
  | { type: "worldline-loaded"; frames: FrameData[]; sessionId: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorldlineLoadCmd(
  ctx: SessionContext,
): (emit: (msg: WorldlineMsg) => void) => Promise<void> {
  return async (emit): Promise<void> => {
    try {
      const adapter = ctx.session.adapter;
      const headId = ctx.session.snapshot.head.headId;
      const maxFrame = await adapter.seekToFrame(headId, Number.MAX_SAFE_INTEGER);
      const maxIndex = maxFrame.frameIndex;
      const frames: FrameData[] = [];
      for (let i = 0; i <= maxIndex; i++) {
        const f = await adapter.frame(headId, i);
        const r = await adapter.receipts(headId, i);
        frames.push({ frameIndex: f.frameIndex, lanes: f.lanes, receipts: r });
      }
      emit({ type: "worldline-loaded", frames, sessionId: ctx.session.sessionId });
    } catch {
      // Silently ignore — worldline view will show empty state
    }
  };
}

function initialWorldlineModel(): WorldlineModel {
  return {
    time: 0,
    sessionCtx: null,
    frames: [],
    cursor: 0,
    selectedLaneId: null,
    laneCursor: 0,
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
  const input = {
    frames: model.frames,
    catalog: worldlineCatalog(model),
    cursor: model.cursor,
    w: size.w,
    h: size.h,
    ctx,
    laneCursor: model.laneCursor,
  };
  if (model.selectedLaneId === null) {
    return renderWorldline(input);
  }
  return renderWorldline({ ...input, selectedLaneId: model.selectedLaneId });
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

function moveWorldlineCursor(model: WorldlineModel, delta: number): WorldlineUpdateResult {
  const max = Math.max(model.frames.length - 1, 0);
  const nextCursor = Math.max(0, Math.min(model.cursor + delta, max));
  return [{ ...model, cursor: nextCursor }, []];
}

function handleSessionReady(model: WorldlineModel, ctx: SessionContext): WorldlineUpdateResult {
  return [{
    ...model,
    sessionCtx: ctx,
    frames: [],
    cursor: 0,
    selectedLaneId: null,
    laneCursor: 0
  }, [makeWorldlineLoadCmd(ctx)]];
}

function handleDisconnect(model: WorldlineModel): WorldlineUpdateResult {
  return [{ ...initialWorldlineModel(), time: model.time }, []];
}

function handleWorldlineLoaded(model: WorldlineModel, msg: Extract<WorldlineMsg, { type: "worldline-loaded" }>): WorldlineUpdateResult {
  if (model.sessionCtx?.session.sessionId !== msg.sessionId) {
    return [model, []];
  }

  return [{ ...model, frames: msg.frames, cursor: 0 }, []];
}

function buildSeekCommand(model: WorldlineModel): WorldlineCmd[] {
  if (model.sessionCtx === null) {
    return [];
  }

  const rows = buildTickRows(model.frames, model.sessionCtx.catalog.lanes);
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

  if (msg.type === "worldline-loaded") {
    return handleWorldlineLoaded(model, msg);
  }

  return null;
}

function navigationWorldlineUpdate(
  msg: WorldlineMsg,
  model: WorldlineModel
): WorldlineUpdateResult {
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

function buildWorldlinePageDefinition(
  ctx: BijouContext
): FramePage<WorldlineModel, WorldlineMsg> {
  return {
    id: "worldline",
    title: "Worldline",
    init: () => [initialWorldlineModel(), []],
    keyMap: createKeyMap<WorldlineMsg>()
      .bind("up", "Scroll up", { type: "cursor-up" })
      .bind("k", "Scroll up", { type: "cursor-up" })
      .bind("down", "Scroll down", { type: "cursor-down" })
      .bind("j", "Scroll down", { type: "cursor-down" })
      .bind("enter", "Jump to tick", { type: "select-tick" }),
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

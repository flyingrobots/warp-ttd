/**
 * Worldline page — scrollable tick history with lane graph.
 */
import {
  createKeyMap,
} from "@flyingrobots/bijou-tui";
import {
  stringToSurface,
  boxSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { renderWorldline, buildTickRows } from "../worldlineLayout.ts";
import type { FrameData } from "../worldlineLayout.ts";
import type { SessionContext } from "./shared.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface WorldlineModel {
  time: number;
  sessionCtx: SessionContext | null;
  frames: FrameData[];
  cursor: number;
}

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
  | { type: "worldline-loaded"; frames: FrameData[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centerBox(bg: Surface, content: Surface, title: string, ctx: BijouContext): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

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
      emit({ type: "worldline-loaded", frames });
    } catch {
      // Silently ignore — worldline view will show empty state
    }
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function renderWorldlinePage(model: WorldlineModel, w: number, h: number, ctx: BijouContext): Surface {
  if (model.sessionCtx === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Worldline", ctx);
  }

  return renderWorldline({
    frames: model.frames,
    catalog: model.sessionCtx.catalog.lanes,
    cursor: model.cursor,
    w, h, ctx,
  });
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function worldlinePage(ctx: BijouContext): FramePage<WorldlineModel, WorldlineMsg> {
  const initial: WorldlineModel = {
    time: 0,
    sessionCtx: null,
    frames: [],
    cursor: 0,
  };

  return {
    id: "worldline",
    title: "Worldline",
    init: () => [initial, []],

    keyMap: createKeyMap<WorldlineMsg>()
      .bind("up", "Scroll up", { type: "cursor-up" })
      .bind("k", "Scroll up", { type: "cursor-up" })
      .bind("down", "Scroll down", { type: "cursor-down" })
      .bind("j", "Scroll down", { type: "cursor-down" })
      .bind("enter", "Jump to tick", { type: "select-tick" }),

    update: (msg, model) => {
      const m = msg as WorldlineMsg;

      if (m.type === "pulse") return [{ ...model, time: model.time + m.dt }, []];

      if (m.type === "session-ready") {
        return [{ ...model, sessionCtx: m.ctx, frames: [], cursor: 0 }, [makeWorldlineLoadCmd(m.ctx)]];
      }

      if (m.type === "disconnect") return [{ ...initial, time: model.time }, []];

      if (m.type === "worldline-loaded") {
        return [{ ...model, frames: m.frames, cursor: 0 }, []];
      }

      if (model.sessionCtx === null) return [model, []];

      if (m.type === "cursor-up") {
        return [{ ...model, cursor: Math.max(model.cursor - 1, 0) }, []];
      }

      if (m.type === "cursor-down") {
        const max = Math.max(model.frames.length - 1, 0);
        return [{ ...model, cursor: Math.min(model.cursor + 1, max) }, []];
      }

      if (m.type === "select-tick") {
        const rows = buildTickRows(model.frames, model.sessionCtx.catalog.lanes);
        const selected = rows[model.cursor];
        if (selected !== undefined) {
          const session = model.sessionCtx.session;
          return [model, [async (): Promise<void> => {
            try {
              await session.seekToFrame(selected.frameIndex);
            } catch {
              // Silently ignore seek errors from worldline
            }
          }]];
        }
      }

      return [model, []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderWorldlinePage(model, w, h, ctx),
    }),
  };
}

/**
 * Navigator page — step through frames, view lanes and receipts.
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
import { renderNavigator } from "../navigatorLayout.ts";
import { isPageMsg, type SessionContext } from "./shared.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface NavigatorModel {
  time: number;
  sessionCtx: SessionContext | null;
  jumpInput: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type NavigatorMsg =
  | { type: "pulse"; dt: number }
  | { type: "step-forward" }
  | { type: "step-backward" }
  | { type: "jump-start" }
  | { type: "jump-digit"; key: string }
  | { type: "jump-confirm" }
  | { type: "jump-cancel" }
  | { type: "pin" }
  | { type: "unpin" }
  | { type: "snapshot-updated" }
  | { type: "nav-error"; message: string }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centerBox(bg: Surface, content: Surface, title: string, ctx: BijouContext): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function renderNav(model: NavigatorModel, w: number, h: number, ctx: BijouContext): Surface {
  if (model.sessionCtx === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Navigator", ctx);
  }

  return renderNavigator({
    snap: model.sessionCtx.session.snapshot,
    caps: model.sessionCtx.hello.capabilities,
    catalog: model.sessionCtx.catalog.lanes,
    pins: model.sessionCtx.session.pins,
    error: model.error,
    jumpInput: model.jumpInput,
    w, h, ctx,
  });
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function navigatorPage(ctx: BijouContext): FramePage<NavigatorModel, NavigatorMsg> {
  const initial: NavigatorModel = {
    time: 0,
    sessionCtx: null,
    jumpInput: null,
    error: null,
  };

  return {
    id: "nav",
    title: "Navigator",
    init: () => [initial, []],

    keyMap: createKeyMap<NavigatorMsg>()
      .bind("n", "Step forward", { type: "step-forward" })
      .bind("right", "Step forward", { type: "step-forward" })
      .bind("p", "Step backward", { type: "step-backward" })
      .bind("left", "Step backward", { type: "step-backward" })
      .bind("g", "Jump to frame", { type: "jump-start" })
      .bind("P", "Pin observation", { type: "pin" })
      .bind("u", "Unpin", { type: "unpin" }),

    modalKeyMap: (model): ReturnType<NonNullable<FramePage<NavigatorModel, NavigatorMsg>["modalKeyMap"]>> => {
      if (model.jumpInput === null) return undefined;
      const km = createKeyMap<NavigatorMsg>()
        .bind("escape", "Cancel", { type: "jump-cancel" })
        .bind("enter", "Confirm", { type: "jump-confirm" })
        .bind("backspace", "Delete", { type: "jump-cancel" });
      for (let d = 0; d <= 9; d++) {
        km.bind(String(d), `Digit ${String(d)}`, { type: "jump-digit", key: String(d) });
      }
      return km;
    },

    update: (msg, model) => {
      if (!isPageMsg<NavigatorMsg>(msg)) return [model, []];
      const m = msg;

      if (m.type === "pulse") return [{ ...model, time: model.time + m.dt }, []];

      if (m.type === "session-ready") return [{ ...model, sessionCtx: m.ctx, error: null }, []];
      if (m.type === "disconnect") return [{ ...initial, time: model.time }, []];
      if (m.type === "snapshot-updated") return [{ ...model, error: null }, []];
      if (m.type === "nav-error") return [{ ...model, error: m.message }, []];

      if (model.sessionCtx === null) return [model, []];
      const session = model.sessionCtx.session;

      // Jump mode
      if (model.jumpInput !== null) {
        if (m.type === "jump-cancel") return [{ ...model, jumpInput: null }, []];
        if (m.type === "jump-digit") return [{ ...model, jumpInput: model.jumpInput + m.key }, []];
        if (m.type === "jump-confirm") {
          const frameIndex = parseInt(model.jumpInput, 10);
          const next = { ...model, jumpInput: null };
          if (Number.isNaN(frameIndex)) return [next, []];
          return [next, [async (emit): Promise<void> => {
            try {
              await session.seekToFrame(frameIndex);
              emit({ type: "snapshot-updated" });
            } catch (err) {
              emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
            }
          }]];
        }
        return [model, []];
      }

      if (m.type === "jump-start") return [{ ...model, jumpInput: "" }, []];

      if (m.type === "step-forward") {
        return [model, [async (emit): Promise<void> => {
          try {
            await session.stepForward();
            emit({ type: "snapshot-updated" });
          } catch (err) {
            emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
          }
        }]];
      }

      if (m.type === "step-backward") {
        return [model, [async (emit): Promise<void> => {
          try {
            await session.stepBackward();
            emit({ type: "snapshot-updated" });
          } catch (err) {
            emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
          }
        }]];
      }

      if (m.type === "pin") {
        const obs = session.snapshot.observations[0];
        if (obs !== undefined) {
          const pinned = session.pin(obs.observationId);
          const label = pinned !== null ? pinned.emission.effectKind : "observation";
          return [{ ...model, error: `Pinned: ${label} at frame ${session.snapshot.frame.frameIndex.toString()}` }, []];
        }
        return [{ ...model, error: "Nothing to pin — no observations at this frame" }, []];
      }

      if (m.type === "unpin") {
        const lastPin = session.pins[session.pins.length - 1];
        if (lastPin !== undefined) {
          session.unpin(lastPin.observation.observationId);
          return [{ ...model, error: `Unpinned: ${lastPin.emission.effectKind} from frame ${lastPin.pinnedAt.toString()}` }, []];
        }
        return [{ ...model, error: "No pins to remove" }, []];
      }

      return [model, []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderNav(model, w, h, ctx),
    }),
  };
}

/**
 * Cross-page session synchronization.
 *
 * The connect page owns the session lifecycle. When session state
 * changes, the shell propagates it to all other pages. The worldline
 * cursor is kept in sync with the session's current frame index.
 */
import type { FrameModel, Cmd, FramedAppMsg } from "@flyingrobots/bijou-tui";
import type { SessionContext } from "./pages/shared.ts";
import { buildTickRows } from "./worldlineLayout.ts";
import type { FrameData } from "./worldlineLayout.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page messages are heterogeneous by design
type AnyMsg = any;
type FModel = FrameModel<AnyMsg>;
type FMsg = FramedAppMsg<AnyMsg>;

export function getSessionCtx(model: FModel): SessionContext | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- typed page model through generic frame
  return (model.pageModels["connect"] as AnyMsg)?.sessionCtx ?? null;
}

export function syncSession(
  model: FModel,
  sessionCtx: SessionContext | null,
): [FModel, Cmd<FMsg>[]] {
  const pages = { ...model.pageModels };
  for (const id of ["nav", "worldline", "inspect"]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- propagating typed sessionCtx
    pages[id] = { ...pages[id], sessionCtx };
  }
  if (sessionCtx !== null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- resetting worldline state
    pages["worldline"] = { ...pages["worldline"], frames: [], cursor: 0 };
    const loadCmd = makeWorldlineLoadCmd(sessionCtx);
    return [{ ...model, pageModels: pages }, [loadCmd as Cmd<FMsg>]];
  }
  return [{ ...model, pageModels: pages }, []];
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
      emit({ type: "worldline-loaded", frames } as FMsg);
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

export function handleWorldlineLoaded(model: FModel, frames: FrameData[]): FModel {
  const sessionCtx = getSessionCtx(model);
  const frameIndex = sessionCtx?.session.snapshot.head.currentFrameIndex ?? 0;
  const catalog = sessionCtx?.catalog.lanes ?? [];
  const cursor = cursorForFrame(frames, catalog, frameIndex);
  const pages = { ...model.pageModels };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typed worldline model
  pages["worldline"] = { ...pages["worldline"], frames, cursor };
  return { ...model, pageModels: pages };
}

export function syncWorldlineCursor(model: FModel): FModel {
  const sessionCtx = getSessionCtx(model);
  if (sessionCtx === null) return model;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- accessing worldline page model
  const wl = model.pageModels["worldline"] as AnyMsg;
  if (wl?.frames === undefined) return model;
  const frameIndex = sessionCtx.session.snapshot.head.currentFrameIndex;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- typed frames array
  const cursor = cursorForFrame(wl.frames as FrameData[], sessionCtx.catalog.lanes, frameIndex);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- checking current cursor
  if (wl.cursor === cursor) return model;
  const pages = { ...model.pageModels };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- updating cursor
  pages["worldline"] = { ...wl, cursor };
  return { ...model, pageModels: pages };
}

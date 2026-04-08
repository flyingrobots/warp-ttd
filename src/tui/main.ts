/**
 * warp-ttd TUI entry point.
 *
 * Thin app shell: registers pages, configures the frame, runs.
 * All page logic lives in src/tui/pages/.
 *
 * Cross-page session broadcast: when the connect page's sessionCtx
 * changes, the shell propagates it to all other page models directly.
 */
import { initDefaultContext } from "@flyingrobots/bijou-node";
import {
  run,
  quit,
  createFramedApp,
  createKeyMap,
} from "@flyingrobots/bijou-tui";
import type { FramePage, FramedApp, App, FramedAppMsg, Cmd } from "@flyingrobots/bijou-tui";
import type { FrameModel } from "@flyingrobots/bijou-tui";
import { connectPage } from "./pages/connectPage.ts";
import { navigatorPage } from "./pages/navigatorPage.ts";
import { worldlinePage } from "./pages/worldlinePage.ts";
import { inspectorPage } from "./pages/inspectorPage.ts";
import type { SessionContext } from "./pages/shared.ts";
import type { FrameData } from "./worldlineLayout.ts";

const ctx = initDefaultContext();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page models/messages are heterogeneous by design
type AnyPage = FramePage<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page messages are heterogeneous by design
type AnyMsg = any;

type AppMsg = { type: "quit" } | { type: "pulse"; dt: number };

const framedApp: FramedApp<AnyMsg, AnyMsg> = createFramedApp<AnyMsg, AnyMsg>({
  title: "WARP TTD v0.1",
  enableCommandPalette: true,
  pages: [
    connectPage(ctx) as AnyPage,
    navigatorPage(ctx) as AnyPage,
    worldlinePage(ctx) as AnyPage,
    inspectorPage(ctx) as AnyPage,
  ],
  globalKeys: createKeyMap<AnyMsg>()
    .bind("q", "Quit", { type: "quit" }),
});

type FModel = FrameModel<AnyMsg>;
type FMsg = FramedAppMsg<AnyMsg>;

function getSessionCtx(model: FModel): SessionContext | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- typed page model through generic frame
  return (model.pageModels["connect"] as AnyMsg)?.sessionCtx ?? null;
}

function syncSession(model: FModel, sessionCtx: SessionContext | null): [FModel, Cmd<FMsg>[]] {
  const pages = { ...model.pageModels };
  for (const id of ["nav", "worldline", "inspect"]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- propagating typed sessionCtx across page models
    pages[id] = { ...pages[id], sessionCtx };
  }
  if (sessionCtx !== null) {
    // Reset worldline frames and trigger load
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typed worldline model through generic frame
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
      const maxIndex = maxFrame.frameIndex;
      const frames: FrameData[] = [];
      for (let i = 0; i <= maxIndex; i++) {
        const f = await adapter.frame(headId, i);
        const r = await adapter.receipts(headId, i);
        frames.push({ frameIndex: f.frameIndex, lanes: f.lanes, receipts: r });
      }
      // Wrap as a worldline page message via the frame's page-scoped dispatch
      // The shell update will pass this through framedApp.update which routes to the page
      emit({ type: "worldline-loaded", frames } as FMsg);
    } catch {
      // Silently ignore — worldline view will show empty state
    }
  };
}

function initApp(): [FModel, Cmd<FMsg>[]] {
  const [fModel, fCmds] = framedApp.init();
  const pulseCmd = (emit: (msg: FMsg) => void): (() => void) => {
    const interval = setInterval(() => { emit({ type: "pulse", dt: 1 / 30 }); }, 33);
    return (): void => { clearInterval(interval); };
  };
  return [fModel, [pulseCmd as Cmd<FMsg>, ...fCmds]];
}

function handleWorldlineLoaded(model: FModel, frames: FrameData[]): FModel {
  const pages = { ...model.pageModels };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typed worldline model through generic frame
  pages["worldline"] = { ...pages["worldline"], frames, cursor: 0 };
  return { ...model, pageModels: pages };
}

function updateApp(msg: FMsg, model: FModel): [FModel, Cmd<FMsg>[]] {
  if ((msg as AppMsg).type === "quit") return [model, [quit() as Cmd<FMsg>]];

  // Intercept worldline-loaded (from shell-initiated load cmd)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- checking message discriminant
  if ((msg as AnyMsg).type === "worldline-loaded") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- accessing typed frames from message
    return [handleWorldlineLoaded(model, (msg as AnyMsg).frames as FrameData[]), []];
  }

  const prevCtx = getSessionCtx(model);
  const [next, cmds] = framedApp.update(msg, model);
  const nextCtx = getSessionCtx(next);

  // Session state changed — sync to all pages
  if (prevCtx !== nextCtx) {
    const [synced, syncCmds] = syncSession(next, nextCtx);
    return [synced, [...cmds, ...syncCmds]];
  }

  return [next, cmds];
}

const mainApp: App<FModel, FMsg> = {
  init: initApp,
  update: updateApp,
  view: (model: FModel) => framedApp.view(model),
};

run(mainApp).then(
  () => process.exit(0),
  (err: Error) => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  },
);

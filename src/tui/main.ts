/**
 * warp-ttd TUI entry point.
 *
 * Thin app shell: registers pages, configures the frame, runs.
 * All page logic lives in src/tui/pages/.
 * Cross-page session sync lives in sessionSync.ts.
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
import type { FrameData } from "./worldlineLayout.ts";
import {
  getSessionCtx,
  syncSession,
  syncWorldlineCursor,
  handleWorldlineLoaded,
} from "./sessionSync.ts";

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

function initApp(): [FModel, Cmd<FMsg>[]] {
  const [fModel, fCmds] = framedApp.init();
  const pulseCmd = (emit: (msg: FMsg) => void): (() => void) => {
    const interval = setInterval(() => { emit({ type: "pulse", dt: 1 / 30 }); }, 33);
    return (): void => { clearInterval(interval); };
  };
  return [fModel, [pulseCmd as Cmd<FMsg>, ...fCmds]];
}

function updateApp(msg: FMsg, model: FModel): [FModel, Cmd<FMsg>[]] {
  if ((msg as AppMsg).type === "quit") return [model, [quit()]];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- checking message discriminant
  if ((msg).type === "worldline-loaded") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- accessing typed frames
    return [handleWorldlineLoaded(model, (msg).frames as FrameData[]), []];
  }

  const prevCtx = getSessionCtx(model);
  const [next, cmds] = framedApp.update(msg, model);
  const nextCtx = getSessionCtx(next);

  if (prevCtx !== nextCtx) {
    const [synced, syncCmds] = syncSession(next, nextCtx);
    return [syncWorldlineCursor(synced), [...cmds, ...syncCmds]];
  }

  return [syncWorldlineCursor(next), cmds];
}

const mainApp: App<FModel, FMsg> = {
  init: initApp,
  update: updateApp,
  view: (model: FModel) => framedApp.view(model),
};

run(mainApp).then(
  () => process.exit(0),
  (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  },
);

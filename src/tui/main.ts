/**
 * warp-ttd TUI entry point.
 *
 * Thin app shell: registers pages, configures the frame, runs.
 * All page logic lives in src/tui/pages/.
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

const ctx = initDefaultContext();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page models are heterogeneous by design
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
  if ((msg as AppMsg).type === "quit") return [model, [quit() as Cmd<FMsg>]];
  return framedApp.update(msg, model);
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

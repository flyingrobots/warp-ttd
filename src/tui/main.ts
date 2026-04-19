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
import type { FramePage, FramedApp, App, FramedAppMsg, Cmd, FrameModel } from "@flyingrobots/bijou-tui";
import { connectPage } from "./pages/connectPage.ts";
import { navigatorPage } from "./pages/navigatorPage.ts";
import { worldlinePage } from "./pages/worldlinePage.ts";
import { inspectorPage } from "./pages/inspectorPage.ts";
import type { FrameData } from "./worldlineLayout.ts";
import {
  syncNeighborhoodFocus,
  getSessionCtx,
  syncNeighborhoodSelection,
  syncSiteDrivenWorldlineFocus,
  shouldResyncWorldlineFocus,
  worldlineFocusSnapshot,
  syncSession,
  handleWorldlineLoaded,
} from "./sessionSync.ts";

const ctx = initDefaultContext();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page models/messages are heterogeneous by design
type AnyPage = FramePage<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page messages are heterogeneous by design
type AnyMsg = any;

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

function isQuitMessage(msg: FMsg): boolean {
  return messageType(msg) === "quit";
}

function isWorldlineLoadedMessage(msg: FMsg): msg is {
  type: "worldline-loaded";
  frames: FrameData[];
  sessionId?: string;
} {
  return messageType(msg) === "worldline-loaded" &&
    typeof msg === "object" && msg !== null && "frames" in msg && Array.isArray((msg as Record<string, string>)["frames"]);
}

function isLaneSelectionMessage(msg: FMsg): boolean {
  const type = messageType(msg);
  return type === "lane-left" || type === "lane-right";
}

function messageType(msg: FMsg): string | null {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) return null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- framed app carries heterogeneous page messages at this boundary
  const value = (msg as Record<string, string>)["type"];
  return typeof value === "string" ? value : null;
}

function initApp(): [FModel, Cmd<FMsg>[]] {
  const [fModel, fCmds] = framedApp.init();
  const pulseCmd = (emit: (msg: FMsg) => void): (() => void) => {
    const interval = setInterval(() => { emit({ type: "pulse", dt: 1 / 30 }); }, 33);
    return (): void => { clearInterval(interval); };
  };
  return [fModel, [pulseCmd as Cmd<FMsg>, ...fCmds]];
}

function updateApp(msg: FMsg, model: FModel): [FModel, Cmd<FMsg>[]] {
  if (isQuitMessage(msg)) return [model, [quit()]];

  if (isWorldlineLoadedMessage(msg)) {
    return [handleWorldlineLoaded(model, msg.frames, msg.sessionId), []];
  }

  const prevCtx = getSessionCtx(model);
  const prevSnap = worldlineFocusSnapshot(model);
  const [next, cmds] = framedApp.update(msg, model);
  const nextCtx = getSessionCtx(next);

  if (prevCtx !== nextCtx) {
    const [synced, syncCmds] = syncSession(next, nextCtx);
    return [syncNeighborhoodFocus(syncSiteDrivenWorldlineFocus(synced)), [...cmds, ...syncCmds]];
  }

  if (isLaneSelectionMessage(msg)) {
    return [syncNeighborhoodFocus(syncNeighborhoodSelection(next)), cmds];
  }

  const nextSnap = worldlineFocusSnapshot(next);
  if (nextSnap !== null && shouldResyncWorldlineFocus(prevSnap, nextSnap)) {
    return [syncNeighborhoodFocus(syncSiteDrivenWorldlineFocus(next)), cmds];
  }

  return [syncNeighborhoodFocus(next), cmds];
}

const mainApp: App<FModel, FMsg> = {
  init: initApp,
  update: updateApp,
  view: (model: FModel) => framedApp.view(model),
};

type FatalInput =
  | Error
  | { toString(): string }
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

function onFatal(err: FatalInput): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
}

run(mainApp).then(
  () => process.exit(0),
  onFatal,
);

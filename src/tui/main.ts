/**
 * warp-ttd TUI entry point.
 *
 * Thin app shell: registers pages, configures the frame, and runs.
 */
import { initDefaultContext } from "@flyingrobots/bijou-node";
import {
  run,
  quit,
  createFramedApp,
  createKeyMap,
} from "@flyingrobots/bijou-tui";
import type { FramePage, FramedApp, App, Cmd } from "@flyingrobots/bijou-tui";
import { connectPage } from "./pages/connectPage.ts";
import { navigatorPage } from "./pages/navigatorPage.ts";
import { worldlinePage } from "./pages/worldlinePage.ts";
import { inspectorPage } from "./pages/inspectorPage.ts";
import type { FrameData } from "./worldlineLayout.ts";
import type { AnyMsg, FModel, FMsg, PageMessageValue } from "./frameTypes.ts";
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
type AnyPage = FramePage<object, AnyMsg>;

const framedApp: FramedApp<object, AnyMsg> = createFramedApp<object, AnyMsg>({
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

function isQuitMessage(msg: FMsg): boolean {
  return messageType(msg) === "quit";
}

function isWorldlineLoadedMessage(msg: FMsg): msg is {
  type: "worldline-loaded";
  frames: FrameData[];
  sessionId?: string;
} {
  const record = msg as { readonly frames?: PageMessageValue };
  return messageType(msg) === "worldline-loaded" && Array.isArray(record.frames);
}

function isLaneSelectionMessage(msg: FMsg): boolean {
  const type = messageType(msg);
  return type === "lane-left" || type === "lane-right";
}

function messageType(msg: FMsg): string | null {
  if (!("type" in msg)) return null;
  const value = (msg as { readonly type?: PageMessageValue }).type;
  return typeof value === "string" ? value : null;
}

function initApp(): [FModel, Cmd<FMsg>[]] {
  const [fModel, rawCmds] = framedApp.init();
  const fCmds = rawCmds as Cmd<FMsg>[];
  const pulseCmd = (emit: (msg: FMsg) => void): (() => void) => {
    const interval = setInterval(() => { emit({ type: "pulse", dt: 1 / 30 }); }, 33);
    return (): void => { clearInterval(interval); };
  };
  return [fModel, [pulseCmd as Cmd<FMsg>, ...fCmds]];
}

function syncAfterSessionChange(
  next: FModel,
  cmds: Cmd<FMsg>[],
  nextCtx: ReturnType<typeof getSessionCtx>
): [FModel, Cmd<FMsg>[]] {
  const [synced, syncCmds] = syncSession(next, nextCtx);
  return [syncNeighborhoodFocus(syncSiteDrivenWorldlineFocus(synced)), [...cmds, ...syncCmds]];
}

interface SyncAfterFrameChangeArgs {
  msg: FMsg;
  prevSnap: ReturnType<typeof worldlineFocusSnapshot>;
  next: FModel;
  cmds: Cmd<FMsg>[];
}

function syncAfterFrameChange(args: SyncAfterFrameChangeArgs): [FModel, Cmd<FMsg>[]] {
  const { msg, prevSnap, next, cmds } = args;

  if (isLaneSelectionMessage(msg)) {
    return [syncNeighborhoodFocus(syncNeighborhoodSelection(next)), cmds];
  }

  const nextSnap = worldlineFocusSnapshot(next);
  if (nextSnap !== null && shouldResyncWorldlineFocus(prevSnap, nextSnap)) {
    return [syncNeighborhoodFocus(syncSiteDrivenWorldlineFocus(next)), cmds];
  }

  return [syncNeighborhoodFocus(next), cmds];
}

function updateApp(msg: FMsg, model: FModel): [FModel, Cmd<FMsg>[]] {
  if (isQuitMessage(msg)) return [model, [quit()]];

  if (isWorldlineLoadedMessage(msg)) {
    const cmds: Cmd<FMsg>[] = [];
    return [handleWorldlineLoaded(model, msg.frames, msg.sessionId), cmds];
  }

  const prevCtx = getSessionCtx(model);
  const prevSnap = worldlineFocusSnapshot(model);
  const [next, rawCmds] = framedApp.update(msg, model);
  const cmds = rawCmds as Cmd<FMsg>[];
  const nextCtx = getSessionCtx(next);

  if (prevCtx !== nextCtx) {
    return syncAfterSessionChange(next, cmds, nextCtx);
  }

  return syncAfterFrameChange({ msg, prevSnap, next, cmds });
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

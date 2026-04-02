/**
 * warp-ttd TUI entry point.
 *
 * Launches a fullscreen terminal debugger with three pages:
 *   Connect  — pick an adapter (echo fixture or git-warp repo)
 *   Navigate — step through frames, view lanes and receipts
 *   Inspect  — detailed frame and receipt breakdown
 */
import { initDefaultContext } from "@flyingrobots/bijou-node";
import {
  run,
  quit,
  createFramedApp,
  createKeyMap,
  isKeyMsg,
  vstack,
} from "@flyingrobots/bijou-tui";
import {
  createSurface,
  stringToSurface,
  boxSurface,
  badge,
  surfaceToString
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import { renderWaveShader } from "./shaders/bgShader.ts";
import { renderNavigator } from "./navigatorLayout.ts";
import { renderWorldline, buildTickRows } from "./worldlineLayout.ts";
import type { FrameData } from "./worldlineLayout.ts";
import { resolveAdapter } from "../app/adapterRegistry.ts";
import type { AdapterConfig } from "../app/adapterRegistry.ts";
import { DebuggerSession } from "../app/debuggerSession.ts";
import type { SessionSnapshot } from "../app/debuggerSession.ts";
import type {
  HostHello,
  LaneCatalog
} from "../protocol.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Msg =
  | { type: "quit" }
  | { type: "pulse"; dt: number }
  | { type: "session-ready"; session: DebuggerSession; hello: HostHello; catalog: LaneCatalog; generation: number }
  | { type: "snapshot-updated"; snapshot: SessionSnapshot }
  | { type: "connect-error"; message: string; generation?: number }
  | { type: "nav-error"; message: string }
  | { type: "disconnect" }
  | { type: "worldline-loaded"; frames: FrameData[] };

interface Model {
  time: number;
  // Session state (replaces raw adapter/head/frame/receipts/emissions/observations/execCtx)
  session: DebuggerSession | null;
  hello: HostHello | null;
  catalog: LaneCatalog | null;
  // Connection wizard state
  connectStep: "choose" | "input-path" | "input-graph";
  connectChoice: number;
  inputValue: string;
  repoPath: string;
  error: string | null;
  connectGeneration: number;
  connecting: boolean;
  // Jump-to-frame prompt state
  jumpInput: string | null;
  // Worldline viewer state
  worldlineFrames: FrameData[];
  worldlineCursor: number;
}

const CONNECT_OPTIONS = [
  "Echo Fixture (built-in demo data)",
  "git-warp (local repository)",
  "Scenario: Live with Effects",
  "Scenario: Replay with Suppression",
  "Scenario: Multi-Writer Conflicts"
];


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ctx: BijouContext = initDefaultContext();

function centerBox(bg: Surface, content: Surface, title: string): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function connectLayout(model: Model, w: number, h: number): Surface {
  const bg = renderWaveShader(w, h, model.time);

  if (model.session !== null) {
    const info = vstack(
      surfaceToString(badge("CONNECTED", { variant: "success", ctx }), ctx.style),
      "",
      ` Host: ${model.hello?.hostKind ?? "unknown"}`,
      ` Protocol: ${model.hello?.protocolVersion ?? "?"}`,
      ` Lanes: ${(model.catalog?.lanes.length ?? 0).toString()}`,
      ` Session: ${model.session.sessionId.slice(0, 8)}`,
      "",
      " Use [ / ] to switch pages.",
      " Press [d] to disconnect."
    );
    return centerBox(bg, stringToSurface(info, 56, info.split("\n").length), "Status");
  }

  if (model.connectStep === "choose") {
    const items = CONNECT_OPTIONS.map((label, i) =>
      i === model.connectChoice
        ? ctx.style.styled(ctx.semantic("primary"), ` > ${label}`)
        : `   ${label}`
    ).join("\n");

    const errorLine = model.error !== null
      ? vstack("", ctx.style.styled(ctx.status("error"), ` Error: ${model.error}`))
      : "";

    const content = vstack(
      " Choose a host adapter:",
      "",
      items,
      "",
      " [Enter] Select  [q] Quit",
      errorLine
    );
    return centerBox(bg, stringToSurface(content, 56, content.split("\n").length), "Connect");
  }

  if (model.connectStep === "input-path") {
    const content = vstack(
      " Enter repository path:",
      "",
      ` > ${model.inputValue}_`,
      "",
      " [Enter] Confirm  [Esc] Back"
    );
    return centerBox(bg, stringToSurface(content, 56, content.split("\n").length), "Repository Path");
  }

  // input-graph (only remaining state)
  {
    const content = vstack(
      " Enter graph name:",
      "",
      ` > ${model.inputValue}_`,
      "",
      " [Enter] Confirm  [Esc] Back"
    );
    return centerBox(bg, stringToSurface(content, 56, content.split("\n").length), "Graph Name");
  }
}

function navigatorLayout(model: Model, w: number, h: number): Surface {
  if (model.session === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Navigator");
  }

  return renderNavigator({
    snap: model.session.snapshot,
    caps: model.hello?.capabilities ?? [],
    catalog: model.catalog?.lanes ?? [],
    pins: model.session.pins,
    error: model.error,
    jumpInput: model.jumpInput,
    w, h,
    ctx
  });
}

function worldlinePageLayout(model: Model, w: number, h: number): Surface {
  if (model.session === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Worldline");
  }

  return renderWorldline({
    frames: model.worldlineFrames,
    catalog: model.catalog?.lanes ?? [],
    cursor: model.worldlineCursor,
    w, h,
    ctx
  });
}

function inspectorLayout(model: Model, w: number, h: number): Surface {
  if (model.session === null || model.hello === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Inspector");
  }

  const snap = model.session.snapshot;
  const final = createSurface(w, h);
  final.fill({ char: " " });

  // Host info
  const hostInfo = vstack(
    ` Host Kind:    ${model.hello.hostKind}`,
    ` Version:      ${model.hello.hostVersion}`,
    ` Protocol:     ${model.hello.protocolVersion}`,
    ` Schema:       ${model.hello.schemaId}`,
    ` Capabilities: ${model.hello.capabilities.length.toString()}`,
    ` Session:      ${model.session.sessionId.slice(0, 8)}`
  );
  const hostSurf = stringToSurface(hostInfo, w - 4, hostInfo.split("\n").length);
  final.blit(boxSurface(hostSurf, { title: " Host ", width: w - 2, ctx }), 1, 1);

  // Lane catalog
  const laneLines = (model.catalog?.lanes ?? [])
    .map((l) => {
      const rw = l.writable ? "rw" : "ro";
      const parent = l.parentId !== undefined ? ` < ${l.parentId}` : "";
      return `  [${rw}] ${l.id.padEnd(16)} ${l.kind}${parent}`;
    })
    .join("\n");

  const laneSurf = stringToSurface(laneLines, w - 4, laneLines.split("\n").length);
  final.blit(boxSurface(laneSurf, { title: " Lanes ", width: w - 2, ctx }), 1, hostSurf.height + 3);

  // Detailed receipts
  if (snap.receipts.length > 0) {
    const detailLines = snap.receipts.map((r) =>
      vstack(
        `  ${r.receiptId}`,
        `    Lane: ${r.laneId}  Tick: ${r.inputTick.toString()} -> ${r.outputTick.toString()}`,
        `    Admitted: ${r.admittedRewriteCount.toString()}  Rejected: ${r.rejectedRewriteCount.toString()}  Counterfactual: ${r.counterfactualCount.toString()}`,
        `    ${r.summary}`
      )
    ).join("\n");
    const detailSurf = stringToSurface(detailLines, w - 4, detailLines.split("\n").length);
    final.blit(
      boxSurface(detailSurf, { title: " Receipt Detail ", width: w - 2, ctx }),
      1,
      hostSurf.height + laneSurf.height + 5
    );
  }

  return final;
}

// ---------------------------------------------------------------------------
// Connect helper
// ---------------------------------------------------------------------------

function makeConnectCmd(
  config: AdapterConfig,
  gen: number
): (emit: (msg: Msg) => void) => Promise<void> {
  return async (emit: (msg: Msg) => void): Promise<void> => {
    try {
      const { adapter, defaultHeadId } = await resolveAdapter(config);
      const session = await DebuggerSession.create(adapter, defaultHeadId);
      const hello = await adapter.hello();
      const catalog = await adapter.laneCatalog();
      emit({ type: "session-ready", session, hello, catalog, generation: gen });
    } catch (err) {
      emit({ type: "connect-error", message: err instanceof Error ? err.message : String(err), generation: gen });
    }
  };
}

// ---------------------------------------------------------------------------
// Worldline load helper
// ---------------------------------------------------------------------------

function makeWorldlineLoadCmd(
  session: DebuggerSession
): (emit: (msg: Msg) => void) => Promise<void> {
  return async (emit: (msg: Msg) => void): Promise<void> => {
    try {
      const adapter = session.adapter;
      const headId = session.snapshot.head.headId;
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
// App
// ---------------------------------------------------------------------------

const initialModel: Model = {
  time: 0,
  session: null,
  hello: null,
  catalog: null,
  connectStep: "choose",
  connectChoice: 0,
  inputValue: process.cwd(),
  repoPath: "",
  error: null,
  connectGeneration: 0,
  connecting: false,
  jumpInput: null,
  worldlineFrames: [],
  worldlineCursor: 0
};

const framedApp = createFramedApp<Model, Msg>({
  title: "WARP TTD v0.1",
  pages: [
    {
      id: "connect",
      title: "Connect",
      init: () => [initialModel, []],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- framework requires msg param
      update: (msg: any, model: Model) => [model, []],
      layout: (model: Model) => ({
        kind: "pane" as const,
        paneId: "main",
        render: (w: number, h: number) => connectLayout(model, w, h)
      })
    },
    {
      id: "nav",
      title: "Navigator",
      init: () => [initialModel, []],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- framework requires msg param
      update: (msg: any, model: Model) => [model, []],
      layout: (model: Model) => ({
        kind: "pane" as const,
        paneId: "main",
        render: (w: number, h: number) => navigatorLayout(model, w, h)
      })
    },
    {
      id: "worldline",
      title: "Worldline",
      init: () => [initialModel, []],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- framework requires msg param
      update: (msg: any, model: Model) => [model, []],
      layout: (model: Model) => ({
        kind: "pane" as const,
        paneId: "main",
        render: (w: number, h: number) => worldlinePageLayout(model, w, h)
      })
    },
    {
      id: "inspect",
      title: "Inspector",
      init: () => [initialModel, []],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- framework requires msg param
      update: (msg: any, model: Model) => [model, []],
      layout: (model: Model) => ({
        kind: "pane" as const,
        paneId: "main",
        render: (w: number, h: number) => inspectorLayout(model, w, h)
      })
    }
  ],
  globalKeys: createKeyMap<Msg>()
    .bind("q", "Quit", { type: "quit" })
    .bind("ctrl+c", "Quit", { type: "quit" })
    .bind("d", "Disconnect", { type: "disconnect" })
});

const mainApp = {
  init: () => {
    const [fModel, fCmds] = framedApp.init();
    return [fModel, [
      // Pulse animation timer — returns cleanup function per bijou Cmd contract
      ((emit: (msg: Msg) => void) => {
        const interval = setInterval(() => { emit({ type: "pulse", dt: 1 / 30 }); }, 33);
        return () => { clearInterval(interval); };
      }) as any,
      ...fCmds
    ]] as [typeof fModel, typeof fCmds];
  },

  update: (msg: any, model: any): [any, any[]] => {
    const [nextFrame, fCmds] = framedApp.update(msg, model);
    let nextModel: any = nextFrame;

    const updateAllPages = (pm: Model) => {
      const newPageModels: Record<string, Model> = {};

      for (const id of Object.keys(nextModel.pageModels)) {
        newPageModels[id] = pm;
      }

      return newPageModels;
    };

    let pm: Model = nextModel.pageModels[nextModel.activePageId];

    // --- Pulse ---
    if (msg.type === "pulse") {
      pm = { ...pm, time: pm.time + msg.dt };
      return [{ ...nextModel, pageModels: updateAllPages(pm) }, fCmds];
    }

    // --- Quit ---
    if (msg.type === "quit") {
      return [model, [quit()]];
    }

    // --- Disconnect ---
    if (msg.type === "disconnect" && pm.session !== null) {
      pm = {
        ...pm,
        session: null,
        hello: null,
        catalog: null,
        connectStep: "choose",
        connectChoice: 0
      };
      nextModel = { ...nextModel, activePageId: "connect", pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Connect error (generation-gated when from connect flow) ---
    if (msg.type === "connect-error") {
      if (msg.generation !== undefined && msg.generation !== pm.connectGeneration) return [nextModel, fCmds];
      pm = { ...pm, session: null, connecting: false, error: msg.message, connectStep: "choose" };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Nav error (non-destructive — keeps session connected) ---
    if (msg.type === "nav-error") {
      pm = { ...pm, error: msg.message };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Session ready (guard against stale async results) ---
    if (msg.type === "session-ready") {
      if (msg.generation !== pm.connectGeneration) return [nextModel, fCmds];
      pm = {
        ...pm,
        connecting: false,
        session: msg.session,
        hello: msg.hello,
        catalog: msg.catalog,
        worldlineFrames: [],
        worldlineCursor: 0
      };
      nextModel = { ...nextModel, activePageId: "nav", pageModels: updateAllPages(pm) };
      const loadWorldline = makeWorldlineLoadCmd(msg.session);
      return [nextModel, [...fCmds, loadWorldline]];
    }

    // --- Worldline frames loaded ---
    if (msg.type === "worldline-loaded") {
      pm = { ...pm, worldlineFrames: msg.frames, worldlineCursor: 0 };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Snapshot updated (after step/seek) ---
    if (msg.type === "snapshot-updated") {
      // Session has already been mutated; clear any status flash and re-render
      pm = { ...pm, error: null };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Connection wizard keyboard handling ---
    if (pm.session === null && isKeyMsg(msg)) {
      if (pm.connectStep === "choose") {
        if (msg.key === "down" || msg.key === "j") {
          pm = { ...pm, connectChoice: Math.min(pm.connectChoice + 1, CONNECT_OPTIONS.length - 1) };
        } else if (msg.key === "up" || msg.key === "k") {
          pm = { ...pm, connectChoice: Math.max(pm.connectChoice - 1, 0) };
        } else if (msg.key === "enter") {
          const scenarioConfigs: Record<number, AdapterConfig | "git-warp-wizard"> = {
            0: { kind: "echo-fixture" },
            1: "git-warp-wizard",
            2: { kind: "scenario", scenario: "live-with-effects" },
            3: { kind: "scenario", scenario: "replay-with-suppression" },
            4: { kind: "scenario", scenario: "multi-writer-conflicts" }
          };
          const selected = scenarioConfigs[pm.connectChoice];
          if (selected === "git-warp-wizard") {
            pm = { ...pm, connectStep: "input-path", inputValue: process.cwd() };
          } else if (selected !== undefined) {
            const gen = pm.connectGeneration + 1;
            pm = { ...pm, connectGeneration: gen, connecting: true };
            nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
            return [nextModel, [...fCmds, makeConnectCmd(selected, gen)]];
          }
        }
      } else if (pm.connectStep === "input-path") {
        if (msg.key === "escape") {
          pm = { ...pm, connectStep: "choose" };
        } else if (msg.key === "enter") {
          if (pm.inputValue.trim().length === 0) {
            pm = { ...pm, error: "Repository path cannot be empty" };
          } else {
            pm = { ...pm, repoPath: pm.inputValue, connectStep: "input-graph", inputValue: "default", error: null };
          }
        } else if (msg.key === "backspace") {
          pm = { ...pm, inputValue: pm.inputValue.slice(0, -1) };
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- filters multi-char keys (shift, tab, etc.)
        } else if (msg.key.length === 1) {
          pm = { ...pm, inputValue: pm.inputValue + msg.key };
        }
      } else { // input-graph (only remaining state)
        if (msg.key === "escape") {
          pm = { ...pm, connectStep: "input-path", inputValue: pm.repoPath };
        } else if (msg.key === "enter") {
          const gen = pm.connectGeneration + 1;
          pm = { ...pm, connectGeneration: gen, connecting: true };
          nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
          return [nextModel, [...fCmds, makeConnectCmd(
            { kind: "git-warp", repoPath: pm.repoPath, graphName: pm.inputValue },
            gen
          )]];
        } else if (msg.key === "backspace") {
          pm = { ...pm, inputValue: pm.inputValue.slice(0, -1) };
        } else if (msg.key.length === 1) {
          pm = { ...pm, inputValue: pm.inputValue + msg.key };
        }
      }

      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Navigator keyboard handling (blocked while connecting) ---
    if (pm.session !== null && !pm.connecting && isKeyMsg(msg)) {
      const currentSession = pm.session;

      // Jump-to-frame mode — must be checked first so the prompt
      // intercepts all keys (including n/p/arrows) while active
      if (pm.jumpInput !== null) {
        if (msg.key === "escape") {
          pm = { ...pm, jumpInput: null };
        } else if (msg.key === "enter") {
          const frameIndex = parseInt(pm.jumpInput, 10);
          pm = { ...pm, jumpInput: null };
          if (!Number.isNaN(frameIndex)) {
            nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
            return [nextModel, [
              ...fCmds,
              async (emit: (msg: Msg) => void): Promise<void> => {
                try {
                  const snapshot = await currentSession.seekToFrame(frameIndex);
                  emit({ type: "snapshot-updated", snapshot });
                } catch (err) {
                  emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
                }
              }
            ]];
          }
        } else if (msg.key === "backspace") {
          pm = { ...pm, jumpInput: pm.jumpInput.slice(0, -1) };
        } else if (msg.key >= "0" && msg.key <= "9") {
          pm = { ...pm, jumpInput: pm.jumpInput + msg.key };
        }
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }

      if (msg.key === "n" || msg.key === "right") {
        return [nextModel, [
          ...fCmds,
          async (emit: (msg: Msg) => void): Promise<void> => {
            try {
              const snapshot = await currentSession.stepForward();
              emit({ type: "snapshot-updated", snapshot });
            } catch (err) {
              emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
            }
          }
        ]];
      }

      if (msg.key === "p" || msg.key === "left") {
        return [nextModel, [
          ...fCmds,
          async (emit: (msg: Msg) => void): Promise<void> => {
            try {
              const snapshot = await currentSession.stepBackward();
              emit({ type: "snapshot-updated", snapshot });
            } catch (err) {
              emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
            }
          }
        ]];
      }

      if (msg.key === "g") {
        pm = { ...pm, jumpInput: "" };
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }

      // Worldline page cursor navigation
      if (nextModel.activePageId === "worldline") {
        if (msg.key === "up" || msg.key === "k") {
          pm = { ...pm, worldlineCursor: Math.max(pm.worldlineCursor - 1, 0) };
          nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
          return [nextModel, fCmds];
        }
        if (msg.key === "down" || msg.key === "j") {
          const maxCursor = Math.max(pm.worldlineFrames.length - 1, 0);
          pm = { ...pm, worldlineCursor: Math.min(pm.worldlineCursor + 1, maxCursor) };
          nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
          return [nextModel, fCmds];
        }
        if (msg.key === "enter") {
          // Jump navigator to the selected tick's frame index
          const rows = buildTickRows(pm.worldlineFrames, pm.catalog?.lanes ?? []);
          const selected = rows[pm.worldlineCursor];
          if (selected !== undefined) {
            nextModel = { ...nextModel, activePageId: "nav", pageModels: updateAllPages(pm) };
            return [nextModel, [
              ...fCmds,
              async (emit: (msg: Msg) => void): Promise<void> => {
                try {
                  const snapshot = await currentSession.seekToFrame(selected.frameIndex);
                  emit({ type: "snapshot-updated", snapshot });
                } catch (err) {
                  emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
                }
              }
            ]];
          }
        }
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }

      // Pin first observation at current frame
      if (msg.key === "P") {
        const obs = currentSession.snapshot.observations[0];
        if (obs !== undefined) {
          const pinned = currentSession.pin(obs.observationId);
          const label = pinned !== null ? pinned.emission.effectKind : "observation";
          pm = { ...pm, error: `Pinned: ${label} at frame ${currentSession.snapshot.frame.frameIndex.toString()}` };
        } else {
          pm = { ...pm, error: "Nothing to pin — no observations at this frame" };
        }
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }

      // Unpin most recent pin
      if (msg.key === "u") {
        const lastPin = currentSession.pins[currentSession.pins.length - 1];
        if (lastPin !== undefined) {
          currentSession.unpin(lastPin.observation.observationId);
          pm = { ...pm, error: `Unpinned: ${lastPin.emission.effectKind} from frame ${lastPin.pinnedAt.toString()}` };
        } else {
          pm = { ...pm, error: "No pins to remove" };
        }
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }
    }

    return [nextModel, fCmds];
  },

  view: (model: any) => framedApp.view(model)
};

run(mainApp).then(
  () => process.exit(0),
  // eslint-disable-next-line @typescript-eslint/no-restricted-types -- unknown is correct for catch callbacks
  (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  }
);

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
  vstack
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
import { renderDagShader } from "./shaders/dagShader.ts";
import { resolveAdapter } from "../app/adapterRegistry.ts";
import type { AdapterConfig } from "../app/adapterRegistry.ts";
import type { TtdHostAdapter } from "../adapter.ts";
import type {
  DeliveryObservationSummary,
  EffectEmissionSummary,
  ExecutionContext,
  HostHello,
  LaneCatalog,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "../protocol.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Msg =
  | { type: "quit" }
  | { type: "pulse"; dt: number }
  | { type: "select-adapter"; adapter: TtdHostAdapter; defaultHeadId: string; generation: number }
  | { type: "adapter-ready"; hello: HostHello; catalog: LaneCatalog; head: PlaybackHeadSnapshot; frame: PlaybackFrame; receipts: ReceiptSummary[]; emissions: EffectEmissionSummary[]; observations: DeliveryObservationSummary[]; execCtx: ExecutionContext; generation: number }
  | { type: "step-result"; head: PlaybackHeadSnapshot; frame: PlaybackFrame; receipts: ReceiptSummary[]; emissions: EffectEmissionSummary[]; observations: DeliveryObservationSummary[] }
  | { type: "frame-result"; frame: PlaybackFrame; receipts: ReceiptSummary[]; emissions: EffectEmissionSummary[]; observations: DeliveryObservationSummary[] }
  | { type: "connect-error"; message: string }
  | { type: "disconnect" }
  | { type: "nav"; direction: "next" | "prev" }
  | { type: "step-forward" }
  | { type: "go-to-frame"; frameIndex: number }
  | { type: "input-char"; char: string }
  | { type: "input-delete" }
  | { type: "confirm-input" };

interface Model {
  time: number;
  adapter: TtdHostAdapter | null;
  defaultHeadId: string;
  hello: HostHello | null;
  catalog: LaneCatalog | null;
  head: PlaybackHeadSnapshot | null;
  frame: PlaybackFrame | null;
  receipts: ReceiptSummary[];
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
  execCtx: ExecutionContext | null;
  // Connection wizard state
  connectStep: "choose" | "input-path" | "input-graph";
  connectChoice: number;
  inputValue: string;
  repoPath: string;
  error: string | null;
  connectGeneration: number;
  // Jump-to-tick prompt state
  jumpInput: string | null;
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

  if (model.adapter) {
    const info = vstack(
      surfaceToString(badge("CONNECTED", { variant: "success", ctx }), ctx.style),
      "",
      ` Host: ${model.hello?.hostKind ?? "unknown"}`,
      ` Protocol: ${model.hello?.protocolVersion ?? "?"}`,
      ` Lanes: ${model.catalog?.lanes.length ?? 0}`,
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
  if (!model.adapter || !model.frame || !model.head) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Navigator");
  }

  const final = createSurface(w, h);
  final.fill({ char: " " });

  // DAG shader
  const dag = renderDagShader(w - 4, 8, model.time);
  const dagBox = boxSurface(dag, { title: " Causal Provenance ", width: w - 2, ctx });
  final.blit(dagBox, 1, 1);

  // Frame info
  const lanes = model.frame.lanes
    .map((l) => {
      const changed = l.changed ? ctx.style.styled(ctx.status("warning"), "*") : " ";
      return `  ${changed} ${l.laneId.padEnd(16)} tick ${l.coordinate.tick}`;
    })
    .join("\n");

  const frameInfo = vstack(
    ` Frame ${model.frame.frameIndex} / ${model.head.label}`,
    "",
    lanes,
    "",
    ` Receipts: ${model.receipts.length}`
  );
  const infoSurf = stringToSurface(frameInfo, w - 4, frameInfo.split("\n").length);
  const infoBox = boxSurface(infoSurf, { title: " Playback Head ", width: w - 2, ctx });
  final.blit(infoBox, 1, dagBox.height + 2);

  // Receipt summaries
  const receiptLines = model.receipts.length > 0
    ? model.receipts.map((r) =>
        `  ${r.laneId.padEnd(16)} +${r.admittedRewriteCount} -${r.rejectedRewriteCount} ~${r.counterfactualCount}`
      ).join("\n")
    : "  (none at this frame)";

  const receiptStr = vstack(receiptLines);
  const receiptSurf = stringToSurface(receiptStr, w - 4, receiptStr.split("\n").length);
  const receiptBox = boxSurface(receiptSurf, { title: " Receipts ", width: w - 2, ctx });
  final.blit(receiptBox, 1, dagBox.height + infoBox.height + 3);

  // Effect emissions + delivery observations
  let yOffset = dagBox.height + infoBox.height + receiptBox.height + 4;

  if (model.observations.length > 0) {
    const statusLabel = (outcome: string): string => {
      if (outcome === "delivered") return ctx.style.styled(ctx.status("success"), "delivered ");
      if (outcome === "suppressed") return ctx.style.styled(ctx.status("warning"), "suppressed");
      if (outcome === "failed") return ctx.style.styled(ctx.status("error"), "failed    ");
      return "skipped   ";
    };

    const header = `  ${"Effect".padEnd(14)} ${"Lane".padEnd(16)} ${"Sink".padEnd(14)} Status`;
    const separator = `  ${"─".repeat(14)} ${"─".repeat(16)} ${"─".repeat(14)} ${"─".repeat(10)}`;

    const rows = model.observations.map((o) => {
      const emission = model.emissions.find((e) => e.emissionId === o.emissionId);
      const kind = emission !== undefined ? emission.effectKind : "?";
      const lane = emission !== undefined ? emission.laneId : "?";
      const sink = o.sinkId.replace("sink:", "");
      return `  ${kind.padEnd(14)} ${lane.padEnd(16)} ${sink.padEnd(14)} ${statusLabel(o.outcome)}`;
    }).join("\n");

    const modeLabel = model.execCtx !== null ? ` [${model.execCtx.mode}]` : "";
    const tableStr = vstack(header, separator, rows);
    const tableSurf = stringToSurface(tableStr, w - 4, tableStr.split("\n").length);
    const tableBox = boxSurface(tableSurf, { title: ` Effects${modeLabel} `, width: w - 2, ctx });
    final.blit(tableBox, 1, yOffset);
  }

  // Controls / jump prompt
  const controlText = model.jumpInput !== null
    ? ` Jump to tick: ${model.jumpInput}_  [Enter] Go  [Esc] Cancel`
    : " [n/\u2192] Fwd  [p/\u2190] Back  [g] Jump to tick  [d] Disconnect";
  const controlSurf = stringToSurface(controlText, w - 2, 1);
  final.blit(controlSurf, 1, h - 2);

  return final;
}

function inspectorLayout(model: Model, w: number, h: number): Surface {
  if (!model.adapter || !model.frame || !model.head || !model.hello) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Inspector");
  }

  const final = createSurface(w, h);
  final.fill({ char: " " });

  // Host info
  const hostInfo = vstack(
    ` Host Kind:    ${model.hello.hostKind}`,
    ` Version:      ${model.hello.hostVersion}`,
    ` Protocol:     ${model.hello.protocolVersion}`,
    ` Schema:       ${model.hello.schemaId}`,
    ` Capabilities: ${model.hello.capabilities.length}`
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
  if (model.receipts.length > 0) {
    const detailLines = model.receipts.map((r) =>
      vstack(
        `  ${r.receiptId}`,
        `    Lane: ${r.laneId}  Tick: ${r.inputTick} -> ${r.outputTick}`,
        `    Admitted: ${r.admittedRewriteCount}  Rejected: ${r.rejectedRewriteCount}  Counterfactual: ${r.counterfactualCount}`,
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
// Connect helper — extracted to avoid duplicating async connect logic
// ---------------------------------------------------------------------------

function makeConnectCmd(
  config: AdapterConfig,
  gen: number
): (emit: (msg: Msg) => void) => Promise<void> {
  return async (emit: (msg: Msg) => void): Promise<void> => {
    try {
      const { adapter, defaultHeadId } = await resolveAdapter(config);
      emit({ type: "select-adapter", adapter, defaultHeadId, generation: gen });
      const hello = await adapter.hello();
      const catalog = await adapter.laneCatalog();
      const head = await adapter.playbackHead(defaultHeadId);
      const frame = await adapter.frame(defaultHeadId);
      const receipts = await adapter.receipts(defaultHeadId);
      const emissions = await adapter.effectEmissions(defaultHeadId);
      const observations = await adapter.deliveryObservations(defaultHeadId);
      const execCtx = await adapter.executionContext();
      emit({ type: "adapter-ready", hello, catalog, head, frame, receipts, emissions, observations, execCtx, generation: gen });
    } catch (err) {
      emit({ type: "connect-error", message: err instanceof Error ? err.message : String(err) });
    }
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const initialModel: Model = {
  time: 0,
  adapter: null,
  defaultHeadId: "",
  hello: null,
  catalog: null,
  head: null,
  frame: null,
  receipts: [],
  emissions: [],
  observations: [],
  execCtx: null,
  connectStep: "choose",
  connectChoice: 0,
  inputValue: process.cwd(),
  repoPath: "",
  error: null,
  connectGeneration: 0,
  jumpInput: null
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
    if (msg.type === "disconnect" && pm.adapter) {
      pm = {
        ...pm,
        adapter: null,
        hello: null,
        catalog: null,
        head: null,
        frame: null,
        receipts: [],
        connectStep: "choose",
        connectChoice: 0
      };
      nextModel = { ...nextModel, activePageId: "connect", pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Connect error ---
    if (msg.type === "connect-error") {
      pm = { ...pm, adapter: null, error: msg.message, connectStep: "choose" };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Adapter ready (guard against stale async results) ---
    if (msg.type === "adapter-ready") {
      if (msg.generation !== pm.connectGeneration) return [nextModel, fCmds];
      pm = {
        ...pm,
        adapter: pm.adapter,
        hello: msg.hello,
        catalog: msg.catalog,
        head: msg.head,
        frame: msg.frame,
        receipts: msg.receipts,
        emissions: msg.emissions,
        observations: msg.observations,
        execCtx: msg.execCtx
      };
      nextModel = { ...nextModel, activePageId: "nav", pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Step result ---
    if (msg.type === "step-result") {
      pm = { ...pm, head: msg.head, frame: msg.frame, receipts: msg.receipts, emissions: msg.emissions, observations: msg.observations };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Frame result ---
    if (msg.type === "frame-result") {
      pm = { ...pm, frame: msg.frame, receipts: msg.receipts, emissions: msg.emissions, observations: msg.observations };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    // --- Connection wizard keyboard handling ---
    if (!pm.adapter && isKeyMsg(msg)) {
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
            pm = { ...pm, connectGeneration: gen };
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
          pm = { ...pm, connectGeneration: gen };
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

    // --- Navigator keyboard handling ---
    if (pm.adapter !== null && isKeyMsg(msg)) {
      const headId = pm.defaultHeadId;
      const currentAdapter = pm.adapter;

      if (msg.key === "n" || msg.key === "right") {
        // Step forward
        const adapter = currentAdapter;
        return [nextModel, [
          ...fCmds,
          async (emit: (msg: Msg) => void) => {
            try {
              const frame = await adapter.stepForward(headId);
              const head = await adapter.playbackHead(headId);
              const receipts = await adapter.receipts(headId, frame.frameIndex);
              const emissions = await adapter.effectEmissions(headId, frame.frameIndex);
              const observations = await adapter.deliveryObservations(headId, frame.frameIndex);
              emit({ type: "step-result", head, frame, receipts, emissions, observations });
            } catch (err) {
              emit({ type: "connect-error", message: err instanceof Error ? err.message : String(err) });
            }
          }
        ]];
      }

      if (msg.key === "p" || msg.key === "left") {
        // Step backward
        const adapter = currentAdapter;
        return [nextModel, [
          ...fCmds,
          async (emit: (msg: Msg) => void) => {
            try {
              const frame = await adapter.stepBackward(headId);
              const head = await adapter.playbackHead(headId);
              const receipts = await adapter.receipts(headId, frame.frameIndex);
              const emissions = await adapter.effectEmissions(headId, frame.frameIndex);
              const observations = await adapter.deliveryObservations(headId, frame.frameIndex);
              emit({ type: "step-result", head, frame, receipts, emissions, observations });
            } catch (err) {
              emit({ type: "connect-error", message: err instanceof Error ? err.message : String(err) });
            }
          }
        ]];
      }

      // Jump-to-tick mode
      if (pm.jumpInput !== null) {
        if (msg.key === "escape") {
          pm = { ...pm, jumpInput: null };
        } else if (msg.key === "enter") {
          const tickIndex = parseInt(pm.jumpInput, 10);
          pm = { ...pm, jumpInput: null };
          if (!Number.isNaN(tickIndex)) {
            const adapter = currentAdapter;
            nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
            return [nextModel, [
              ...fCmds,
              async (emit: (msg: Msg) => void) => {
                try {
                  const frame = await adapter.seekToFrame(headId, tickIndex);
                  const head = await adapter.playbackHead(headId);
                  const receipts = await adapter.receipts(headId, frame.frameIndex);
                  const emissions = await adapter.effectEmissions(headId, frame.frameIndex);
                  const observations = await adapter.deliveryObservations(headId, frame.frameIndex);
                  emit({ type: "step-result", head, frame, receipts, emissions, observations });
                } catch (err) {
                  emit({ type: "connect-error", message: err instanceof Error ? err.message : String(err) });
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

      if (msg.key === "g") {
        pm = { ...pm, jumpInput: "" };
        nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
        return [nextModel, fCmds];
      }
    }

    // --- select-adapter (set adapter on model after async connect) ---
    if (msg.type === "select-adapter") {
      if (msg.generation !== pm.connectGeneration) return [nextModel, fCmds];
      pm = { ...pm, adapter: msg.adapter, defaultHeadId: msg.defaultHeadId };
      nextModel = { ...nextModel, pageModels: updateAllPages(pm) };
      return [nextModel, fCmds];
    }

    return [nextModel, fCmds];
  },

  view: (model: any) => framedApp.view(model)
};

run(mainApp).then(
  () => process.exit(0),
  (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  }
);

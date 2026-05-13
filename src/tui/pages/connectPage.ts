/**
 * Connect page — adapter selection wizard.
 */
import {
  createKeyMap,
  vstack,
} from "@flyingrobots/bijou-tui";
import {
  stringToSurface,
  badge,
  surfaceToString,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { resolveAdapter } from "../../app/adapterRegistry.ts";
import type { AdapterConfig } from "../../app/adapterRegistry.ts";
import { DebuggerSession } from "../../app/debuggerSession.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface ConnectModel {
  time: number;
  step: "choose" | "input-path" | "input-graph";
  choice: number;
  inputValue: string;
  repoPath: string;
  error: string | null;
  generation: number;
  connecting: boolean;
  sessionCtx: SessionContext | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type ConnectMsg =
  | { type: "pulse"; dt: number }
  | { type: "up" }
  | { type: "down" }
  | { type: "select" }
  | { type: "back" }
  | { type: "char"; key: string }
  | { type: "backspace" }
  | { type: "disconnect" }
  | { type: "session-ready"; ctx: SessionContext; generation: number }
  | { type: "connect-error"; message: string; generation: number };

type ConnectCommand = (emit: (msg: ConnectMsg) => void) => Promise<void>;
type ConnectUpdateResult = [ConnectModel, ConnectCommand[]];
type ConnectKeyMap = ReturnType<typeof createKeyMap<ConnectMsg>>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONNECT_OPTIONS = [
  "Echo Fixture (built-in demo data)",
  "git-warp (local repository)",
  "Scenario: Live with Effects",
  "Scenario: Replay with Suppression",
  "Scenario: Multi-Writer Conflicts",
  "Scenario: Complex Worldline (200+ ticks)",
];

const SCENARIO_CONFIGS: Record<number, AdapterConfig | "git-warp-wizard"> = {
  0: { kind: "echo-fixture" },
  1: "git-warp-wizard",
  2: { kind: "scenario", scenario: "live-with-effects" },
  3: { kind: "scenario", scenario: "replay-with-suppression" },
  4: { kind: "scenario", scenario: "multi-writer-conflicts" },
  5: { kind: "scenario", scenario: "complex-worldline" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConnectCmd(
  config: AdapterConfig,
  gen: number,
): ConnectCommand {
  return async (emit): Promise<void> => {
    try {
      const { adapter, defaultHeadId } = await resolveAdapter(config);
      const session = await DebuggerSession.create(adapter, defaultHeadId);
      await session.seekToFrame(Number.MAX_SAFE_INTEGER);
      const hello = await adapter.hello();
      const catalog = await adapter.laneCatalog();
      emit({ type: "session-ready", ctx: { session, hello, catalog }, generation: gen });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "connect-error", message, generation: gen });
    }
  };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function selectConfig(model: ConnectModel): ConnectUpdateResult {
  const selected = SCENARIO_CONFIGS[model.choice];

  if (selected === "git-warp-wizard") {
    return [{ ...model, step: "input-path", inputValue: process.cwd() }, []];
  }

  if (selected === undefined) return [model, []];

  const gen = model.generation + 1;
  return [{ ...model, generation: gen, connecting: true }, [makeConnectCmd(selected, gen)]];
}

function updateChoose(
  msg: ConnectMsg,
  model: ConnectModel,
): ConnectUpdateResult {
  if (msg.type === "down") {
    return [{ ...model, choice: Math.min(model.choice + 1, CONNECT_OPTIONS.length - 1) }, []];
  }
  if (msg.type === "up") {
    return [{ ...model, choice: Math.max(model.choice - 1, 0) }, []];
  }
  if (msg.type === "select") {
    return selectConfig(model);
  }
  return [model, []];
}

function updateTextInput(
  msg: ConnectMsg,
  model: ConnectModel,
): ConnectModel {
  if (msg.type === "backspace") return { ...model, inputValue: model.inputValue.slice(0, -1) };
  if (msg.type === "char") return { ...model, inputValue: model.inputValue + msg.key };
  return model;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface RenderConnectArgs {
  model: ConnectModel;
  w: number;
  h: number;
  ctx: BijouContext;
}

function renderConnected(model: ConnectModel, bg: Surface, ctx: BijouContext): Surface {
  const sessionCtx = model.sessionCtx;
  if (sessionCtx === null) return bg;
  const info = vstack(
    surfaceToString(badge("CONNECTED", { variant: "success", ctx }), ctx.style),
    "",
    ` Host: ${sessionCtx.hello.hostKind}`,
    ` Protocol: ${sessionCtx.hello.protocolVersion}`,
    ` Lanes: ${sessionCtx.catalog.lanes.length.toString()}`,
    ` Session: ${sessionCtx.session.sessionId.slice(0, 8)}`,
    "",
    " Use [ / ] to switch pages.",
    " Press [d] to disconnect.",
  );

  return centerBox({
    bg,
    content: stringToSurface(info, 56, info.split("\n").length),
    title: "Status",
    ctx
  });
}

function renderChoose(model: ConnectModel, bg: Surface, ctx: BijouContext): Surface {
  const items = CONNECT_OPTIONS.map((label, i) =>
    i === model.choice
      ? ctx.style.styled(ctx.semantic("primary"), ` > ${label}`)
      : `   ${label}`,
  ).join("\n");
  const errorLine = model.error !== null
    ? vstack("", ctx.style.styled(ctx.status("error"), ` Error: ${model.error}`))
    : "";
  const content = vstack(" Choose a host adapter:", "", items, "", " [Enter] Select  [q] Quit", errorLine);

  return centerBox({
    bg,
    content: stringToSurface(content, 56, content.split("\n").length),
    title: "Connect",
    ctx
  });
}

function renderInput(model: ConnectModel, bg: Surface, ctx: BijouContext): Surface {
  const label = model.step === "input-path" ? "Repository Path" : "Graph Name";
  const prompt = model.step === "input-path" ? "Enter repository path:" : "Enter graph name:";
  const content = vstack(` ${prompt}`, "", ` > ${model.inputValue}_`, "", " [Enter] Confirm  [Esc] Back");

  return centerBox({
    bg,
    content: stringToSurface(content, 56, content.split("\n").length),
    title: label,
    ctx
  });
}

function renderConnect(args: RenderConnectArgs): Surface {
  const { model, w, h, ctx } = args;
  const bg = renderWaveShader(w, h, model.time);

  if (model.sessionCtx !== null) {
    return renderConnected(model, bg, ctx);
  }

  if (model.step === "choose") {
    return renderChoose(model, bg, ctx);
  }

  return renderInput(model, bg, ctx);
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

function initialConnectModel(): ConnectModel {
  return {
    time: 0,
    step: "choose",
    choice: 0,
    inputValue: process.cwd(),
    repoPath: "",
    error: null,
    generation: 0,
    connecting: false,
    sessionCtx: null,
  };
}

function connectKeyMap(): ConnectKeyMap {
  return createKeyMap<ConnectMsg>()
    .bind("up", "Previous", { type: "up" })
    .bind("k", "Previous", { type: "up" })
    .bind("down", "Next", { type: "down" })
    .bind("j", "Next", { type: "down" })
    .bind("enter", "Select", { type: "select" })
    .bind("escape", "Back", { type: "back" })
    .bind("backspace", "Delete", { type: "backspace" })
    .bind("d", "Disconnect", { type: "disconnect" });
}

function handleConnectionResult(msg: ConnectMsg, model: ConnectModel): ConnectUpdateResult {
  if (msg.type === "session-ready" && msg.generation === model.generation) {
    return [{ ...model, connecting: false, sessionCtx: msg.ctx }, []];
  }
  if (msg.type === "connect-error" && msg.generation === model.generation) {
    return [{ ...model, connecting: false, error: msg.message, step: "choose" }, []];
  }
  return [model, []];
}

function handleBack(model: ConnectModel): ConnectUpdateResult {
  if (model.step === "input-graph") {
    return [{ ...model, step: "input-path", inputValue: model.repoPath }, []];
  }
  return [{ ...model, step: "choose" }, []];
}

function handleInputSelect(model: ConnectModel): ConnectUpdateResult {
  if (model.step === "input-path" && model.inputValue.trim().length === 0) {
    return [{ ...model, error: "Repository path cannot be empty" }, []];
  }
  if (model.step === "input-path") {
    return [{ ...model, repoPath: model.inputValue, step: "input-graph", inputValue: "default", error: null }, []];
  }
  const gen = model.generation + 1;
  const config: AdapterConfig = { kind: "git-warp", repoPath: model.repoPath, graphName: model.inputValue };
  return [{ ...model, generation: gen, connecting: true }, [makeConnectCmd(config, gen)]];
}

function updateInputStep(msg: ConnectMsg, model: ConnectModel): ConnectUpdateResult {
  if (msg.type === "back") return handleBack(model);
  if (msg.type === "select") return handleInputSelect(model);
  return [updateTextInput(msg, model), []];
}

function updateConnectGlobal(
  msg: ConnectMsg,
  model: ConnectModel
): ConnectUpdateResult | null {
  if (msg.type === "pulse") return [{ ...model, time: model.time + msg.dt }, []];
  if (msg.type === "session-ready" || msg.type === "connect-error") {
    return handleConnectionResult(msg, model);
  }
  if (msg.type === "disconnect") return [{ ...initialConnectModel(), time: model.time }, []];
  return null;
}

function updateConnect(msg: ConnectMsg, model: ConnectModel): ConnectUpdateResult {
  const global = updateConnectGlobal(msg, model);
  if (global !== null) return global;
  if (model.sessionCtx !== null) return [model, []];
  if (model.step === "choose") return updateChoose(msg, model);
  return updateInputStep(msg, model);
}

function updateConnectPage(msg: ConnectMsg, model: ConnectModel): ConnectUpdateResult {
  if (!isPageMsg(msg)) return [model, []];

  return updateConnect(msg, model);
}

function connectLayout(
  ctx: BijouContext
): FramePage<ConnectModel, ConnectMsg>["layout"] {
  return (model) => ({
    kind: "pane" as const,
    paneId: "main",
    render: (w: number, h: number) => renderConnect({ model, w, h, ctx }),
  });
}

export function connectPage(ctx: BijouContext): FramePage<ConnectModel, ConnectMsg> {
  return {
    id: "connect",
    title: "Connect",
    init: () => [initialConnectModel(), []],
    keyMap: connectKeyMap(),
    update: updateConnectPage,
    layout: connectLayout(ctx),
  };
}

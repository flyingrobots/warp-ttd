/**
 * Connect page — adapter selection wizard.
 */
import {
  createKeyMap,
  vstack,
} from "@flyingrobots/bijou-tui";
import {
  stringToSurface,
  boxSurface,
  badge,
  surfaceToString,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { resolveAdapter } from "../../app/adapterRegistry.ts";
import type { AdapterConfig } from "../../app/adapterRegistry.ts";
import { DebuggerSession } from "../../app/debuggerSession.ts";
import type { SessionContext } from "./shared.ts";

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
): (emit: (msg: ConnectMsg) => void) => Promise<void> {
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

function centerBox(bg: Surface, content: Surface, title: string, ctx: BijouContext): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function updateChoose(
  msg: ConnectMsg,
  model: ConnectModel,
): [ConnectModel, ((emit: (msg: ConnectMsg) => void) => Promise<void>)[]] {
  if (msg.type === "down") {
    return [{ ...model, choice: Math.min(model.choice + 1, CONNECT_OPTIONS.length - 1) }, []];
  }
  if (msg.type === "up") {
    return [{ ...model, choice: Math.max(model.choice - 1, 0) }, []];
  }
  if (msg.type === "select") {
    const selected = SCENARIO_CONFIGS[model.choice];
    if (selected === "git-warp-wizard") {
      return [{ ...model, step: "input-path", inputValue: process.cwd() }, []];
    }
    if (selected !== undefined) {
      const gen = model.generation + 1;
      return [{ ...model, generation: gen, connecting: true }, [makeConnectCmd(selected, gen)]];
    }
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

function renderConnect(model: ConnectModel, w: number, h: number, ctx: BijouContext): Surface {
  const bg = renderWaveShader(w, h, model.time);

  if (model.sessionCtx !== null) {
    const info = vstack(
      surfaceToString(badge("CONNECTED", { variant: "success", ctx }), ctx.style),
      "",
      ` Host: ${model.sessionCtx.hello.hostKind}`,
      ` Protocol: ${model.sessionCtx.hello.protocolVersion}`,
      ` Lanes: ${model.sessionCtx.catalog.lanes.length.toString()}`,
      ` Session: ${model.sessionCtx.session.sessionId.slice(0, 8)}`,
      "",
      " Use [ / ] to switch pages.",
      " Press [d] to disconnect.",
    );
    return centerBox(bg, stringToSurface(info, 56, info.split("\n").length), "Status", ctx);
  }

  if (model.step === "choose") {
    const items = CONNECT_OPTIONS.map((label, i) =>
      i === model.choice
        ? ctx.style.styled(ctx.semantic("primary"), ` > ${label}`)
        : `   ${label}`,
    ).join("\n");
    const errorLine = model.error !== null
      ? vstack("", ctx.style.styled(ctx.status("error"), ` Error: ${model.error}`))
      : "";
    const content = vstack(" Choose a host adapter:", "", items, "", " [Enter] Select  [q] Quit", errorLine);
    return centerBox(bg, stringToSurface(content, 56, content.split("\n").length), "Connect", ctx);
  }

  const label = model.step === "input-path" ? "Repository Path" : "Graph Name";
  const prompt = model.step === "input-path" ? "Enter repository path:" : "Enter graph name:";
  const content = vstack(` ${prompt}`, "", ` > ${model.inputValue}_`, "", " [Enter] Confirm  [Esc] Back");
  return centerBox(bg, stringToSurface(content, 56, content.split("\n").length), label, ctx);
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function connectPage(ctx: BijouContext): FramePage<ConnectModel, ConnectMsg> {
  const initial: ConnectModel = {
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

  return {
    id: "connect",
    title: "Connect",
    init: () => [initial, []],

    keyMap: createKeyMap<ConnectMsg>()
      .bind("up", "Previous", { type: "up" })
      .bind("k", "Previous", { type: "up" })
      .bind("down", "Next", { type: "down" })
      .bind("j", "Next", { type: "down" })
      .bind("enter", "Select", { type: "select" })
      .bind("escape", "Back", { type: "back" })
      .bind("backspace", "Delete", { type: "backspace" })
      .bind("d", "Disconnect", { type: "disconnect" }),

    update: (msg, model) => {
      const m = msg as ConnectMsg;

      if (m.type === "pulse") {
        return [{ ...model, time: model.time + m.dt }, []];
      }

      if (m.type === "session-ready") {
        if (m.generation !== model.generation) return [model, []];
        return [{ ...model, connecting: false, sessionCtx: m.ctx }, []];
      }

      if (m.type === "connect-error") {
        if (m.generation !== model.generation) return [model, []];
        return [{ ...model, connecting: false, error: m.message, step: "choose" }, []];
      }

      if (m.type === "disconnect") {
        return [{ ...initial, time: model.time }, []];
      }

      if (model.sessionCtx !== null) return [model, []];

      if (model.step === "choose") return updateChoose(m, model);

      if (m.type === "back") {
        if (model.step === "input-graph") {
          return [{ ...model, step: "input-path", inputValue: model.repoPath }, []];
        }
        return [{ ...model, step: "choose" }, []];
      }

      if (m.type === "select" && model.step === "input-path") {
        if (model.inputValue.trim().length === 0) {
          return [{ ...model, error: "Repository path cannot be empty" }, []];
        }
        return [{ ...model, repoPath: model.inputValue, step: "input-graph", inputValue: "default", error: null }, []];
      }

      if (m.type === "select" && model.step === "input-graph") {
        const gen = model.generation + 1;
        const config: AdapterConfig = { kind: "git-warp", repoPath: model.repoPath, graphName: model.inputValue };
        return [{ ...model, generation: gen, connecting: true }, [makeConnectCmd(config, gen)]];
      }

      return [updateTextInput(m, model), []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderConnect(model, w, h, ctx),
    }),
  };
}

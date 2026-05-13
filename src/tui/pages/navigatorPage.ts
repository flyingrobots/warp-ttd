/**
 * Navigator page — step through frames, view lanes and receipts.
 */
import {
  createKeyMap,
} from "@flyingrobots/bijou-tui";
import {
  stringToSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { renderNavigator } from "../navigatorLayout.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface NavigatorModel {
  time: number;
  sessionCtx: SessionContext | null;
  jumpInput: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type NavigatorMsg =
  | { type: "pulse"; dt: number }
  | { type: "step-forward" }
  | { type: "step-backward" }
  | { type: "jump-start" }
  | { type: "jump-digit"; key: string }
  | { type: "jump-confirm" }
  | { type: "jump-cancel" }
  | { type: "pin" }
  | { type: "unpin" }
  | { type: "snapshot-updated" }
  | { type: "nav-error"; message: string }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" };

type NavigatorCommand = (emit: (msg: NavigatorMsg) => void) => Promise<void>;
type NavigatorAction = () => Promise<object>;
type NavigatorUpdateResult = [NavigatorModel, NavigatorCommand[]];
type NavigatorKeyMap = ReturnType<typeof createKeyMap<NavigatorMsg>>;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface RenderNavArgs {
  model: NavigatorModel;
  w: number;
  h: number;
  ctx: BijouContext;
}

function renderNav(args: RenderNavArgs): Surface {
  const { model, w, h, ctx } = args;

  if (model.sessionCtx === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox({
      bg,
      content: stringToSurface(" Connect to a host first.", 40, 1),
      title: "Navigator",
      ctx
    });
  }

  return renderNavigator({
    snap: model.sessionCtx.session.snapshot,
    caps: model.sessionCtx.hello.capabilities,
    catalog: model.sessionCtx.catalog.lanes,
    pins: model.sessionCtx.session.pins,
    error: model.error,
    jumpInput: model.jumpInput,
    w, h, ctx,
  });
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

function initialNavigatorModel(): NavigatorModel {
  return {
    time: 0,
    sessionCtx: null,
    jumpInput: null,
    error: null,
  };
}

function navigatorKeyMap(): NavigatorKeyMap {
  return createKeyMap<NavigatorMsg>()
    .bind("n", "Step forward", { type: "step-forward" })
    .bind("right", "Step forward", { type: "step-forward" })
    .bind("p", "Step backward", { type: "step-backward" })
    .bind("left", "Step backward", { type: "step-backward" })
    .bind("g", "Jump to frame", { type: "jump-start" })
    .bind("P", "Pin observation", { type: "pin" })
    .bind("u", "Unpin", { type: "unpin" });
}

type NavigatorModalKeyMap = ReturnType<
  NonNullable<FramePage<NavigatorModel, NavigatorMsg>["modalKeyMap"]>
>;

function navigatorModalKeyMap(model: NavigatorModel): NavigatorModalKeyMap {
  if (model.jumpInput === null) return undefined;

  const km = createKeyMap<NavigatorMsg>()
    .bind("escape", "Cancel", { type: "jump-cancel" })
    .bind("enter", "Confirm", { type: "jump-confirm" })
    .bind("backspace", "Delete", { type: "jump-cancel" });
  for (let d = 0; d <= 9; d++) {
    km.bind(String(d), `Digit ${String(d)}`, { type: "jump-digit", key: String(d) });
  }
  return km;
}

function navigationCommand(action: NavigatorAction): NavigatorCommand {
  return async (emit): Promise<void> => {
    try {
      await action();
      emit({ type: "snapshot-updated" });
    } catch (err) {
      emit({ type: "nav-error", message: err instanceof Error ? err.message : String(err) });
    }
  };
}

function confirmJump(model: NavigatorModel): NavigatorUpdateResult {
  const session = model.sessionCtx?.session;
  if (model.jumpInput === null || session === undefined) return [model, []];

  const frameIndex = parseInt(model.jumpInput, 10);
  const next = { ...model, jumpInput: null };
  if (Number.isNaN(frameIndex)) return [next, []];
  return [next, [navigationCommand(() => session.seekToFrame(frameIndex))]];
}

function updateJumpMode(msg: NavigatorMsg, model: NavigatorModel): NavigatorUpdateResult {
  if (msg.type === "jump-cancel") return [{ ...model, jumpInput: null }, []];
  if (msg.type === "jump-confirm") return confirmJump(model);
  if (msg.type !== "jump-digit" || model.jumpInput === null) return [model, []];

  return [{ ...model, jumpInput: model.jumpInput + msg.key }, []];
}

function pinFirstObservation(model: NavigatorModel): NavigatorUpdateResult {
  const session = model.sessionCtx?.session;

  if (session === undefined) {
    return [{ ...model, error: "Nothing to pin — no observations at this frame" }, []];
  }

  const obs = session.snapshot.observations[0];
  if (obs === undefined) {
    return [{ ...model, error: "Nothing to pin — no observations at this frame" }, []];
  }

  const pinned = session.pin(obs.observationId);
  const label = pinned !== null ? pinned.emission.effectKind : "observation";
  return [{ ...model, error: `Pinned: ${label} at frame ${session.snapshot.frame.frameIndex.toString()}` }, []];
}

function unpinLastObservation(model: NavigatorModel): NavigatorUpdateResult {
  const session = model.sessionCtx?.session;
  const lastPin = session?.pins[session.pins.length - 1];

  if (session === undefined || lastPin === undefined) {
    return [{ ...model, error: "No pins to remove" }, []];
  }

  session.unpin(lastPin.observation.observationId);
  return [{ ...model, error: `Unpinned: ${lastPin.emission.effectKind} from frame ${lastPin.pinnedAt.toString()}` }, []];
}

function navigationAction(
  msg: NavigatorMsg,
  session: NonNullable<NavigatorModel["sessionCtx"]>["session"]
): NavigatorCommand | null {
  if (msg.type === "step-forward") return navigationCommand(() => session.stepForward());
  if (msg.type === "step-backward") return navigationCommand(() => session.stepBackward());
  return null;
}

function updateNavigatorControl(
  msg: NavigatorMsg,
  model: NavigatorModel,
  session: NonNullable<NavigatorModel["sessionCtx"]>["session"]
): NavigatorUpdateResult | null {
  if (msg.type === "jump-start") return [{ ...model, jumpInput: "" }, []];
  const action = navigationAction(msg, session);
  if (action !== null) return [model, [action]];
  return null;
}

function updateNavigatorPins(
  msg: NavigatorMsg,
  model: NavigatorModel
): NavigatorUpdateResult | null {
  if (msg.type === "pin") return pinFirstObservation(model);
  if (msg.type === "unpin") return unpinLastObservation(model);
  return null;
}

function updateNavigatorNonJump(
  msg: NavigatorMsg,
  model: NavigatorModel,
  session: NonNullable<NavigatorModel["sessionCtx"]>["session"]
): NavigatorUpdateResult {
  const control = updateNavigatorControl(msg, model, session);
  if (control !== null) return control;
  return updateNavigatorPins(msg, model) ?? [model, []];
}

function updateConnectedNavigator(msg: NavigatorMsg, model: NavigatorModel): NavigatorUpdateResult {
  const session = model.sessionCtx?.session;
  if (session === undefined) return [model, []];
  if (model.jumpInput !== null) return updateJumpMode(msg, model);
  return updateNavigatorNonJump(msg, model, session);
}

function updateNavigatorStatus(
  msg: NavigatorMsg,
  model: NavigatorModel
): NavigatorUpdateResult | null {
  if (msg.type === "snapshot-updated") return [{ ...model, error: null }, []];
  if (msg.type === "nav-error") return [{ ...model, error: msg.message }, []];
  return null;
}

function updateNavigatorGlobal(
  msg: NavigatorMsg,
  model: NavigatorModel
): NavigatorUpdateResult | null {
  if (msg.type === "pulse") return [{ ...model, time: model.time + msg.dt }, []];
  if (msg.type === "session-ready") return [{ ...model, sessionCtx: msg.ctx, error: null }, []];
  if (msg.type === "disconnect") return [{ ...initialNavigatorModel(), time: model.time }, []];
  return updateNavigatorStatus(msg, model);
}

function updateNavigator(msg: NavigatorMsg, model: NavigatorModel): NavigatorUpdateResult {
  const global = updateNavigatorGlobal(msg, model);
  if (global !== null) return global;
  if (model.sessionCtx === null) return [model, []];
  return updateConnectedNavigator(msg, model);
}

function updateNavigatorPage(msg: NavigatorMsg, model: NavigatorModel): NavigatorUpdateResult {
  if (!isPageMsg(msg)) return [model, []];

  return updateNavigator(msg, model);
}

function navigatorLayout(ctx: BijouContext): FramePage<NavigatorModel, NavigatorMsg>["layout"] {
  return (model) => ({
    kind: "pane" as const,
    paneId: "main",
    render: (w: number, h: number) => renderNav({ model, w, h, ctx }),
  });
}

export function navigatorPage(ctx: BijouContext): FramePage<NavigatorModel, NavigatorMsg> {
  return {
    id: "nav",
    title: "Navigator",
    init: () => [initialNavigatorModel(), []],
    keyMap: navigatorKeyMap(),
    modalKeyMap: navigatorModalKeyMap,
    update: updateNavigatorPage,
    layout: navigatorLayout(ctx),
  };
}

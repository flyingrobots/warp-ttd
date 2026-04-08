/**
 * Inspector page — detailed frame and receipt breakdown.
 */
import {
  vstack,
} from "@flyingrobots/bijou-tui";
import {
  createSurface,
  stringToSurface,
  boxSurface,
} from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { FramePage } from "@flyingrobots/bijou-tui";
import { renderWaveShader } from "../shaders/bgShader.ts";
import { centerBox, isPageMsg, type SessionContext } from "./shared.ts";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface InspectorModel {
  time: number;
  sessionCtx: SessionContext | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type InspectorMsg =
  | { type: "pulse"; dt: number }
  | { type: "session-ready"; ctx: SessionContext }
  | { type: "disconnect" };

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function renderInspector(model: InspectorModel, w: number, h: number, ctx: BijouContext): Surface {
  if (model.sessionCtx === null) {
    const bg = renderWaveShader(w, h, model.time);
    return centerBox(bg, stringToSurface(" Connect to a host first.", 40, 1), "Inspector", ctx);
  }

  const { session, hello, catalog } = model.sessionCtx;
  const snap = session.snapshot;
  const final = createSurface(w, h);
  final.fill({ char: " " });

  const hostInfo = vstack(
    ` Host Kind:    ${hello.hostKind}`,
    ` Version:      ${hello.hostVersion}`,
    ` Protocol:     ${hello.protocolVersion}`,
    ` Schema:       ${hello.schemaId}`,
    ` Capabilities: ${hello.capabilities.length.toString()}`,
    ` Session:      ${session.sessionId.slice(0, 8)}`,
  );
  const hostSurf = stringToSurface(hostInfo, w - 4, hostInfo.split("\n").length);
  final.blit(boxSurface(hostSurf, { title: " Host ", width: w - 2, ctx }), 1, 1);

  const laneLines = catalog.lanes
    .map((l) => {
      const rw = l.writable ? "rw" : "ro";
      const parent = l.parentId !== undefined ? ` < ${l.parentId}` : "";
      return `  [${rw}] ${l.id.padEnd(16)} ${l.kind}${parent}`;
    })
    .join("\n");
  const laneSurf = stringToSurface(laneLines, w - 4, laneLines.split("\n").length);
  final.blit(boxSurface(laneSurf, { title: " Lanes ", width: w - 2, ctx }), 1, hostSurf.height + 3);

  if (snap.receipts.length > 0) {
    const detailLines = snap.receipts.map((r) =>
      vstack(
        `  ${r.receiptId}`,
        `    Lane: ${r.laneId}  Tick: ${r.inputTick.toString()} -> ${r.outputTick.toString()}`,
        `    Admitted: ${r.admittedRewriteCount.toString()}  Rejected: ${r.rejectedRewriteCount.toString()}  Counterfactual: ${r.counterfactualCount.toString()}`,
        `    ${r.summary}`,
      ),
    ).join("\n");
    const detailSurf = stringToSurface(detailLines, w - 4, detailLines.split("\n").length);
    final.blit(
      boxSurface(detailSurf, { title: " Receipt Detail ", width: w - 2, ctx }),
      1, hostSurf.height + laneSurf.height + 5,
    );
  }

  return final;
}

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export function inspectorPage(ctx: BijouContext): FramePage<InspectorModel, InspectorMsg> {
  const initial: InspectorModel = {
    time: 0,
    sessionCtx: null,
  };

  return {
    id: "inspect",
    title: "Inspector",
    init: () => [initial, []],

    update: (msg, model) => {
      if (!isPageMsg<InspectorMsg>(msg)) return [model, []];
      const m = msg;
      if (m.type === "pulse") return [{ ...model, time: model.time + m.dt }, []];
      if (m.type === "session-ready") return [{ ...model, sessionCtx: m.ctx }, []];
      return [{ ...initial, time: model.time }, []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderInspector(model, w, h, ctx),
    }),
  };
}

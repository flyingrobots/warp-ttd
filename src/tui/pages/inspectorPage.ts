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
import type { SessionContext } from "./shared.ts";

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
// Helpers
// ---------------------------------------------------------------------------

function centerBox(bg: Surface, content: Surface, title: string, ctx: BijouContext): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

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
      const m = msg as InspectorMsg;
      if (m.type === "pulse") return [{ ...model, time: model.time + m.dt }, []];
      if (m.type === "session-ready") return [{ ...model, sessionCtx: m.ctx }, []];
      if (m.type === "disconnect") return [{ ...initial, time: model.time }, []];
      return [model, []];
    },

    layout: (model) => ({
      kind: "pane" as const,
      paneId: "main",
      render: (w: number, h: number) => renderInspector(model, w, h, ctx),
    }),
  };
}

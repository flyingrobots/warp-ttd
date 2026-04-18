import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildNeighborhoodState } from "../src/app/neighborhoodAssembler.ts";
import type { PlaybackFrame, ReceiptSummary, EffectEmissionSummary } from "../src/protocol.ts";

test("buildNeighborhoodState is a standalone assembler, not embedded in DebuggerSession", () => {
  const sessionSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "..", "src", "app", "debuggerSession.ts"),
    "utf-8"
  );
  assert.doesNotMatch(
    sessionSource,
    /NeighborhoodCoreSummary\.fromFrame/,
    "DebuggerSession must not call NeighborhoodCoreSummary.fromFrame directly — use the assembler"
  );
});

test("buildNeighborhoodState produces all four neighborhood summaries from protocol data", () => {
  const frame: PlaybackFrame = {
    headId: "head:test",
    frameIndex: 1,
    lanes: [{
      laneId: "wl:main",
      worldlineId: "wl:main",
      coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
      changed: true
    }]
  };

  const receipts: ReceiptSummary[] = [{
    receiptId: "receipt:1",
    headId: "head:test",
    frameIndex: 1,
    laneId: "wl:main",
    worldlineId: "wl:main",
    inputTick: 0,
    outputTick: 1,
    admittedRewriteCount: 1,
    rejectedRewriteCount: 0,
    counterfactualCount: 0,
    digest: "d1",
    summary: "test receipt"
  }];

  const emissions: EffectEmissionSummary[] = [];

  const state = buildNeighborhoodState(frame, receipts, emissions);

  assert.ok(state.neighborhoodCore);
  assert.ok(state.neighborhoodSites);
  assert.ok(state.reintegrationDetail);
  assert.ok(state.receiptShell);
  assert.equal(state.neighborhoodCore.outcome, "LAWFUL");
});

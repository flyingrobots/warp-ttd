/**
 * Complex scenario — stress test for the worldline viewer.
 *
 * 200+ ticks across 2 worldlines and 3 strands. Multiple writers
 * with contention patterns, long-lived strands, braided activity
 * (strands that go quiet then reactivate), and conflict hotspots.
 *
 * Topology:
 *   wl:alpha          — primary worldline, 200 ticks
 *   wl:beta           — secondary worldline, 150 ticks (starts at frame 50)
 *   strand:feature-a  — forks from alpha at tick 30, lives until tick 120
 *   strand:hotfix     — short-lived, forks at tick 80, dies at tick 95
 *   strand:long-lived — forks from alpha at tick 10, braided activity throughout
 *
 * Writers: alice, bob, carol, dave
 * Conflict hotspots: ticks 40-60 (alice vs bob contention on alpha)
 * Effect emissions: every 25th tick on alpha
 */
import { buildScenario } from "./scenarioFixtureAdapter.ts";
import type { TtdHostAdapter } from "../adapter.ts";
import type { DeliveryOutcome } from "../protocol.ts";

const WRITERS = ["alice", "bob", "carol", "dave"];

interface Receipt {
  laneId: string;
  writerId: string;
  admitted: number;
  rejected: number;
  counterfactual: number;
}

interface Emission {
  effectKind: string;
  laneId: string;
  deliveries: { sinkId: string; outcome: DeliveryOutcome; reason: string }[];
}

interface FrameSpec {
  tick: number;
  receipts: Receipt[];
  emissions: Emission[];
}

function pickWriter(tick: number): string {
  return WRITERS[tick % WRITERS.length] ?? "alice";
}

function isConflictZone(tick: number): boolean {
  return tick >= 40 && tick <= 60;
}

function alphaReceipts(tick: number): Receipt[] {
  const rejected = isConflictZone(tick) ? 1 + (tick % 3) : 0;
  const receipts: Receipt[] = [{
    laneId: "wl:alpha", writerId: pickWriter(tick),
    admitted: 1 + (tick % 2), rejected, counterfactual: rejected > 0 ? 1 : 0,
  }];
  if (isConflictZone(tick) && tick % 2 === 0) {
    receipts.push({ laneId: "wl:alpha", writerId: "bob", admitted: 1, rejected: 2, counterfactual: 1 });
  }
  return receipts;
}

function betaReceipts(tick: number): Receipt[] {
  if (tick < 50) return [];
  return [{ laneId: "wl:beta", writerId: tick % 3 === 0 ? "carol" : "dave", admitted: 1, rejected: 0, counterfactual: 0 }];
}

const LONG_LIVED_WINDOWS: [number, number][] = [[10, 40], [70, 90], [130, 160], [180, 200]];

function isLongLivedActive(tick: number): boolean {
  return LONG_LIVED_WINDOWS.some(([lo, hi]) => tick >= lo && tick <= hi);
}

function longLivedReceipts(tick: number): Receipt[] {
  if (!isLongLivedActive(tick) || tick % 3 !== 0) return [];
  return [{ laneId: "strand:long-lived", writerId: "carol", admitted: 1, rejected: 0, counterfactual: 0 }];
}

function featureAReceipts(tick: number): Receipt[] {
  if (tick < 30 || tick > 120 || tick % 4 !== 0) return [];
  return [{ laneId: "strand:feature-a", writerId: "alice", admitted: 2, rejected: tick > 100 ? 1 : 0, counterfactual: 0 }];
}

function hotfixReceipts(tick: number): Receipt[] {
  if (tick < 80 || tick > 95) return [];
  return [{ laneId: "strand:hotfix", writerId: "dave", admitted: 3, rejected: 0, counterfactual: 0 }];
}

function tickEmissions(tick: number): Emission[] {
  if (tick % 25 !== 0) return [];
  const kind = tick % 50 === 0 ? "checkpoint" : "diagnostic";
  const deliveries: Emission["deliveries"] = [{ sinkId: "sink:log", outcome: "DELIVERED", reason: "Periodic diagnostic." }];
  if (tick % 50 === 0) {
    deliveries.push({ sinkId: "sink:storage", outcome: "DELIVERED", reason: "Checkpoint persisted." });
  }
  return [{ effectKind: kind, laneId: "wl:alpha", deliveries }];
}

function buildFrames(): FrameSpec[] {
  const frames: FrameSpec[] = [];
  for (let tick = 1; tick <= 200; tick++) {
    frames.push({
      tick,
      receipts: [
        ...alphaReceipts(tick),
        ...betaReceipts(tick),
        ...longLivedReceipts(tick),
        ...featureAReceipts(tick),
        ...hotfixReceipts(tick),
      ],
      emissions: tickEmissions(tick),
    });
  }
  return frames;
}

export function scenarioComplexWorldline(): TtdHostAdapter {
  return buildScenario({
    hostKind: "GIT_WARP",
    executionMode: "LIVE",
    lanes: [
      { id: "wl:alpha", kind: "WORLDLINE", writable: false },
      { id: "wl:beta", kind: "WORLDLINE", writable: false },
      { id: "strand:long-lived", kind: "STRAND", writable: true, parentId: "wl:alpha" },
      { id: "strand:feature-a", kind: "STRAND", writable: true, parentId: "wl:alpha" },
      { id: "strand:hotfix", kind: "STRAND", writable: true, parentId: "wl:alpha" },
    ],
    frames: buildFrames(),
  });
}

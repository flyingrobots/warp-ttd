import type { TtdHostAdapter } from "../adapter.ts";
import {
  FrameResolutionError,
  NoFramesConfiguredError,
  UnknownHeadError
} from "../errors.ts";
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

interface FixtureState {
  readonly hello: HostHello;
  readonly catalog: LaneCatalog;
  readonly heads: Record<string, PlaybackHeadSnapshot>;
  readonly frames: Record<string, PlaybackFrame[]>;
  readonly receipts: Record<string, ReceiptSummary[]>;
  readonly effectEmissions: Record<string, EffectEmissionSummary[]>;
  readonly deliveryObservations: Record<string, DeliveryObservationSummary[]>;
  readonly executionContext: ExecutionContext;
}

const FIXTURE: FixtureState = {
  hello: {
    hostKind: "ECHO",
    hostVersion: "0.0.0-fixture",
    protocolVersion: "0.3.0",
    schemaId: "ttd-protocol-fixture-v1",
    capabilities: [
      "READ_HELLO",
      "READ_LANE_CATALOG",
      "READ_PLAYBACK_HEAD",
      "READ_FRAME",
      "READ_RECEIPTS",
      "READ_EFFECT_EMISSIONS",
      "READ_DELIVERY_OBSERVATIONS",
      "READ_EXECUTION_CONTEXT",
      "CONTROL_STEP_FORWARD",
      "CONTROL_STEP_BACKWARD",
      "CONTROL_SEEK"
    ]
  },
  catalog: {
    lanes: [
      {
        id: "wl:main",
        kind: "WORLDLINE",
        worldlineId: "wl:main",
        writable: false,
        description: "Canonical application worldline"
      },
      {
        id: "ws:sandbox",
        kind: "STRAND",
        worldlineId: "wl:main",
        parentId: "wl:main",
        writable: true,
        description: "Speculative child strand at frame 1"
      }
    ]
  },
  heads: {
    "head:main": {
      headId: "head:main",
      label: "Main Playback Head",
      currentFrameIndex: 0,
      trackedLaneIds: ["wl:main", "ws:sandbox"],
      writableLaneIds: ["ws:sandbox"],
      paused: true
    }
  },
  frames: {
    "head:main": [
      {
        headId: "head:main",
        frameIndex: 0,
        lanes: [
          {
            laneId: "wl:main",
            worldlineId: "wl:main",
            coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 0 },
            changed: false
          },
          {
            laneId: "ws:sandbox",
            worldlineId: "wl:main",
            coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 0 },
            changed: false
          }
        ]
      },
      {
        headId: "head:main",
        frameIndex: 1,
        lanes: [
          {
            laneId: "wl:main",
            worldlineId: "wl:main",
            coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
            changed: true,
            btrDigest: "btr:echo:main:0001"
          },
          {
            laneId: "ws:sandbox",
            worldlineId: "wl:main",
            coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 0 },
            changed: false
          }
        ]
      },
      {
        headId: "head:main",
        frameIndex: 2,
        lanes: [
          {
            laneId: "wl:main",
            worldlineId: "wl:main",
            coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
            changed: false
          },
          {
            laneId: "ws:sandbox",
            worldlineId: "wl:main",
            coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 },
            changed: true,
            btrDigest: "btr:echo:sandbox:0001"
          }
        ]
      }
    ]
  },
  receipts: {
    "head:main": [
      {
        receiptId: "receipt:echo:main:0001",
        headId: "head:main",
        frameIndex: 1,
        laneId: "wl:main",
        worldlineId: "wl:main",
        writerId: "echo-writer",
        inputTick: 0,
        outputTick: 1,
        admittedRewriteCount: 2,
        rejectedRewriteCount: 0,
        counterfactualCount: 0,
        digest: "rcpt:main:0001",
        summary: "Committed two independent rewrites on the canonical worldline."
      },
      {
        receiptId: "receipt:echo:sandbox:0001",
        headId: "head:main",
        frameIndex: 2,
        laneId: "ws:sandbox",
        worldlineId: "wl:main",
        writerId: "sandbox-writer",
        inputTick: 0,
        outputTick: 1,
        admittedRewriteCount: 1,
        rejectedRewriteCount: 1,
        counterfactualCount: 1,
        digest: "rcpt:sandbox:0001",
        summary: "Accepted one speculative rewrite and captured one counterfactual."
      }
    ]
  },
  effectEmissions: {
    "head:main": [
      {
        emissionId: "emit:echo:0001",
        headId: "head:main",
        frameIndex: 1,
        laneId: "wl:main",
        worldlineId: "wl:main",
        coordinate: { laneId: "wl:main", worldlineId: "wl:main", tick: 1 },
        effectKind: "diagnostic",
        producerWriterId: "echo-writer",
        summary: "Diagnostic event emitted on canonical worldline advance."
      },
      {
        emissionId: "emit:echo:0002",
        headId: "head:main",
        frameIndex: 2,
        laneId: "ws:sandbox",
        worldlineId: "wl:main",
        coordinate: { laneId: "ws:sandbox", worldlineId: "wl:main", tick: 1 },
        effectKind: "notification",
        producerWriterId: "echo-writer",
        summary: "Notification emitted on speculative strand advance."
      }
    ]
  },
  deliveryObservations: {
    "head:main": [
      {
        observationId: "deliv:echo:0001a",
        emissionId: "emit:echo:0001",
        headId: "head:main",
        frameIndex: 1,
        sinkId: "sink:tui-log",
        outcome: "DELIVERED",
        reason: "Live execution — delivered to local TUI log sink.",
        executionMode: "LIVE",
        summary: "Diagnostic delivered to TUI log."
      },
      {
        observationId: "deliv:echo:0001b",
        emissionId: "emit:echo:0001",
        headId: "head:main",
        frameIndex: 1,
        sinkId: "sink:chunk-file",
        outcome: "DELIVERED",
        reason: "Live execution — written to rotating chunk file.",
        executionMode: "LIVE",
        summary: "Diagnostic written to chunk file."
      },
      {
        observationId: "deliv:echo:0002a",
        emissionId: "emit:echo:0002",
        headId: "head:main",
        frameIndex: 2,
        sinkId: "sink:network",
        outcome: "SUPPRESSED",
        reason: "Replay-safe suppression — external delivery blocked during replay.",
        executionMode: "REPLAY",
        summary: "Notification suppressed during replay."
      },
      {
        observationId: "deliv:echo:0002b",
        emissionId: "emit:echo:0002",
        headId: "head:main",
        frameIndex: 2,
        sinkId: "sink:tui-log",
        outcome: "DELIVERED",
        reason: "Local sink delivers even during replay.",
        executionMode: "REPLAY",
        summary: "Notification delivered to TUI log (replay-safe sink)."
      }
    ]
  },
  // Session mode is "live" but frame 2 observations record "replay" executionMode.
  // This intentionally demonstrates that per-observation mode can differ from
  // session context — the fixture exercises both live and replay code paths.
  executionContext: {
    mode: "LIVE"
  }
};

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function requireHeadState(
  heads: Map<string, PlaybackHeadSnapshot>,
  headId: string
): PlaybackHeadSnapshot {
  const head = heads.get(headId);

  if (!head) {
    throw new UnknownHeadError(headId);
  }

  return head;
}

function requireFrames(
  framesByHead: Record<string, PlaybackFrame[]>,
  headId: string
): PlaybackFrame[] {
  const frames = framesByHead[headId];

  if (!frames) {
    throw new NoFramesConfiguredError(headId);
  }

  return frames;
}

export class EchoFixtureAdapter implements TtdHostAdapter {
  public readonly adapterName = "echo-fixture";
  readonly #heads = new Map<string, PlaybackHeadSnapshot>(
    Object.values(FIXTURE.heads).map((head) => [head.headId, cloneValue(head)])
  );

  public hello(): Promise<HostHello> {
    return Promise.resolve(cloneValue(FIXTURE.hello));
  }

  public laneCatalog(): Promise<LaneCatalog> {
    return Promise.resolve(cloneValue(FIXTURE.catalog));
  }

  public playbackHead(headId: string): Promise<PlaybackHeadSnapshot> {
    return Promise.resolve(cloneValue(requireHeadState(this.#heads, headId)));
  }

  public frame(headId: string, frameIndex?: number): Promise<PlaybackFrame> {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const frame = frames[resolvedIndex];

    if (!frame) {
      throw new FrameResolutionError(resolvedIndex, headId);
    }

    return Promise.resolve(cloneValue(frame));
  }

  public receipts(headId: string, frameIndex?: number): Promise<ReceiptSummary[]> {
    const head = requireHeadState(this.#heads, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const receipts = FIXTURE.receipts[headId] ?? [];

    return Promise.resolve(cloneValue(
      receipts.filter((receipt) => receipt.frameIndex === resolvedIndex)
    ));
  }

  public stepForward(headId: string): Promise<PlaybackFrame> {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    const nextIndex = Math.min(head.currentFrameIndex + 1, frames.length - 1);
    const nextFrame = frames[nextIndex];

    if (!nextFrame) {
      throw new FrameResolutionError(nextIndex, headId);
    }

    this.#heads.set(headId, {
      ...head,
      currentFrameIndex: nextIndex,
      paused: true
    });

    return Promise.resolve(cloneValue(nextFrame));
  }

  public stepBackward(headId: string): Promise<PlaybackFrame> {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    const prevIndex = Math.max(head.currentFrameIndex - 1, 0);
    const prevFrame = frames[prevIndex];

    if (!prevFrame) {
      throw new FrameResolutionError(prevIndex, headId);
    }

    this.#heads.set(headId, {
      ...head,
      currentFrameIndex: prevIndex,
      paused: true
    });

    return Promise.resolve(cloneValue(prevFrame));
  }

  public seekToFrame(headId: string, frameIndex: number): Promise<PlaybackFrame> {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    // frames is directly indexed by frameIndex (frames[0]=frame 0), so max valid index = length - 1
    const clampedIndex = Math.max(0, Math.min(frameIndex, frames.length - 1));
    const frame = frames[clampedIndex];

    if (!frame) {
      throw new FrameResolutionError(frameIndex, headId);
    }

    this.#heads.set(headId, {
      ...head,
      currentFrameIndex: clampedIndex,
      paused: true
    });

    return Promise.resolve(cloneValue(frame));
  }

  public effectEmissions(headId: string, frameIndex?: number): Promise<EffectEmissionSummary[]> {
    const head = requireHeadState(this.#heads, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const emissions = FIXTURE.effectEmissions[headId] ?? [];

    return Promise.resolve(cloneValue(
      emissions.filter((e) => e.frameIndex === resolvedIndex)
    ));
  }

  public deliveryObservations(headId: string, frameIndex?: number): Promise<DeliveryObservationSummary[]> {
    const head = requireHeadState(this.#heads, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const observations = FIXTURE.deliveryObservations[headId] ?? [];

    return Promise.resolve(cloneValue(
      observations.filter((o) => o.frameIndex === resolvedIndex)
    ));
  }

  public executionContext(): Promise<ExecutionContext> {
    return Promise.resolve(cloneValue(FIXTURE.executionContext));
  }
}

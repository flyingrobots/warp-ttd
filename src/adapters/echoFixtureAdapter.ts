import type { TtdHostAdapter } from "../adapter.ts";
import type {
  HostHello,
  LaneCatalog,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "../protocol.ts";

type FixtureState = {
  readonly hello: HostHello;
  readonly catalog: LaneCatalog;
  readonly heads: Record<string, PlaybackHeadSnapshot>;
  readonly frames: Record<string, PlaybackFrame[]>;
  readonly receipts: Record<string, ReceiptSummary[]>;
};

const FIXTURE: FixtureState = {
  hello: {
    hostKind: "echo",
    hostVersion: "0.0.0-fixture",
    protocolVersion: "0.1.0",
    schemaId: "ttd-protocol-fixture-v1",
    capabilities: [
      "read:hello",
      "read:lane-catalog",
      "read:playback-head",
      "read:frame",
      "read:receipts",
      "control:step-forward"
    ]
  },
  catalog: {
    lanes: [
      {
        id: "wl:main",
        kind: "worldline",
        writable: false,
        description: "Canonical application worldline"
      },
      {
        id: "ws:sandbox",
        kind: "working-set",
        parentId: "wl:main",
        writable: true,
        description: "Speculative child working set at frame 1"
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
            coordinate: { laneId: "wl:main", tick: 0 },
            changed: false
          },
          {
            laneId: "ws:sandbox",
            coordinate: { laneId: "ws:sandbox", tick: 0 },
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
            coordinate: { laneId: "wl:main", tick: 1 },
            changed: true,
            btrDigest: "btr:echo:main:0001"
          },
          {
            laneId: "ws:sandbox",
            coordinate: { laneId: "ws:sandbox", tick: 0 },
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
            coordinate: { laneId: "wl:main", tick: 1 },
            changed: false
          },
          {
            laneId: "ws:sandbox",
            coordinate: { laneId: "ws:sandbox", tick: 1 },
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
        inputTick: 0,
        outputTick: 1,
        admittedRewriteCount: 1,
        rejectedRewriteCount: 1,
        counterfactualCount: 1,
        digest: "rcpt:sandbox:0001",
        summary: "Accepted one speculative rewrite and captured one counterfactual."
      }
    ]
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
    throw new Error(`Unknown playback head: ${headId}`);
  }

  return head;
}

function requireFrames(
  framesByHead: Record<string, PlaybackFrame[]>,
  headId: string
): PlaybackFrame[] {
  const frames = framesByHead[headId];

  if (!frames) {
    throw new Error(`No frames configured for playback head: ${headId}`);
  }

  return frames;
}

export class EchoFixtureAdapter implements TtdHostAdapter {
  readonly adapterName = "echo-fixture";
  readonly #heads = new Map<string, PlaybackHeadSnapshot>(
    Object.values(FIXTURE.heads).map((head) => [head.headId, cloneValue(head)])
  );

  hello(): HostHello {
    return cloneValue(FIXTURE.hello);
  }

  laneCatalog(): LaneCatalog {
    return cloneValue(FIXTURE.catalog);
  }

  playbackHead(headId: string): PlaybackHeadSnapshot {
    return cloneValue(requireHeadState(this.#heads, headId));
  }

  frame(headId: string, frameIndex?: number): PlaybackFrame {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const frame = frames[resolvedIndex];

    if (!frame) {
      throw new Error(
        `Unknown frame index ${resolvedIndex} for playback head ${headId}`
      );
    }

    return cloneValue(frame);
  }

  receipts(headId: string, frameIndex?: number): ReceiptSummary[] {
    const head = requireHeadState(this.#heads, headId);
    const resolvedIndex = frameIndex ?? head.currentFrameIndex;
    const receipts = FIXTURE.receipts[headId] ?? [];

    return cloneValue(
      receipts.filter((receipt) => receipt.frameIndex === resolvedIndex)
    );
  }

  stepForward(headId: string): PlaybackFrame {
    const head = requireHeadState(this.#heads, headId);
    const frames = requireFrames(FIXTURE.frames, headId);
    const nextIndex = Math.min(head.currentFrameIndex + 1, frames.length - 1);
    const nextFrame = frames[nextIndex];

    if (!nextFrame) {
      throw new Error(`Unable to resolve next frame for playback head ${headId}`);
    }

    this.#heads.set(headId, {
      ...head,
      currentFrameIndex: nextIndex,
      paused: true
    });

    return cloneValue(nextFrame);
  }
}

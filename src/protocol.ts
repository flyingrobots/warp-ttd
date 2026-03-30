export type HostKind = "echo" | "git-warp";

export type LaneKind = "worldline" | "strand";

export interface LaneRef {
  id: string;
  kind: LaneKind;
  parentId?: string;
  writable: boolean;
  description: string;
}

export interface Coordinate {
  laneId: string;
  tick: number;
}

export type Capability =
  | "read:hello"
  | "read:lane-catalog"
  | "read:playback-head"
  | "read:frame"
  | "read:receipts"
  | "control:step-forward";

export interface HostHello {
  hostKind: HostKind;
  hostVersion: string;
  protocolVersion: string;
  schemaId: string;
  capabilities: Capability[];
}

export interface LaneCatalog {
  lanes: LaneRef[];
}

export interface PlaybackHeadSnapshot {
  headId: string;
  label: string;
  currentFrameIndex: number;
  trackedLaneIds: string[];
  writableLaneIds: string[];
  paused: boolean;
}

export interface LaneFrameView {
  laneId: string;
  coordinate: Coordinate;
  changed: boolean;
  btrDigest?: string;
}

export interface PlaybackFrame {
  headId: string;
  frameIndex: number;
  lanes: LaneFrameView[];
}

export interface ReceiptSummary {
  receiptId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  inputTick: number;
  outputTick: number;
  admittedRewriteCount: number;
  rejectedRewriteCount: number;
  counterfactualCount: number;
  digest: string;
  summary: string;
}

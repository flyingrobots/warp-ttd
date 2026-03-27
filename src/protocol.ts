export type HostKind = "echo" | "git-warp";

export type LaneKind = "worldline" | "working-set";

export type LaneRef = {
  id: string;
  kind: LaneKind;
  parentId?: string;
  writable: boolean;
  description: string;
};

export type Coordinate = {
  laneId: string;
  tick: number;
};

export type HostHello = {
  hostKind: HostKind;
  hostVersion: string;
  protocolVersion: string;
  schemaId: string;
  capabilities: string[];
};

export type LaneCatalog = {
  lanes: LaneRef[];
};

export type PlaybackHeadSnapshot = {
  headId: string;
  label: string;
  currentFrameIndex: number;
  trackedLaneIds: string[];
  writableLaneIds: string[];
  paused: boolean;
};

export type LaneFrameView = {
  laneId: string;
  coordinate: Coordinate;
  changed: boolean;
  btrDigest?: string;
};

export type PlaybackFrame = {
  headId: string;
  frameIndex: number;
  lanes: LaneFrameView[];
};

export type ReceiptSummary = {
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
};

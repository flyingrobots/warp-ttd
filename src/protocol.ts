// Local application-facing mirror of the host-neutral protocol.
// The authored contract lives in schemas/warp-ttd-protocol.graphql.
// Keep this file in sync with the schema; do not treat it as peer authority.
// TODO(cycle-0011): Replace with Wesley-generated types; sync verification deferred until vendoring.

export type HostKind = "ECHO" | "GIT_WARP";

export type LaneKind = "WORLDLINE" | "STRAND";

export interface LaneRef {
  id: string;
  kind: LaneKind;
  worldlineId: string;
  parentId?: string;
  writable: boolean;
  description: string;
}

export interface Coordinate {
  laneId: string;
  worldlineId: string;
  tick: number;
}

export type DeliveryOutcome = "DELIVERED" | "SUPPRESSED" | "FAILED" | "SKIPPED";

export type ExecutionMode = "LIVE" | "REPLAY" | "DEBUG";

export type Capability =
  | "READ_HELLO"
  | "READ_LANE_CATALOG"
  | "READ_PLAYBACK_HEAD"
  | "READ_FRAME"
  | "READ_RECEIPTS"
  | "READ_EFFECT_EMISSIONS"
  | "READ_DELIVERY_OBSERVATIONS"
  | "READ_EXECUTION_CONTEXT"
  | "CONTROL_STEP_FORWARD"
  | "CONTROL_STEP_BACKWARD"
  | "CONTROL_SEEK";

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
  worldlineId: string;
  coordinate: Coordinate;
  changed: boolean;
  btrDigest?: string;
}

export interface PlaybackFrame {
  headId: string;
  frameIndex: number;
  lanes: LaneFrameView[];
}

export interface WriterRef {
  writerId: string;
  worldlineId: string;
  headId?: string;
}

export interface ReceiptSummary {
  receiptId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  worldlineId: string;
  writer?: WriterRef;
  inputTick: number;
  outputTick: number;
  admittedRewriteCount: number;
  rejectedRewriteCount: number;
  counterfactualCount: number;
  digest: string;
  summary: string;
}

export interface EffectEmissionSummary {
  emissionId: string;
  headId: string;
  frameIndex: number;
  laneId: string;
  worldlineId: string;
  coordinate: Coordinate;
  effectKind: string;
  producerWriter: WriterRef;
  summary: string;
}

export interface DeliveryObservationSummary {
  observationId: string;
  emissionId: string;
  headId: string;
  frameIndex: number;
  sinkId: string;
  outcome: DeliveryOutcome;
  reason: string;
  observerId?: string;
  executionMode: ExecutionMode;
  summary: string;
}

export interface ExecutionContext {
  mode: ExecutionMode;
  sessionId?: string;
  observerId?: string;
  apertureId?: string;
}

export function formatLaneKind(kind: LaneKind): string {
  return kind === "WORLDLINE" ? "worldline" : "strand";
}

export function formatExecutionMode(mode: ExecutionMode): string {
  return mode.toLowerCase();
}

export function formatDeliveryOutcome(outcome: DeliveryOutcome): string {
  return outcome.toLowerCase();
}

export function formatWriterRef(writer: WriterRef): string {
  const identity = `${writer.writerId}@${writer.worldlineId}`;

  if (writer.headId === undefined) {
    return identity;
  }

  return `${identity}#${writer.headId}`;
}

import type {
  HostHello,
  LaneCatalog,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "./protocol.ts";

export interface TtdHostAdapter {
  readonly adapterName: string;
  hello(): Promise<HostHello>;
  laneCatalog(): Promise<LaneCatalog>;
  playbackHead(headId: string): Promise<PlaybackHeadSnapshot>;
  frame(headId: string, frameIndex?: number): Promise<PlaybackFrame>;
  receipts(headId: string, frameIndex?: number): Promise<ReceiptSummary[]>;
  stepForward(headId: string): Promise<PlaybackFrame>;
}

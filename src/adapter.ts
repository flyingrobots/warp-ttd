import type {
  HostHello,
  LaneCatalog,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "./protocol.ts";

export interface TtdHostAdapter {
  readonly adapterName: string;
  hello(): HostHello;
  laneCatalog(): LaneCatalog;
  playbackHead(headId: string): PlaybackHeadSnapshot;
  frame(headId: string, frameIndex?: number): PlaybackFrame;
  receipts(headId: string, frameIndex?: number): ReceiptSummary[];
  stepForward(headId: string): PlaybackFrame;
}

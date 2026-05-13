import type { FrameModel, FramedAppMsg } from "@flyingrobots/bijou-tui";
import type { FrameData } from "./worldlineLayout.ts";

export type PageMessageValue =
  | FrameData[]
  | string
  | number
  | boolean
  | null
  | undefined;

export interface AnyMsg {
  readonly type: string;
  readonly [key: string]: PageMessageValue;
}

export type FModel = FrameModel<object>;
export type FMsg = FramedAppMsg<AnyMsg>;

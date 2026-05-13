/**
 * Shared types for cross-page communication in the warp-ttd TUI.
 *
 * Pages communicate through the app frame's message system.
 * Cross-page messages (connect, disconnect) flow through
 * FramePageMsg's frame-scoped dispatch.
 */
import { boxSurface } from "@flyingrobots/bijou";
import type { BijouContext, Surface } from "@flyingrobots/bijou";
import type { DebuggerSession } from "../../app/debuggerSession.ts";
import type { HostHello, LaneCatalog } from "../../protocol.ts";

/** Session context shared across pages after connection. */
export interface SessionContext {
  readonly session: DebuggerSession;
  readonly hello: HostHello;
  readonly catalog: LaneCatalog;
}

export interface CenterBoxArgs {
  bg: Surface;
  content: Surface;
  title: string;
  ctx: BijouContext;
}

type PageMessageInput =
  | object
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/** Center a content surface in a titled box over a background. */
export function centerBox(args: CenterBoxArgs): Surface {
  const { bg, content, title, ctx } = args;
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

/** Type guard: is this a page-domain message (has string `type` field)? */
export function isPageMsg(msg: PageMessageInput): msg is { readonly type: string } {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) return false;

  return typeof (msg as { readonly type?: PageMessageInput }).type === "string";
}

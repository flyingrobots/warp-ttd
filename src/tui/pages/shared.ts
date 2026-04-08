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

/** Center a content surface in a titled box over a background. */
export function centerBox(bg: Surface, content: Surface, title: string, ctx: BijouContext): Surface {
  const box = boxSurface(content, { title: ` ${title} `, width: Math.min(60, bg.width - 4), ctx });
  bg.blit(box, Math.floor((bg.width - box.width) / 2), Math.floor((bg.height - box.height) / 2));
  return bg;
}

/** Type guard: is this a page-domain message (has string `type` field)? */
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- unknown is correct for type guard input
export function isPageMsg<T extends { type: string }>(msg: unknown): msg is T {
  return typeof msg === "object" && msg !== null && "type" in msg && typeof (msg as T).type === "string";
}

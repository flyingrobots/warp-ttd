/**
 * Shared types for cross-page communication in the warp-ttd TUI.
 *
 * Pages communicate through the app frame's message system.
 * Cross-page messages (connect, disconnect) flow through
 * FramePageMsg's frame-scoped dispatch.
 */
import type { DebuggerSession } from "../../app/debuggerSession.ts";
import type { HostHello, LaneCatalog } from "../../protocol.ts";

/** Session context shared across pages after connection. */
export interface SessionContext {
  readonly session: DebuggerSession;
  readonly hello: HostHello;
  readonly catalog: LaneCatalog;
}

/** Type guard: is this a page-domain message (has string `type` field)? */
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- unknown is correct for type guard input
export function isPageMsg<T extends { type: string }>(msg: unknown): msg is T {
  return typeof msg === "object" && msg !== null && "type" in msg && typeof (msg as T).type === "string";
}

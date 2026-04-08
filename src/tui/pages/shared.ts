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

/**
 * DebuggerSession — application-layer domain object for a debug
 * investigation.
 *
 * Wraps a TtdHostAdapter and manages the current playback snapshot
 * plus pinned observations. The TUI and CLI consume sessions, not
 * raw adapter calls.
 */
import { randomUUID } from "node:crypto";
import type { TtdHostAdapter } from "../adapter.ts";
import type {
  DeliveryObservationSummary,
  EffectEmissionSummary,
  ExecutionContext,
  PlaybackFrame,
  PlaybackHeadSnapshot,
  ReceiptSummary
} from "../protocol.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionSnapshot {
  head: PlaybackHeadSnapshot;
  frame: PlaybackFrame;
  receipts: ReceiptSummary[];
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
  execCtx: ExecutionContext;
}

export interface PinnedObservation {
  pinnedAt: number;
  observation: DeliveryObservationSummary;
  emission: EffectEmissionSummary;
}

export interface SerializedSession {
  sessionId: string;
  activeHeadId: string;
  snapshot: SessionSnapshot;
  pins: PinnedObservation[];
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export class DebuggerSession {
  readonly sessionId: string;
  readonly #adapter: TtdHostAdapter;
  readonly #activeHeadId: string;
  #snapshot: SessionSnapshot;
  #pins: PinnedObservation[];

  private constructor(
    adapter: TtdHostAdapter,
    activeHeadId: string,
    snapshot: SessionSnapshot
  ) {
    this.sessionId = randomUUID();
    this.#adapter = adapter;
    this.#activeHeadId = activeHeadId;
    this.#snapshot = snapshot;
    this.#pins = [];
  }

  static async create(
    adapter: TtdHostAdapter,
    headId: string
  ): Promise<DebuggerSession> {
    const snapshot = await fetchSnapshot(adapter, headId);
    return new DebuggerSession(adapter, headId, snapshot);
  }

  get activeHeadId(): string {
    return this.#activeHeadId;
  }

  get snapshot(): SessionSnapshot {
    return this.#snapshot;
  }

  get pins(): readonly PinnedObservation[] {
    return this.#pins;
  }

  async stepForward(): Promise<SessionSnapshot> {
    await this.#adapter.stepForward(this.#activeHeadId);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  async stepBackward(): Promise<SessionSnapshot> {
    await this.#adapter.stepBackward(this.#activeHeadId);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  async seekToFrame(frameIndex: number): Promise<SessionSnapshot> {
    await this.#adapter.seekToFrame(this.#activeHeadId, frameIndex);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  pin(observationId: string): PinnedObservation | null {
    const obs = this.#snapshot.observations.find(
      (o) => o.observationId === observationId
    );
    if (obs === undefined) return null;

    const emission = this.#snapshot.emissions.find(
      (e) => e.emissionId === obs.emissionId
    );
    if (emission === undefined) return null;

    const pinned: PinnedObservation = {
      pinnedAt: this.#snapshot.frame.frameIndex,
      observation: structuredClone(obs),
      emission: structuredClone(emission)
    };
    this.#pins.push(pinned);
    return pinned;
  }

  unpin(observationId: string): boolean {
    const index = this.#pins.findIndex(
      (p) => p.observation.observationId === observationId
    );
    if (index === -1) return false;
    this.#pins.splice(index, 1);
    return true;
  }

  toJSON(): SerializedSession {
    return {
      sessionId: this.sessionId,
      activeHeadId: this.#activeHeadId,
      snapshot: structuredClone(this.#snapshot),
      pins: structuredClone(this.#pins)
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchSnapshot(
  adapter: TtdHostAdapter,
  headId: string
): Promise<SessionSnapshot> {
  const head = await adapter.playbackHead(headId);
  const frame = await adapter.frame(headId);
  const receipts = await adapter.receipts(headId);
  const emissions = await adapter.effectEmissions(headId);
  const observations = await adapter.deliveryObservations(headId);
  const execCtx = await adapter.executionContext();
  return { head, frame, receipts, emissions, observations, execCtx };
}

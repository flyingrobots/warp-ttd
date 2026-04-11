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
import type { EffectKind } from "../EffectKind.ts";
import {
  NeighborhoodCoreSummary,
  type SerializedNeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";
import {
  NeighborhoodSiteCatalog,
  type SerializedNeighborhoodSiteCatalog
} from "./NeighborhoodSiteCatalog.ts";
import {
  ReintegrationDetailSummary,
  type SerializedReintegrationDetailSummary
} from "./ReintegrationDetailSummary.ts";
import {
  ReceiptShellSummary,
  type SerializedReceiptShellSummary
} from "./ReceiptShellSummary.ts";
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
  neighborhoodCore: NeighborhoodCoreSummary;
  neighborhoodSites: NeighborhoodSiteCatalog;
  reintegrationDetail: ReintegrationDetailSummary;
  receiptShell: ReceiptShellSummary;
}

export interface PinnedObservation {
  pinnedAt: number;
  observation: DeliveryObservationSummary;
  emission: EffectEmissionSummary;
}

export interface SerializedEffectEmissionSummary
  extends Omit<EffectEmissionSummary, "effectKind"> {
  effectKind: string;
}

export interface SerializedSessionSnapshot {
  head: PlaybackHeadSnapshot;
  frame: PlaybackFrame;
  receipts: ReceiptSummary[];
  emissions: SerializedEffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
  execCtx: ExecutionContext;
  neighborhoodCore: SerializedNeighborhoodCoreSummary;
  neighborhoodSites: SerializedNeighborhoodSiteCatalog;
  reintegrationDetail: SerializedReintegrationDetailSummary;
  receiptShell: SerializedReceiptShellSummary;
}

export interface SerializedPinnedObservation
  extends Omit<PinnedObservation, "emission"> {
  emission: SerializedEffectEmissionSummary;
}

export interface SerializedSession {
  sessionId: string;
  activeHeadId: string;
  snapshot: SerializedSessionSnapshot;
  pins: SerializedPinnedObservation[];
}

function cloneEffectKind(kind: EffectKind): EffectKind {
  return kind.clone();
}

function cloneEffectEmissionSummary(emission: EffectEmissionSummary): EffectEmissionSummary {
  return {
    ...structuredClone(emission),
    coordinate: structuredClone(emission.coordinate),
    producerWriter: structuredClone(emission.producerWriter),
    effectKind: cloneEffectKind(emission.effectKind)
  };
}

function serializeEffectEmissionSummary(
  emission: EffectEmissionSummary
): SerializedEffectEmissionSummary {
  return {
    ...structuredClone(emission),
    coordinate: structuredClone(emission.coordinate),
    producerWriter: structuredClone(emission.producerWriter),
    effectKind: emission.effectKind.toString()
  };
}

function serializeSnapshot(
  snapshot: SessionSnapshot
): SerializedSessionSnapshot {
  return {
    head: structuredClone(snapshot.head),
    frame: structuredClone(snapshot.frame),
    receipts: structuredClone(snapshot.receipts),
    emissions: snapshot.emissions.map((emission) => serializeEffectEmissionSummary(emission)),
    observations: structuredClone(snapshot.observations),
    execCtx: structuredClone(snapshot.execCtx),
    neighborhoodCore: snapshot.neighborhoodCore.toJSON(),
    neighborhoodSites: snapshot.neighborhoodSites.toJSON(),
    reintegrationDetail: snapshot.reintegrationDetail.toJSON(),
    receiptShell: snapshot.receiptShell.toJSON()
  };
}

function serializePinnedObservation(
  pin: PinnedObservation
): SerializedPinnedObservation {
  return {
    pinnedAt: pin.pinnedAt,
    observation: structuredClone(pin.observation),
    emission: serializeEffectEmissionSummary(pin.emission)
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export class DebuggerSession {
  public readonly sessionId: string;
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

  public static async create(
    adapter: TtdHostAdapter,
    headId: string
  ): Promise<DebuggerSession> {
    const snapshot = await fetchSnapshot(adapter, headId);
    return new DebuggerSession(adapter, headId, snapshot);
  }

  public get adapter(): TtdHostAdapter {
    return this.#adapter;
  }

  public get activeHeadId(): string {
    return this.#activeHeadId;
  }

  public get snapshot(): SessionSnapshot {
    return this.#snapshot;
  }

  public get pins(): readonly PinnedObservation[] {
    return this.#pins;
  }

  public async stepForward(): Promise<SessionSnapshot> {
    await this.#adapter.stepForward(this.#activeHeadId);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  public async stepBackward(): Promise<SessionSnapshot> {
    await this.#adapter.stepBackward(this.#activeHeadId);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  public async seekToFrame(frameIndex: number): Promise<SessionSnapshot> {
    await this.#adapter.seekToFrame(this.#activeHeadId, frameIndex);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId
    );
    return this.#snapshot;
  }

  public pin(observationId: string): PinnedObservation | null {
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
      emission: cloneEffectEmissionSummary(emission)
    };
    this.#pins.push(pinned);
    return pinned;
  }

  public unpin(observationId: string): boolean {
    const index = this.#pins.findIndex(
      (p) => p.observation.observationId === observationId
    );
    if (index === -1) return false;
    this.#pins.splice(index, 1);
    return true;
  }

  public toJSON(): SerializedSession {
    return {
      sessionId: this.sessionId,
      activeHeadId: this.#activeHeadId,
      snapshot: serializeSnapshot(this.#snapshot),
      pins: this.#pins.map((pin) => serializePinnedObservation(pin))
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildNeighborhoodState(
  frame: PlaybackFrame,
  receipts: readonly ReceiptSummary[],
  emissions: readonly EffectEmissionSummary[]
): Pick<
  SessionSnapshot,
  "neighborhoodCore" | "neighborhoodSites" | "reintegrationDetail" | "receiptShell"
> {
  const neighborhoodCore = NeighborhoodCoreSummary.fromFrame(frame, receipts, emissions);

  return {
    neighborhoodCore,
    neighborhoodSites: NeighborhoodSiteCatalog.fromCore(neighborhoodCore),
    reintegrationDetail: ReintegrationDetailSummary.fromSnapshot(
      frame,
      neighborhoodCore,
      receipts
    ),
    receiptShell: ReceiptShellSummary.fromReceipts(neighborhoodCore, receipts)
  };
}

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
  const neighborhoodState = buildNeighborhoodState(frame, receipts, emissions);

  return {
    head,
    frame,
    receipts,
    emissions,
    observations,
    execCtx,
    ...neighborhoodState
  };
}

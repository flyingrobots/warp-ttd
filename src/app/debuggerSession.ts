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
  NeighborhoodCoreSummary,
  SerializedNeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";
import type {
  NeighborhoodSiteCatalog,
  SerializedNeighborhoodSiteCatalog
} from "./NeighborhoodSiteCatalog.ts";
import type {
  ReintegrationDetailSummary,
  SerializedReintegrationDetailSummary
} from "./ReintegrationDetailSummary.ts";
import type {
  ReceiptShellSummary,
  SerializedReceiptShellSummary
} from "./ReceiptShellSummary.ts";
import { buildNeighborhoodState } from "./neighborhoodAssembler.ts";
import type { SessionFamilyFact } from "./sessionFamilyFacts.ts";
import type {
  AdapterCapability,
  DeliveryObservationSummary,
  EffectEmissionSummary,
  ExecutionContext,
  HostHello,
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
  sessionFamilyFacts: readonly SessionFamilyFact[];
}

export interface PinnedObservation {
  pinnedAt: number;
  observation: DeliveryObservationSummary;
  emission: EffectEmissionSummary;
}

export interface SerializedSessionSnapshot {
  head: PlaybackHeadSnapshot;
  frame: PlaybackFrame;
  receipts: ReceiptSummary[];
  emissions: EffectEmissionSummary[];
  observations: DeliveryObservationSummary[];
  execCtx: ExecutionContext;
  neighborhoodCore: SerializedNeighborhoodCoreSummary;
  neighborhoodSites: SerializedNeighborhoodSiteCatalog;
  reintegrationDetail: SerializedReintegrationDetailSummary;
  receiptShell: SerializedReceiptShellSummary;
  sessionFamilyFacts: readonly SessionFamilyFact[];
}

export interface SerializedSession {
  sessionId: string;
  activeHeadId: string;
  snapshot: SerializedSessionSnapshot;
  pins: PinnedObservation[];
}

interface DebuggerSessionInit {
  adapter: TtdHostAdapter;
  activeHeadId: string;
  hostHello: HostHello;
  snapshot: SessionSnapshot;
}

interface FetchSessionFamilyFactsArgs {
  readonly adapter: TtdHostAdapter;
  readonly capabilities: readonly AdapterCapability[];
  readonly frameIndex: number;
  readonly headId: string;
}

interface SnapshotProtocolFacts {
  readonly emissions: EffectEmissionSummary[];
  readonly execCtx: ExecutionContext;
  readonly frame: PlaybackFrame;
  readonly head: PlaybackHeadSnapshot;
  readonly observations: DeliveryObservationSummary[];
  readonly receipts: ReceiptSummary[];
}

function serializeSnapshot(
  snapshot: SessionSnapshot
): SerializedSessionSnapshot {
  return {
    head: structuredClone(snapshot.head),
    frame: structuredClone(snapshot.frame),
    receipts: structuredClone(snapshot.receipts),
    emissions: structuredClone(snapshot.emissions),
    observations: structuredClone(snapshot.observations),
    execCtx: structuredClone(snapshot.execCtx),
    neighborhoodCore: snapshot.neighborhoodCore.toJSON(),
    neighborhoodSites: snapshot.neighborhoodSites.toJSON(),
    reintegrationDetail: snapshot.reintegrationDetail.toJSON(),
    receiptShell: snapshot.receiptShell.toJSON(),
    sessionFamilyFacts: structuredClone(snapshot.sessionFamilyFacts)
  };
}


// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export class DebuggerSession {
  public readonly sessionId: string;
  readonly #adapter: TtdHostAdapter;
  readonly #activeHeadId: string;
  readonly #hostHello: HostHello;
  readonly #capabilities: readonly AdapterCapability[];
  #snapshot: SessionSnapshot;
  #pins: PinnedObservation[];

  private constructor(init: DebuggerSessionInit) {
    this.sessionId = randomUUID();
    this.#adapter = init.adapter;
    this.#activeHeadId = init.activeHeadId;
    this.#hostHello = structuredClone(init.hostHello);
    this.#capabilities = [...init.hostHello.capabilities];
    this.#snapshot = init.snapshot;
    this.#pins = [];
  }

  public static async create(
    adapter: TtdHostAdapter,
    headId: string
  ): Promise<DebuggerSession> {
    const hello = await adapter.hello();
    const capabilities = [...hello.capabilities];
    const snapshot = await fetchSnapshot(adapter, headId, capabilities);
    return new DebuggerSession({
      adapter,
      activeHeadId: headId,
      hostHello: hello,
      snapshot
    });
  }

  public get adapter(): TtdHostAdapter {
    return this.#adapter;
  }

  public get activeHeadId(): string {
    return this.#activeHeadId;
  }

  public get hostHello(): HostHello {
    return structuredClone(this.#hostHello);
  }

  public get adapterCapabilities(): readonly AdapterCapability[] {
    return [...this.#capabilities];
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
      this.#adapter, this.#activeHeadId, this.#capabilities
    );
    return this.#snapshot;
  }

  public async stepBackward(): Promise<SessionSnapshot> {
    await this.#adapter.stepBackward(this.#activeHeadId);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId, this.#capabilities
    );
    return this.#snapshot;
  }

  public async seekToFrame(frameIndex: number): Promise<SessionSnapshot> {
    await this.#adapter.seekToFrame(this.#activeHeadId, frameIndex);
    this.#snapshot = await fetchSnapshot(
      this.#adapter, this.#activeHeadId, this.#capabilities
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
      emission: structuredClone(emission)
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
      pins: this.#pins.map((pin) => structuredClone(pin))
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasAdapterCapability(
  capabilities: readonly AdapterCapability[],
  capability: AdapterCapability
): boolean {
  return capabilities.includes(capability);
}

async function fetchReceipts(
  adapter: TtdHostAdapter,
  headId: string,
  capabilities: readonly AdapterCapability[]
): Promise<ReceiptSummary[]> {
  if (!hasAdapterCapability(capabilities, "READ_RECEIPTS")) return [];
  return adapter.receipts(headId);
}

async function fetchEmissions(
  adapter: TtdHostAdapter,
  headId: string,
  capabilities: readonly AdapterCapability[]
): Promise<EffectEmissionSummary[]> {
  if (!hasAdapterCapability(capabilities, "READ_EFFECT_EMISSIONS")) return [];
  return adapter.effectEmissions(headId);
}

async function fetchObservations(
  adapter: TtdHostAdapter,
  headId: string,
  capabilities: readonly AdapterCapability[]
): Promise<DeliveryObservationSummary[]> {
  if (!hasAdapterCapability(capabilities, "READ_DELIVERY_OBSERVATIONS")) return [];
  return adapter.deliveryObservations(headId);
}

async function fetchExecutionContext(
  adapter: TtdHostAdapter,
  capabilities: readonly AdapterCapability[]
): Promise<ExecutionContext> {
  if (!hasAdapterCapability(capabilities, "READ_EXECUTION_CONTEXT")) return { mode: "DEBUG" };
  return adapter.executionContext();
}

async function fetchSessionFamilyFacts(
  args: FetchSessionFamilyFactsArgs
): Promise<SessionFamilyFact[]> {
  if (!hasAdapterCapability(args.capabilities, "READ_SESSION_FAMILY_FACTS")) return [];
  return args.adapter.sessionFamilyFacts(args.headId, args.frameIndex);
}

async function fetchSnapshotProtocolFacts(
  adapter: TtdHostAdapter,
  headId: string,
  capabilities: readonly AdapterCapability[]
): Promise<SnapshotProtocolFacts> {
  const head = await adapter.playbackHead(headId);
  const frame = await adapter.frame(headId);
  const receipts = await fetchReceipts(adapter, headId, capabilities);
  const emissions = await fetchEmissions(adapter, headId, capabilities);
  const observations = await fetchObservations(adapter, headId, capabilities);
  const execCtx = await fetchExecutionContext(adapter, capabilities);

  return {
    head,
    frame,
    receipts,
    emissions,
    observations,
    execCtx
  };
}

async function fetchSnapshot(
  adapter: TtdHostAdapter,
  headId: string,
  capabilities: readonly AdapterCapability[]
): Promise<SessionSnapshot> {
  const facts = await fetchSnapshotProtocolFacts(adapter, headId, capabilities);
  const hostFacts = await fetchSessionFamilyFacts({
    adapter,
    capabilities,
    frameIndex: facts.frame.frameIndex,
    headId
  });
  const neighborhoodState = buildNeighborhoodState({ ...facts, hostFacts });

  return {
    ...facts,
    ...neighborhoodState
  };
}

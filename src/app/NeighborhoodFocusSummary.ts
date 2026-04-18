import type {
  NeighborhoodOutcome,
  NeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";
import type {
  NeighborhoodSiteCatalog,
  NeighborhoodSiteKind,
  NeighborhoodSiteSummary
} from "./NeighborhoodSiteCatalog.ts";
import { requireNonEmpty, uniqueStrings } from "./validate.ts";

export interface SerializedNeighborhoodFocusSummary {
  siteId: string;
  kind: NeighborhoodSiteKind;
  outcome: NeighborhoodOutcome;
  label: string;
  summary: string;
  coordinate: {
    laneId: string;
    worldlineId: string;
    tick: number;
  };
  primaryLaneId: string;
  primaryWorldlineId: string;
  selectedLaneId: string;
  selectedWorldlineId: string;
  participatingLaneIds: string[];
  parentSiteId?: string;
}

function createFocusArgs(
  core: NeighborhoodCoreSummary,
  site: NeighborhoodSiteSummary
): SerializedNeighborhoodFocusSummary {
  const args: SerializedNeighborhoodFocusSummary = {
    siteId: site.siteId,
    kind: site.kind,
    outcome: site.outcome,
    label: site.label,
    summary: site.summary,
    coordinate: {
      laneId: core.coordinate.laneId,
      worldlineId: core.coordinate.worldlineId,
      tick: core.coordinate.tick
    },
    primaryLaneId: core.primaryLaneId,
    primaryWorldlineId: core.primaryWorldlineId,
    selectedLaneId: site.laneId ?? core.primaryLaneId,
    selectedWorldlineId: site.worldlineId ?? core.primaryWorldlineId,
    participatingLaneIds: [...core.participatingLaneIds]
  };

  if (site.parentSiteId !== undefined) {
    args.parentSiteId = site.parentSiteId;
  }

  return args;
}

export class NeighborhoodFocusSummary {
  public readonly siteId: string;
  public readonly kind: NeighborhoodSiteKind;
  public readonly outcome: NeighborhoodOutcome;
  public readonly label: string;
  public readonly summary: string;
  public readonly coordinate: {
    laneId: string;
    worldlineId: string;
    tick: number;
  };
  public readonly primaryLaneId: string;
  public readonly primaryWorldlineId: string;
  public readonly selectedLaneId: string;
  public readonly selectedWorldlineId: string;
  public readonly participatingLaneIds: readonly string[];
  public readonly parentSiteId: string | undefined;

  public constructor(args: SerializedNeighborhoodFocusSummary) {
    this.siteId = requireNonEmpty(args.siteId, "siteId");
    this.kind = args.kind;
    this.outcome = args.outcome;
    this.label = requireNonEmpty(args.label, "label");
    this.summary = requireNonEmpty(args.summary, "summary");
    this.coordinate = {
      laneId: requireNonEmpty(args.coordinate.laneId, "coordinate.laneId"),
      worldlineId: requireNonEmpty(args.coordinate.worldlineId, "coordinate.worldlineId"),
      tick: args.coordinate.tick
    };
    this.primaryLaneId = requireNonEmpty(args.primaryLaneId, "primaryLaneId");
    this.primaryWorldlineId = requireNonEmpty(args.primaryWorldlineId, "primaryWorldlineId");
    this.selectedLaneId = requireNonEmpty(args.selectedLaneId, "selectedLaneId");
    this.selectedWorldlineId = requireNonEmpty(args.selectedWorldlineId, "selectedWorldlineId");
    this.participatingLaneIds = Object.freeze(uniqueStrings(args.participatingLaneIds));
    this.parentSiteId = args.parentSiteId;
    Object.freeze(this.coordinate);
    Object.freeze(this);
  }

  public static fromSelection(
    core: NeighborhoodCoreSummary,
    catalog: NeighborhoodSiteCatalog,
    selectedSiteId: string | null
  ): NeighborhoodFocusSummary {
    return new NeighborhoodFocusSummary(
      createFocusArgs(core, catalog.selectedSite(selectedSiteId))
    );
  }

  public toJSON(): SerializedNeighborhoodFocusSummary {
    const json: SerializedNeighborhoodFocusSummary = {
      siteId: this.siteId,
      kind: this.kind,
      outcome: this.outcome,
      label: this.label,
      summary: this.summary,
      coordinate: {
        laneId: this.coordinate.laneId,
        worldlineId: this.coordinate.worldlineId,
        tick: this.coordinate.tick
      },
      primaryLaneId: this.primaryLaneId,
      primaryWorldlineId: this.primaryWorldlineId,
      selectedLaneId: this.selectedLaneId,
      selectedWorldlineId: this.selectedWorldlineId,
      participatingLaneIds: [...this.participatingLaneIds]
    };

    if (this.parentSiteId !== undefined) {
      json.parentSiteId = this.parentSiteId;
    }

    return json;
  }
}

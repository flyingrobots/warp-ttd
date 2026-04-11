import {
  type NeighborhoodAlternativeSummary,
  type NeighborhoodOutcome,
  NeighborhoodCoreSummary
} from "./NeighborhoodCoreSummary.ts";

export type NeighborhoodSiteKind = "PRIMARY" | "ALTERNATIVE";

export interface SerializedNeighborhoodSiteSummary {
  siteId: string;
  kind: NeighborhoodSiteKind;
  outcome: NeighborhoodOutcome;
  label: string;
  summary: string;
  parentSiteId?: string;
}

export interface SerializedNeighborhoodSiteCatalog {
  activeSiteId: string;
  sites: SerializedNeighborhoodSiteSummary[];
}

const VALID_SITE_KINDS = new Set<NeighborhoodSiteKind>(["PRIMARY", "ALTERNATIVE"]);

function requireNonEmpty(value: string, field: string): string {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }

  return value;
}

function validateKind(kind: NeighborhoodSiteKind): NeighborhoodSiteKind {
  if (!VALID_SITE_KINDS.has(kind)) {
    throw new TypeError(`Invalid neighborhood site kind: ${kind}`);
  }

  return kind;
}

function primarySiteLabel(core: NeighborhoodCoreSummary): string {
  return `${core.primaryLaneId}@${core.coordinate.tick.toString()}`;
}

function alternativeSiteId(
  core: NeighborhoodCoreSummary,
  alternative: NeighborhoodAlternativeSummary
): string {
  return `${core.siteId}:${alternative.alternativeId}`;
}

function alternativeSiteLabel(alternative: NeighborhoodAlternativeSummary): string {
  return alternative.kind.toLowerCase();
}

function createPrimarySite(core: NeighborhoodCoreSummary): SerializedNeighborhoodSiteSummary {
  return {
    siteId: core.siteId,
    kind: "PRIMARY",
    outcome: core.outcome,
    label: primarySiteLabel(core),
    summary: core.summary
  };
}

function createAlternativeSite(
  core: NeighborhoodCoreSummary,
  alternative: NeighborhoodAlternativeSummary
): SerializedNeighborhoodSiteSummary {
  return {
    siteId: alternativeSiteId(core, alternative),
    kind: "ALTERNATIVE",
    outcome: alternative.outcome,
    label: alternativeSiteLabel(alternative),
    summary: alternative.summary,
    parentSiteId: core.siteId
  };
}

function normalizeSite(
  site: SerializedNeighborhoodSiteSummary
): SerializedNeighborhoodSiteSummary {
  const normalized: SerializedNeighborhoodSiteSummary = {
    siteId: requireNonEmpty(site.siteId, "siteId"),
    kind: validateKind(site.kind),
    outcome: site.outcome,
    label: requireNonEmpty(site.label, "label"),
    summary: requireNonEmpty(site.summary, "summary")
  };

  if (site.parentSiteId !== undefined) {
    normalized.parentSiteId = requireNonEmpty(site.parentSiteId, "parentSiteId");
  }

  return normalized;
}

function normalizeSites(
  sites: readonly SerializedNeighborhoodSiteSummary[]
): SerializedNeighborhoodSiteSummary[] {
  const seen = new Set<string>();
  const normalized: SerializedNeighborhoodSiteSummary[] = [];

  for (const site of sites) {
    const item = normalizeSite(site);

    if (seen.has(item.siteId)) {
      continue;
    }

    seen.add(item.siteId);
    normalized.push(item);
  }

  if (normalized.length === 0) {
    throw new TypeError("NeighborhoodSiteCatalog requires at least one site");
  }

  return normalized;
}

function siteIndexById(
  sites: readonly NeighborhoodSiteSummary[],
  siteId: string
): number {
  return sites.findIndex((site) => site.siteId === siteId);
}

function requireSiteAt(
  sites: readonly NeighborhoodSiteSummary[],
  index: number
): NeighborhoodSiteSummary {
  const site = sites[index];

  if (site === undefined) {
    throw new TypeError(`Missing neighborhood site at index ${index.toString()}`);
  }

  return site;
}

export class NeighborhoodSiteSummary {
  public readonly siteId: string;
  public readonly kind: NeighborhoodSiteKind;
  public readonly outcome: NeighborhoodOutcome;
  public readonly label: string;
  public readonly summary: string;
  public readonly parentSiteId: string | undefined;

  public constructor(args: SerializedNeighborhoodSiteSummary) {
    const normalized = normalizeSite(args);

    this.siteId = normalized.siteId;
    this.kind = normalized.kind;
    this.outcome = normalized.outcome;
    this.label = normalized.label;
    this.summary = normalized.summary;
    this.parentSiteId = normalized.parentSiteId;
    Object.freeze(this);
  }

  public toJSON(): SerializedNeighborhoodSiteSummary {
    const json: SerializedNeighborhoodSiteSummary = {
      siteId: this.siteId,
      kind: this.kind,
      outcome: this.outcome,
      label: this.label,
      summary: this.summary
    };

    if (this.parentSiteId !== undefined) {
      json.parentSiteId = this.parentSiteId;
    }

    return json;
  }
}

export class NeighborhoodSiteCatalog {
  public readonly activeSiteId: string;
  public readonly sites: readonly NeighborhoodSiteSummary[];

  public constructor(args: SerializedNeighborhoodSiteCatalog) {
    const sites = normalizeSites(args.sites).map((site) => new NeighborhoodSiteSummary(site));
    const activeSiteId = requireNonEmpty(args.activeSiteId, "activeSiteId");

    if (!sites.some((site) => site.siteId === activeSiteId)) {
      throw new TypeError("activeSiteId must exist in sites");
    }

    this.activeSiteId = activeSiteId;
    this.sites = Object.freeze(sites);
    Object.freeze(this);
  }

  public static fromCore(core: NeighborhoodCoreSummary): NeighborhoodSiteCatalog {
    const sites = [
      createPrimarySite(core),
      ...core.alternatives.map((alternative) => createAlternativeSite(core, alternative))
    ];

    return new NeighborhoodSiteCatalog({
      activeSiteId: core.siteId,
      sites
    });
  }

  public normalizeSelection(siteId: string | null): string {
    if (siteId === null) {
      return this.activeSiteId;
    }

    const index = siteIndexById(this.sites, siteId);

    if (index === -1) {
      return this.activeSiteId;
    }

    return requireSiteAt(this.sites, index).siteId;
  }

  public selectedSite(siteId: string | null): NeighborhoodSiteSummary {
    const normalizedSiteId = this.normalizeSelection(siteId);
    const index = siteIndexById(this.sites, normalizedSiteId);
    return requireSiteAt(this.sites, index);
  }

  public moveSelection(siteId: string | null, delta: number): string {
    const normalizedSiteId = this.normalizeSelection(siteId);
    const currentIndex = siteIndexById(this.sites, normalizedSiteId);
    const nextIndex = Math.max(0, Math.min(currentIndex + delta, this.sites.length - 1));
    return requireSiteAt(this.sites, nextIndex).siteId;
  }

  public toJSON(): SerializedNeighborhoodSiteCatalog {
    return {
      activeSiteId: this.activeSiteId,
      sites: this.sites.map((site) => site.toJSON())
    };
  }
}

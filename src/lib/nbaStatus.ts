// Client helper: fetch live games + series status from our /api/nba-status route.

export interface LiveGame {
  id: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  state: "pre" | "in" | "post";
  detail: string;
  tipoffIso?: string;
  seriesSummary?: string;
}

export interface SeriesStatus {
  key: string;
  teamA: string;
  teamB: string;
  winsA: number;
  winsB: number;
  lead: string | null;
  complete: boolean;
  summary: string;
}

export interface NbaStatusResponse {
  ok: boolean;
  games: LiveGame[];
  series: Record<string, SeriesStatus>;
  stale?: boolean;
  cached?: boolean;
}

export async function fetchNbaStatus(): Promise<NbaStatusResponse | null> {
  try {
    const res = await fetch("/api/nba-status", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as NbaStatusResponse;
  } catch {
    return null;
  }
}

/** Build series key the same way the server does: sorted pair */
export function seriesKeyFor(a: string, b: string): string {
  return [a, b].sort().join("_");
}

/** Look up a series status by unordered team pair */
export function lookupSeries(
  series: Record<string, SeriesStatus>,
  a: string | null | undefined,
  b: string | null | undefined
): SeriesStatus | null {
  if (!a || !b) return null;
  return series[seriesKeyFor(a, b)] ?? null;
}

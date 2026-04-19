import { NextResponse } from "next/server";

/**
 * Server-side proxy for ESPN's unofficial NBA scoreboard API.
 *
 * - Fetches a date-range scoreboard for the playoff window
 * - Extracts today's games + current series status per matchup
 * - In-memory cache (60s) so multiple users polling doesn't hammer ESPN
 * - Returns a normalized shape for our client
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60_000; // 60 seconds
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

// Playoff date window — wide enough to cover first round through finals
const PLAYOFF_START = "20260418";
const PLAYOFF_END = "20260630";

/** ESPN team abbreviation → our internal abbreviation.
 *  Most line up 1:1; a few differ.
 */
const ESPN_TO_OURS: Record<string, string> = {
  // West
  OKC: "OKC",
  SA: "SAS",
  SAS: "SAS",
  DEN: "DEN",
  LAL: "LAL",
  HOU: "HOU",
  MIN: "MIN",
  POR: "POR",
  PHX: "PHX",
  PHO: "PHX",
  GS: "GSW",
  GSW: "GSW",
  LAC: "LAC",
  // East
  DET: "DET",
  BOS: "BOS",
  NYK: "NYK",
  NY: "NYK",
  CLE: "CLE",
  TOR: "TOR",
  ATL: "ATL",
  PHI: "PHI",
  ORL: "ORL",
  CHA: "CHA",
  MIA: "MIA",
  CHI: "CHI",
};

function toOurs(espnAbbr?: string): string | null {
  if (!espnAbbr) return null;
  const upper = espnAbbr.toUpperCase();
  return ESPN_TO_OURS[upper] ?? upper;
}

export interface LiveGame {
  id: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  state: "pre" | "in" | "post";
  detail: string; // e.g. "7:30 PM EDT" | "Q3 2:15" | "Final"
  tipoffIso?: string;
  seriesSummary?: string; // "OKC leads series 2-1" (ESPN's string)
}

export interface SeriesStatus {
  /** Sorted pair of our abbreviations, e.g. "OKC_PHX" */
  key: string;
  teamA: string;
  teamB: string;
  winsA: number;
  winsB: number;
  lead: string | null; // team abbr or null if tied
  complete: boolean;
  summary: string;
}

interface CachedResponse {
  at: number;
  data: { games: LiveGame[]; series: Record<string, SeriesStatus> };
}

// Module-level cache. Resets on cold start — fine for serverless.
let cached: CachedResponse | null = null;

interface EspnCompetitor {
  team?: { abbreviation?: string; displayName?: string; shortDisplayName?: string };
  score?: string;
  homeAway?: string;
  records?: Array<{ type?: string; summary?: string }>;
}

interface EspnSeries {
  type?: string;
  summary?: string;
  totalCompetitions?: number;
  competitors?: Array<{
    team?: { abbreviation?: string };
    wins?: number;
    ties?: number;
  }>;
}

interface EspnEvent {
  id: string;
  date?: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: {
      type?: { state?: string; shortDetail?: string; completed?: boolean };
    };
    series?: EspnSeries;
  }>;
}

function extractGame(event: EspnEvent): LiveGame | null {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const homeAbbr = toOurs(home.team?.abbreviation) ?? home.team?.abbreviation ?? "";
  const awayAbbr = toOurs(away.team?.abbreviation) ?? away.team?.abbreviation ?? "";
  const state = (comp.status?.type?.state as "pre" | "in" | "post") ?? "pre";
  const detail = comp.status?.type?.shortDetail ?? "";

  return {
    id: event.id,
    homeAbbr,
    awayAbbr,
    homeName: home.team?.shortDisplayName || home.team?.displayName || homeAbbr,
    awayName: away.team?.shortDisplayName || away.team?.displayName || awayAbbr,
    homeScore: parseInt(home.score ?? "0", 10) || 0,
    awayScore: parseInt(away.score ?? "0", 10) || 0,
    state,
    detail,
    tipoffIso: event.date,
    seriesSummary: comp.series?.summary,
  };
}

/** Build series key as sorted abbreviation pair: "OKC_PHX" */
function seriesKey(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function extractSeriesMap(events: EspnEvent[]): Record<string, SeriesStatus> {
  // Build a map keyed by unordered team pair. Use the GAME's competitors
  // for reliable team abbreviations, and prefer the LATEST game's series
  // data so the record we show is always current.
  const byKey: Record<string, { event: EspnEvent; date: number; teamA: string; teamB: string }> = {};

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp?.series) continue;
    const gameCompetitors = comp.competitors;
    if (!gameCompetitors || gameCompetitors.length < 2) continue;
    const teamA = toOurs(gameCompetitors[0].team?.abbreviation);
    const teamB = toOurs(gameCompetitors[1].team?.abbreviation);
    if (!teamA || !teamB) continue;
    const key = seriesKey(teamA, teamB);
    const date = new Date(event.date ?? 0).getTime();
    const prev = byKey[key];
    if (!prev || date > prev.date) {
      byKey[key] = { event, date, teamA, teamB };
    }
  }

  const out: Record<string, SeriesStatus> = {};
  for (const key of Object.keys(byKey)) {
    const { event, teamA, teamB } = byKey[key];
    const comp = event.competitions?.[0];
    const series = comp?.series;
    if (!series) continue;

    // Derive wins: prefer series.competitors[*].wins, fallback to parsing
    // summary string like "OKC leads series 2-1".
    let winsA = 0;
    let winsB = 0;
    if (series.competitors && series.competitors.length >= 2) {
      for (const sc of series.competitors) {
        const abbr = toOurs(sc.team?.abbreviation);
        const wins = sc.wins ?? 0;
        if (abbr === teamA) winsA = wins;
        else if (abbr === teamB) winsB = wins;
      }
    }
    // Fallback: parse summary e.g. "OKC leads series 2-1"
    if (winsA === 0 && winsB === 0 && series.summary) {
      const m = /(\w+)\s+leads?\s+series\s+(\d+)-(\d+)/i.exec(series.summary);
      if (m) {
        const leader = toOurs(m[1]);
        const hi = parseInt(m[2], 10);
        const lo = parseInt(m[3], 10);
        if (leader === teamA) { winsA = hi; winsB = lo; }
        else if (leader === teamB) { winsB = hi; winsA = lo; }
      }
    }

    const lead = winsA > winsB ? teamA : winsB > winsA ? teamB : null;
    const complete = winsA >= 4 || winsB >= 4;
    const summary =
      series.summary && series.summary.trim().length > 0
        ? series.summary
        : winsA === 0 && winsB === 0
          ? `${teamA} vs ${teamB}`
          : lead
            ? `${lead} leads ${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}`
            : `Tied ${winsA}-${winsB}`;

    out[key] = { key, teamA, teamB, winsA, winsB, lead, complete, summary };
  }

  return out;
}

function todayBucketGames(games: LiveGame[]): LiveGame[] {
  // "Today" from ET perspective (NBA games are scheduled in ET).
  // Return games whose tipoff is today or whose state is "in".
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return games
    .filter((g) => {
      if (g.state === "in") return true;
      if (!g.tipoffIso) return false;
      const t = new Date(g.tipoffIso).getTime();
      return Math.abs(t - now) < oneDay;
    })
    .sort((a, b) => {
      // live first, then by tipoff time
      if (a.state === "in" && b.state !== "in") return -1;
      if (b.state === "in" && a.state !== "in") return 1;
      const ta = a.tipoffIso ? new Date(a.tipoffIso).getTime() : 0;
      const tb = b.tipoffIso ? new Date(b.tipoffIso).getTime() : 0;
      return ta - tb;
    });
}

async function fetchEspn(): Promise<{ games: LiveGame[]; series: Record<string, SeriesStatus> }> {
  const url = `${ESPN_BASE}?dates=${PLAYOFF_START}-${PLAYOFF_END}&limit=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "nba-bracket-challenge/1.0" },
    // Next.js caches fetch responses by default; we also have our own cache
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`ESPN responded ${res.status}`);
  }
  const json = (await res.json()) as { events?: EspnEvent[] };
  const events = json.events ?? [];
  const allGames: LiveGame[] = events
    .map((e) => extractGame(e))
    .filter((g): g is LiveGame => g !== null);
  const series = extractSeriesMap(events);
  const games = todayBucketGames(allGames);
  return { games, series };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, ...cached.data });
    }
    const data = await fetchEspn();
    cached = { at: now, data };
    console.log(
      `[nba-status] fetched: ${data.games.length} games, ${Object.keys(data.series).length} series`,
      Object.keys(data.series)
    );
    return NextResponse.json({ ok: true, cached: false, ...data });
  } catch (err) {
    console.error("[nba-status] error:", err);
    // If we have stale data, serve it instead of failing entirely
    if (cached) {
      return NextResponse.json({
        ok: true,
        stale: true,
        error: String((err as Error).message || err),
        ...cached.data,
      });
    }
    return NextResponse.json(
      { ok: false, error: String((err as Error).message || err), games: [], series: {} },
      { status: 502 }
    );
  }
}

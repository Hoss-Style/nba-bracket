"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNbaStatus, type LiveGame, type SeriesStatus } from "@/lib/nbaStatus";
import { getTeamByAbbr } from "@/lib/teams";

const POLL_MS = 30_000;

function formatTipoff(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function GameCard({ game }: { game: LiveGame }) {
  const home = getTeamByAbbr(game.homeAbbr);
  const away = getTeamByAbbr(game.awayAbbr);
  const isLive = game.state === "in";
  const isFinal = game.state === "post";
  const isPre = game.state === "pre";

  return (
    <div className={`games-card games-card-${game.state}`}>
      <div className="games-card-teams">
        <div className="games-card-team">
          <span
            className="games-card-team-dot"
            style={{ background: away?.primaryColor ?? "#888" }}
            aria-hidden
          />
          <span className="games-card-team-name">{game.awayName}</span>
          <span className="games-card-team-score">{game.awayScore}</span>
        </div>
        <div className="games-card-team">
          <span
            className="games-card-team-dot"
            style={{ background: home?.primaryColor ?? "#888" }}
            aria-hidden
          />
          <span className="games-card-team-name">{game.homeName}</span>
          <span className="games-card-team-score">{game.homeScore}</span>
        </div>
      </div>
      <div className="games-card-footer">
        {isLive && <span className="games-card-live">● LIVE</span>}
        <span className="games-card-detail">
          {isPre ? formatTipoff(game.tipoffIso) || game.detail : game.detail}
        </span>
        {game.seriesSummary && (
          <span className="games-card-series">{game.seriesSummary}</span>
        )}
      </div>
      {isFinal && game.seriesSummary && game.seriesSummary.toLowerCase().includes("win") && (
        <div className="games-card-series-won" aria-hidden>🏆</div>
      )}
    </div>
  );
}

export default function GamesWidget() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [, setSeries] = useState<Record<string, SeriesStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchNbaStatus();
      if (cancelled) return;
      if (!data) {
        setError(true);
        setLoading(false);
        return;
      }
      setGames(data.games);
      setSeries(data.series);
      setError(false);
      setLoading(false);
      setLastUpdated(Date.now());
    };

    load();

    // Poll while tab visible
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(load, POLL_MS);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        load();
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const { live, upcoming, recent } = useMemo(() => {
    const live = games.filter((g) => g.state === "in");
    const upcoming = games.filter((g) => g.state === "pre");
    const recent = games.filter((g) => g.state === "post");
    return { live, upcoming, recent };
  }, [games]);

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return "";
    const secs = Math.floor((Date.now() - lastUpdated) / 1000);
    if (secs < 10) return "just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }, [lastUpdated]);

  return (
    <section className="games-widget" aria-labelledby="games-widget-heading">
      <div className="games-widget-header">
        <h2 id="games-widget-heading" className="games-widget-title">Games</h2>
        <p className="games-widget-sub">
          Live scores and series status, powered by ESPN.
        </p>
      </div>

      {loading ? (
        <div className="games-widget-card games-widget-empty">
          <p>Loading scores…</p>
        </div>
      ) : error && games.length === 0 ? (
        <div className="games-widget-card games-widget-empty">
          <p>Couldn&apos;t reach the live scores right now.</p>
          <p className="games-widget-empty-sub">We&apos;ll retry automatically.</p>
        </div>
      ) : games.length === 0 ? (
        <div className="games-widget-card games-widget-empty">
          <p>No games scheduled today.</p>
          <p className="games-widget-empty-sub">Check back during a playoff game day.</p>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="games-widget-section">
              <div className="games-widget-section-title">Live</div>
              <div className="games-widget-list">
                {live.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="games-widget-section">
              <div className="games-widget-section-title">Upcoming today</div>
              <div className="games-widget-list">
                {upcoming.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
          {recent.length > 0 && (
            <div className="games-widget-section">
              <div className="games-widget-section-title">Final</div>
              <div className="games-widget-list">
                {recent.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
          <div className="games-widget-updated">
            Updates every 30s · last refreshed {updatedLabel}
          </div>
        </>
      )}
    </section>
  );
}

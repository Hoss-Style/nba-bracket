"use client";

import { useState, useEffect, useMemo } from "react";
import Nav from "@/components/Nav";
import { ScoreBreakdown, BracketPicks, Entry } from "@/lib/types";

type ActualResultsLite = { picks: BracketPicks; finalsMVP: string };
import { getAllEntries, getActualResults } from "@/lib/supabase";
import { calculateScore, calculateMaxPotential } from "@/lib/scoring";
import { getTeamByAbbr } from "@/lib/teams";
import { isBeforeDeadline } from "@/lib/deadline";
import { SkeletonRows } from "@/components/Skeleton";

interface RankedEntry {
  id: string;
  name: string;
  email: string;
  score: ScoreBreakdown;
  maxPotential: number;
  champion: string;
  finalsMVP: string;
  picks: BracketPicks;
}

// Polling cadence (only while tab is visible)
const RESULTS_POLL_MS = 30_000;   // every 30s — small payload
const ENTRIES_POLL_MS = 300_000;  // every 5min — catches new signups / admin edits
const DEADLINE_TICK_MS = 5_000;   // every 5s near the deadline boundary

export default function ScoreboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [results, setResults] = useState<ActualResultsLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [beforeDeadline, setBeforeDeadline] = useState(isBeforeDeadline());

  useEffect(() => {
    const stored = localStorage.getItem("bracket_user");
    if (stored) {
      try {
        setCurrentUserEmail(JSON.parse(stored).email);
      } catch { /* ignore */ }
    }
  }, []);

  // Initial load: entries + results together
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, r] = await Promise.all([getAllEntries(), getActualResults()]);
        if (cancelled) return;
        setEntries(e);
        setResults(r);
      } catch (err) {
        console.error("Failed to load scoreboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Smart polling: only while tab is visible
  // - results every 30s (small, fresh scores)
  // - entries every 5min (new signups / admin edits)
  // - deadline check every 5s so blurs clear right at the deadline
  useEffect(() => {
    let resultsInt: ReturnType<typeof setInterval> | null = null;
    let entriesInt: ReturnType<typeof setInterval> | null = null;
    let deadlineInt: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (resultsInt || entriesInt || deadlineInt) return;
      resultsInt = setInterval(async () => {
        try {
          const r = await getActualResults();
          if (r) setResults(r);
        } catch { /* keep last good state on transient error */ }
      }, RESULTS_POLL_MS);
      entriesInt = setInterval(async () => {
        try {
          const e = await getAllEntries();
          setEntries(e);
        } catch { /* keep last good state */ }
      }, ENTRIES_POLL_MS);
      deadlineInt = setInterval(() => {
        setBeforeDeadline(isBeforeDeadline());
      }, DEADLINE_TICK_MS);
    };

    const stop = () => {
      if (resultsInt) clearInterval(resultsInt);
      if (entriesInt) clearInterval(entriesInt);
      if (deadlineInt) clearInterval(deadlineInt);
      resultsInt = entriesInt = deadlineInt = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Immediate refresh on tab focus so users see latest on return
        setBeforeDeadline(isBeforeDeadline());
        getActualResults().then((r) => r && setResults(r)).catch(() => {});
        start();
      } else {
        stop();
      }
    };

    // Start immediately (assume visible on mount)
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Compute rankings from cached entries + freshest results
  const { rankings, hasResults } = useMemo<{ rankings: RankedEntry[]; hasResults: boolean }>(() => {
    if (results) {
      const ranked = entries.map((entry) => {
        const score = calculateScore(entry.picks, results.picks, results.finalsMVP);
        const maxPotential = calculateMaxPotential(entry.picks, results.picks, results.finalsMVP);
        const champion = entry.picks.finals?.winner || "—";
        return {
          id: entry.id || "",
          name: entry.name,
          email: entry.email,
          score,
          maxPotential,
          champion: getTeamByAbbr(champion)?.name || champion,
          finalsMVP: entry.picks.finalsMVP || "—",
          picks: entry.picks,
        };
      }).sort((a, b) => b.score.total - a.score.total);
      return { rankings: ranked, hasResults: true };
    }
    const ranked = entries.map((entry) => {
      const champion = entry.picks.finals?.winner || "—";
      return {
        id: entry.id || "",
        name: entry.name,
        email: entry.email,
        score: { correctWinners: 0, correctGames: 0, upsetBonuses: 0, finalsMVP: 0, total: 0 },
        maxPotential: 0,
        champion: getTeamByAbbr(champion)?.name || champion,
        finalsMVP: entry.picks.finalsMVP || "—",
        picks: entry.picks,
      };
    });
    return { rankings: ranked, hasResults: false };
  }, [entries, results]);

  const getRankClass = (i: number) => {
    if (i === 0) return "rank-1";
    if (i === 1) return "rank-2";
    if (i === 2) return "rank-3";
    return "rank-other";
  };

  return (
    <>
      <Nav />
      <div className="nav-spacer">
        <div className="page-container" style={{ paddingTop: "1rem" }}>

          {loading ? (
            <div style={{ padding: "1rem 0" }}>
              <SkeletonRows count={6} />
            </div>
          ) : rankings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>No entries yet.</p>
              <a href="/bracket" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                Be the first &rarr;
              </a>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="scoreboard-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>Rank</th>
                    <th>Name</th>
                    <th className="scoreboard-conf-th"><span className="scoreboard-full">W. Champ</span><span className="scoreboard-abbr">W</span></th>
                    <th className="scoreboard-conf-th"><span className="scoreboard-full">E. Champ</span><span className="scoreboard-abbr">E</span></th>
                    <th>Champion</th>
                    <th>MVP</th>
                    <th>{hasResults ? "Pts" : "Total"}</th>
                    {hasResults && <th>Max</th>}
                    <th style={{ width: "70px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((entry, i) => (
                    <tr key={entry.email + i} className="scoreboard-row">
                      <td>
                        <span className={`rank-badge ${getRankClass(i)}`}>
                          {hasResults ? i + 1 : "—"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.name}</td>
                      {(() => {
                        const isCurrentUser = entry.email === currentUserEmail;
                        const hidden = beforeDeadline && !isCurrentUser;
                        const westChamp = getTeamByAbbr(entry.picks.westCF?.winner || "");
                        const eastChamp = getTeamByAbbr(entry.picks.eastCF?.winner || "");
                        return (
                          <>
                            <td className="scoreboard-conf-cell">
                              <span className={hidden ? "picks-blurred" : ""}>
                                <span className="scoreboard-full">{westChamp?.name || "—"}</span>
                                <span className="scoreboard-abbr">{westChamp?.abbreviation || "—"}</span>
                              </span>
                            </td>
                            <td className="scoreboard-conf-cell">
                              <span className={hidden ? "picks-blurred" : ""}>
                                <span className="scoreboard-full">{eastChamp?.name || "—"}</span>
                                <span className="scoreboard-abbr">{eastChamp?.abbreviation || "—"}</span>
                              </span>
                            </td>
                            <td className="scoreboard-champion-mobile">
                              <span className={hidden ? "picks-blurred" : ""}>{entry.champion}</span>
                            </td>
                            <td className="scoreboard-mvp-mobile text-muted">
                              <span className={hidden ? "picks-blurred" : ""}>{entry.finalsMVP}</span>
                            </td>
                          </>
                        );
                      })()}
                      <td>
                        <span className={hasResults ? "score-total" : "text-muted"}>
                          {hasResults ? entry.score.total : "—"}
                        </span>
                      </td>
                      {hasResults && (
                        <td>
                          <span className="score-max-potential">{entry.maxPotential}</span>
                        </td>
                      )}
                      <td>
                        {entry.id && (
                          (!beforeDeadline || entry.email === currentUserEmail) ? (
                            <a href={`/bracket/${entry.id}`} className="btn btn-secondary btn-sm scoreboard-view-btn">
                              View
                            </a>
                          ) : (
                            <span className="btn btn-secondary btn-sm scoreboard-view-btn scoreboard-locked-btn" data-tooltip="Locked until tipoff">
                              &#128274;
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payout Info */}
          {rankings.length >= 3 && (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem", flexWrap: "wrap" }}>
              {[
                { label: "1st Place", pct: "65%", color: "var(--accent-gold)" },
                { label: "2nd Place", pct: "25%", color: "#c0c0c0" },
                { label: "3rd Place", pct: "10%", color: "#cd7f32" },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "1rem 1.5rem",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: p.color }}>{p.pct}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

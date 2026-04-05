"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import { ScoreBreakdown, BracketPicks } from "@/lib/types";
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

export default function ScoreboardPage() {
  const [rankings, setRankings] = useState<RankedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResults, setHasResults] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const beforeDeadline = isBeforeDeadline();

  useEffect(() => {
    const stored = localStorage.getItem("bracket_user");
    if (stored) {
      try {
        setCurrentUserEmail(JSON.parse(stored).email);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [allEntries, results] = await Promise.all([
          getAllEntries(),
          getActualResults(),
        ]);

        if (results) {
          setHasResults(true);
          const ranked = allEntries
            .map((entry) => {
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
            })
            .sort((a, b) => b.score.total - a.score.total);
          setRankings(ranked);
        } else {
          const ranked = allEntries.map((entry) => {
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
          setRankings(ranked);
        }
      } catch (err) {
        console.error("Failed to load scoreboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
                    <th>Champion</th>
                    <th>MVP</th>
                    <th>{hasResults ? "Pts" : "Total"}</th>
                    {hasResults && <th className="scoreboard-hide-mobile">Max</th>}
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
                        return (
                          <>
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
                        <td className="scoreboard-hide-mobile">
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

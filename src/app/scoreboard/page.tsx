"use client";

import { useState, useEffect, Fragment } from "react";
import Nav from "@/components/Nav";
import { Entry, ScoreBreakdown, BracketPicks } from "@/lib/types";
import { getAllEntries, getActualResults } from "@/lib/supabase";
import { calculateScore } from "@/lib/scoring";
import { getTeamByAbbr } from "@/lib/teams";
import { isBeforeDeadline } from "@/lib/deadline";

interface RankedEntry {
  id: string;
  name: string;
  email: string;
  score: ScoreBreakdown;
  champion: string;
  finalsMVP: string;
  picks: BracketPicks;
}

function getHighlightColor(abbr: string): string {
  const team = getTeamByAbbr(abbr);
  if (!team) return "var(--text-muted)";
  const getBrightness = (hex: string) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };
  const lighten = (hex: string, amount: number) => {
    const h = hex.replace("#", "");
    const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
    const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };
  const pb = getBrightness(team.primaryColor);
  const sb = team.secondaryColor ? getBrightness(team.secondaryColor) : 0;
  if (pb >= 100) return team.primaryColor;
  if (sb >= 100) return team.secondaryColor;
  const base = pb >= sb ? team.primaryColor : (team.secondaryColor || team.primaryColor);
  return lighten(base, 80);
}

// Helper to describe a pick in short form
function describePicksSummary(picks: BracketPicks): { west: { text: string; abbr: string }[]; east: { text: string; abbr: string }[] } {
  const descSeries = (pick: { winner: string; games: number } | null) => {
    if (!pick) return { text: "—", abbr: "" };
    const team = getTeamByAbbr(pick.winner);
    return { text: `${team?.name || pick.winner} in ${pick.games}`, abbr: pick.winner };
  };

  return {
    west: [
      descSeries(picks.westR1_1), descSeries(picks.westR1_2),
      descSeries(picks.westR1_3), descSeries(picks.westR1_4),
      descSeries(picks.westR2_1), descSeries(picks.westR2_2),
      descSeries(picks.westCF),
    ],
    east: [
      descSeries(picks.eastR1_1), descSeries(picks.eastR1_2),
      descSeries(picks.eastR1_3), descSeries(picks.eastR1_4),
      descSeries(picks.eastR2_1), descSeries(picks.eastR2_2),
      descSeries(picks.eastCF),
    ],
  };
}

export default function ScoreboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rankings, setRankings] = useState<RankedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResults, setHasResults] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const canEdit = isBeforeDeadline();

  useEffect(() => {
    async function load() {
      try {
        const [allEntries, results] = await Promise.all([
          getAllEntries(),
          getActualResults(),
        ]);

        setEntries(allEntries);

        if (results) {
          setHasResults(true);
          const ranked = allEntries
            .map((entry) => {
              const score = calculateScore(entry.picks, results.picks, results.finalsMVP);
              const champion = entry.picks.finals?.winner || "—";
              return {
                id: entry.id || "",
                name: entry.name,
                email: entry.email,
                score,
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

  const roundLabels = ["R1", "R1", "R1", "R1", "Semis", "Semis", "Conf. Finals"];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: "4rem" }}>
        <div className="page-container">
          <div className="page-header">
            <h1>Scoreboard</h1>
            <p>
              {hasResults
                ? "Live standings updated as results come in."
                : "Entries locked in. Scores will populate once the playoffs begin."}
            </p>
            {entries.length > 0 && (
              <div className="entry-count">
                <span className="entry-count-dot" />
                {entries.length} {entries.length === 1 ? "entry" : "entries"} submitted
              </div>
            )}
            {canEdit && (
              <div style={{ marginTop: "0.75rem" }}>
                <a href="/bracket" className="btn btn-secondary btn-sm">
                  Edit My Picks
                </a>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Loading scoreboard...
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
                    <th>Player</th>
                    <th>Champion Pick</th>
                    <th>Finals MVP</th>
                    {hasResults && (
                      <>
                        <th>Winners</th>
                        <th>Games</th>
                        <th>Upsets</th>
                        <th>MVP</th>
                      </>
                    )}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((entry, i) => {
                    const rowKey = entry.email + i;
                    const isExpanded = expandedRow === rowKey;
                    const summary = isExpanded ? describePicksSummary(entry.picks) : null;

                    const renderPickRows = (picks: { text: string; abbr: string }[]) => {
                      const elements: React.ReactNode[] = [];
                      picks.forEach((pick, j) => {
                        // Add divider before Semis (index 4) and Conf Finals (index 6)
                        if (j === 4 || j === 6) {
                          elements.push(<div key={`div-${j}`} className="picks-detail-divider" />);
                        }
                        elements.push(
                          <div key={j} className="picks-detail-row">
                            <span className="picks-detail-round">{roundLabels[j]}</span>
                            <span className="picks-detail-pick">
                              {pick.abbr && <span className="picks-detail-color-dot" style={{ background: getHighlightColor(pick.abbr) }} />}
                              {pick.text}
                            </span>
                          </div>
                        );
                      });
                      return elements;
                    };

                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className="scoreboard-row"
                          onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <span className={`rank-badge ${getRankClass(i)}`}>
                              {hasResults ? i + 1 : "—"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {entry.name}
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </td>
                          <td>{entry.champion}</td>
                          <td className="text-muted">{entry.finalsMVP}</td>
                          {hasResults && (
                            <>
                              <td className="score-detail">{entry.score.correctWinners}</td>
                              <td className="score-detail">{entry.score.correctGames}</td>
                              <td className="score-detail">{entry.score.upsetBonuses}</td>
                              <td className="score-detail">{entry.score.finalsMVP > 0 ? "10" : "0"}</td>
                            </>
                          )}
                          <td>
                            <span className={hasResults ? "score-total" : "text-muted"}>
                              {hasResults ? entry.score.total : "—"}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && summary && (
                          <tr key={rowKey + "-detail"} className="scoreboard-row">
                            <td colSpan={hasResults ? 9 : 5} style={{ padding: "0 1rem 1rem" }}>
                              <div className="picks-detail">
                                <div className="picks-detail-conf">
                                  <div className="picks-detail-title" style={{ color: "var(--accent-blue)" }}>West</div>
                                  {renderPickRows(summary.west)}
                                </div>
                                <div className="picks-detail-conf">
                                  <div className="picks-detail-title" style={{ color: "var(--accent-red)" }}>East</div>
                                  {renderPickRows(summary.east)}
                                </div>
                                <div className="picks-detail-conf">
                                  <div className="picks-detail-title" style={{ color: "var(--accent-gold)" }}>Finals</div>
                                  <div className="picks-detail-row">
                                    <span className="picks-detail-round">Champ</span>
                                    <span className="picks-detail-pick">
                                      {entry.picks.finals?.winner && <span className="picks-detail-color-dot" style={{ background: getHighlightColor(entry.picks.finals.winner) }} />}
                                      {entry.champion} {entry.picks.finals ? `in ${entry.picks.finals.games}` : ""}
                                    </span>
                                  </div>
                                  <div className="picks-detail-row">
                                    <span className="picks-detail-round">MVP</span>
                                    <span className="picks-detail-pick">{entry.finalsMVP}</span>
                                  </div>
                                </div>
                                {entry.id && (
                                  <div className="picks-detail-actions">
                                    <a href={`/bracket/${entry.id}`} className="btn btn-secondary btn-sm">
                                      View Full Bracket &rarr;
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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

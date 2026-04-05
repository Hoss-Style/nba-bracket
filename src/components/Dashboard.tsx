"use client";

import { useState, useEffect } from "react";
import { BracketUser, Entry, BracketPicks, MatchupPick } from "@/lib/types";
import { getEntryByEmail, getAllEntries } from "@/lib/supabase";
import { getTimeUntilDeadline, isBeforeDeadline, DEADLINE_DISPLAY } from "@/lib/deadline";
import { getTeamByAbbr } from "@/lib/teams";

interface DashboardProps {
  user: BracketUser;
}

interface CommunityStats {
  totalEntries: number;
  topChampion: { abbr: string; name: string; color: string; count: number; pct: number } | null;
  topUpsets: { abbr: string; name: string; count: number; pct: number }[];
}

function computeCommunityStats(entries: Entry[]): CommunityStats | null {
  const submitted = entries.filter((e) => e.picks.westR1_1 !== null);
  if (submitted.length === 0) return null;

  // Most picked champion
  const championCounts: Record<string, number> = {};
  for (const e of submitted) {
    const champ = e.picks.finals?.winner;
    if (champ) championCounts[champ] = (championCounts[champ] || 0) + 1;
  }
  const sortedChamps = Object.entries(championCounts).sort((a, b) => b[1] - a[1]);
  const topChampion = sortedChamps[0]
    ? (() => {
        const team = getTeamByAbbr(sortedChamps[0][0]);
        return team
          ? { abbr: sortedChamps[0][0], name: team.name, color: team.primaryColor, count: sortedChamps[0][1], pct: Math.round((sortedChamps[0][1] / submitted.length) * 100) }
          : null;
      })()
    : null;

  // Popular upsets (R1 picks where lower seed wins)
  const upsetCounts: Record<string, number> = {};
  const r1Keys: (keyof BracketPicks)[] = [
    "westR1_1", "westR1_2", "westR1_3", "westR1_4",
    "eastR1_1", "eastR1_2", "eastR1_3", "eastR1_4",
  ];
  for (const e of submitted) {
    for (const key of r1Keys) {
      const pick = e.picks[key] as MatchupPick | null;
      if (pick) {
        const team = getTeamByAbbr(pick.winner);
        if (team && team.seed > 4) {
          upsetCounts[pick.winner] = (upsetCounts[pick.winner] || 0) + 1;
        }
      }
    }
  }
  const topUpsets = Object.entries(upsetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([abbr, count]) => {
      const team = getTeamByAbbr(abbr);
      return { abbr, name: team?.name || abbr, count, pct: Math.round((count / submitted.length) * 100) };
    });

  return { totalEntries: submitted.length, topChampion, topUpsets };
}

export default function Dashboard({ user }: DashboardProps) {
  const [countdown, setCountdown] = useState(getTimeUntilDeadline());
  const [userEntry, setUserEntry] = useState<Entry | null>(null);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [entry, allEntries] = await Promise.all([
          getEntryByEmail(user.email),
          getAllEntries(),
        ]);
        if (entry && entry.picks.westR1_1 !== null) {
          setUserEntry(entry);
        }
        setStats(computeCommunityStats(allEntries));
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.email]);

  const hasSubmitted = userEntry !== null;
  const beforeDeadline = isBeforeDeadline();
  const champion = hasSubmitted ? getTeamByAbbr(userEntry.picks.finals?.winner || "") : null;
  const mvp = hasSubmitted ? userEntry.picks.finalsMVP : "";

  return (
    <div className="dashboard">
      {/* Welcome */}
      <h1 className="dashboard-welcome">
        Hey, {user.name} <span className="dashboard-wave">&#128075;</span>
      </h1>

      {/* Countdown */}
      <div className="dashboard-countdown">
        {countdown.expired ? (
          <div className="dashboard-expired">
            <span className="dashboard-expired-icon">&#127936;</span>
            <span>Playoffs Have Started!</span>
          </div>
        ) : (
          <>
            <div className="dashboard-countdown-label">Picks lock {DEADLINE_DISPLAY}</div>
            <div className="dashboard-countdown-grid">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hrs" },
                { value: countdown.minutes, label: "Min" },
                { value: countdown.seconds, label: "Sec" },
              ].map((unit) => (
                <div key={unit.label} className="dashboard-countdown-unit">
                  <div className="dashboard-countdown-number">{String(unit.value).padStart(2, "0")}</div>
                  <div className="dashboard-countdown-suffix">{unit.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bracket Status */}
      <div className="dashboard-card">
        <div className="dashboard-card-title">Your Bracket</div>
        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading...</div>
        ) : hasSubmitted ? (
          <>
            <div className="dashboard-picks-summary">
              <div className="dashboard-pick-row">
                <span className="dashboard-pick-label">Champion</span>
                {champion ? (
                  <span
                    className="dashboard-champion-badge"
                    style={{ background: `${champion.primaryColor}20`, color: champion.primaryColor, border: `1px solid ${champion.primaryColor}40` }}
                  >
                    <span className="dashboard-champion-seed">{champion.seed}</span>
                    {champion.name}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>--</span>
                )}
              </div>
              <div className="dashboard-pick-row">
                <span className="dashboard-pick-label">Finals MVP</span>
                <span className="dashboard-mvp-badge">{mvp || "--"}</span>
              </div>
            </div>
            <div className="dashboard-actions">
              <a href="/bracket" className="btn btn-primary dashboard-action-btn">View Bracket</a>
              {beforeDeadline && (
                <a href="/bracket" className="btn btn-secondary dashboard-action-btn" onClick={() => {
                  sessionStorage.setItem("bracket_edit_mode", "true");
                }}>Edit Picks</a>
              )}
              <a href="/scoreboard" className="btn btn-secondary dashboard-action-btn">Scoreboard</a>
            </div>
          </>
        ) : (
          <div className="dashboard-no-bracket">
            <div className="dashboard-no-bracket-icon">&#128203;</div>
            <p className="dashboard-no-bracket-text">
              {beforeDeadline
                ? "You haven't filled out your bracket yet!"
                : "You didn't submit a bracket before the deadline."}
            </p>
            {beforeDeadline && (
              <a href="/bracket" className="btn btn-accent dashboard-cta">
                Make Your Picks &rarr;
              </a>
            )}
          </div>
        )}
      </div>

      {/* Community Stats */}
      <div className="dashboard-card">
        <div className="dashboard-card-title">Community</div>
        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading...</div>
        ) : !stats ? (
          <div className="dashboard-no-bracket">
            <div className="dashboard-no-bracket-icon">&#128064;</div>
            <p className="dashboard-no-bracket-text">No brackets submitted yet. Be the first!</p>
          </div>
        ) : (
          <>
            <div className="dashboard-stats-grid">
              <div className="dashboard-stat">
                <div className="dashboard-stat-value">{stats.totalEntries}</div>
                <div className="dashboard-stat-label">Brackets Submitted</div>
              </div>
              {stats.topChampion && (
                <div className="dashboard-stat">
                  <div className="dashboard-stat-value" style={{ color: stats.topChampion.color }}>
                    {stats.topChampion.pct}%
                  </div>
                  <div className="dashboard-stat-label">
                    picked <strong>{stats.topChampion.name}</strong> to win it all
                  </div>
                </div>
              )}
            </div>
            {stats.topUpsets.length > 0 && (
              <div className="dashboard-upsets">
                <div className="dashboard-upsets-title">Popular Upsets</div>
                <div className="dashboard-upsets-list">
                  {stats.topUpsets.map((u) => (
                    <div key={u.abbr} className="dashboard-upset-item">
                      <span className="dashboard-upset-name">{u.name}</span>
                      <span className="dashboard-upset-pct">{u.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

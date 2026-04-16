"use client";

import { useState, useEffect } from "react";
import { BracketUser, Entry, BracketPicks, MatchupPick } from "@/lib/types";
import { getEntryByEmail, getAllEntries } from "@/lib/supabase";
import { getTimeUntilDeadline, isBeforeDeadline } from "@/lib/deadline";
import { getTeamByAbbr } from "@/lib/teams";
import { getEntryFeeDollars } from "@/lib/prizePool";
import Image from "next/image";
import { SkeletonCard } from "@/components/Skeleton";
import CommunityFeed from "@/components/CommunityFeed";

interface DashboardProps {
  user: BracketUser;
}

interface TeamStat { abbr: string; name: string; color: string; count: number; pct: number }

interface CommunityStats {
  totalEntries: number;
  topChampion: TeamStat | null;
  topWestChamp: TeamStat | null;
  topEastChamp: TeamStat | null;
  topMVP: { name: string; count: number; pct: number } | null;
  topUpsets: { abbr: string; name: string; count: number; pct: number }[];
}

function topTeamPick(submitted: Entry[], getter: (e: Entry) => string | undefined): TeamStat | null {
  const counts: Record<string, number> = {};
  for (const e of submitted) {
    const val = getter(e);
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted[0]) return null;
  const team = getTeamByAbbr(sorted[0][0]);
  return team
    ? { abbr: sorted[0][0], name: team.name, color: team.primaryColor, count: sorted[0][1], pct: Math.round((sorted[0][1] / submitted.length) * 100) }
    : null;
}

function computeCommunityStats(entries: Entry[]): CommunityStats | null {
  const submitted = entries.filter((e) => e.picks?.westR1_2 != null);
  if (submitted.length === 0) return null;

  const topChampion = topTeamPick(submitted, (e) => e.picks.finals?.winner);
  const topWestChamp = topTeamPick(submitted, (e) => e.picks.westCF?.winner);
  const topEastChamp = topTeamPick(submitted, (e) => e.picks.eastCF?.winner);

  // Most picked MVP
  const mvpCounts: Record<string, number> = {};
  for (const e of submitted) {
    const mvp = e.picks.finalsMVP?.trim();
    if (mvp) mvpCounts[mvp] = (mvpCounts[mvp] || 0) + 1;
  }
  const sortedMVPs = Object.entries(mvpCounts).sort((a, b) => b[1] - a[1]);
  const topMVP = sortedMVPs[0]
    ? { name: sortedMVPs[0][0], count: sortedMVPs[0][1], pct: Math.round((sortedMVPs[0][1] / submitted.length) * 100) }
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

  return { totalEntries: submitted.length, topChampion, topWestChamp, topEastChamp, topMVP, topUpsets };
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
        if (entry && entry.picks?.westR1_2 != null) {
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
      {/* Hero: Welcome + Countdown */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-logo">
          <Image src="/logo.png" alt="Lew's Bracket Challenge" width={400} height={240} priority style={{ width: "100%", maxWidth: "280px", height: "auto" }} />
        </div>

        <h1 className="dashboard-welcome">
          Hey, {user.name} <span className="dashboard-wave">&#128075;</span>
        </h1>

        {countdown.expired ? (
          <div className="dashboard-expired">
            <span className="dashboard-expired-icon">&#127936;</span>
            <span>Playoffs Have Started!</span>
          </div>
        ) : (
          <div className="dashboard-countdown">
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
            <div className="dashboard-countdown-label">until picks lock</div>
          </div>
        )}

        {beforeDeadline && (
          <div className="dashboard-fee-reminder">
            <span className="dashboard-fee-icon">&#128176;</span>
            ${getEntryFeeDollars()} entry via Venmo before tipoff
          </div>
        )}
      </div>

      {/* Bracket Status */}
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : hasSubmitted ? (
        <div className="dashboard-card dashboard-bracket-card">
          <div className="dashboard-bracket-header">
            <div className="dashboard-card-title">Your Picks</div>
            <div className="dashboard-bracket-status">&#9989; Submitted</div>
          </div>
          <div className="dashboard-bracket-picks">
            <div className="dashboard-picks-panel">
              <div className="dashboard-champ-section">
                {champion ? (
                  <>
                    <div
                      className="dashboard-champ-icon"
                      style={{ background: `${champion.primaryColor}25`, borderColor: `${champion.primaryColor}50` }}
                    >
                      &#127942;
                    </div>
                    <div className="dashboard-champ-info">
                      <span className="dashboard-champ-label">Champion</span>
                      <span className="dashboard-champ-name" style={{ "--champ-color": champion.primaryColor } as React.CSSProperties}>
                        {champion.name}
                      </span>
                    </div>
                    <span className="dashboard-champ-seed" style={{ "--champ-color": champion.primaryColor, background: `${champion.primaryColor}20`, border: `1px solid ${champion.primaryColor}40` } as React.CSSProperties}>
                      #{champion.seed} seed
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>No champion picked</span>
                )}
              </div>
              <div className="dashboard-mvp-section">
                <span className="dashboard-mvp-label">Finals MVP</span>
                <span className="dashboard-mvp-name" title={mvp || undefined}>{mvp || "—"}</span>
              </div>
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
        </div>
      ) : (
        <div className="dashboard-card dashboard-empty-card">
          <div className="dashboard-empty-icon">&#128203;</div>
          <p className="dashboard-empty-text">
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

      {/* Inline Group Chat */}
      {!loading && (
        <div className="dashboard-chat-inline">
          <CommunityFeed userName={user.name} />
        </div>
      )}

      {/* Community Stats */}
      {!loading && (
        <div className="dashboard-card">
          <div className="dashboard-card-title">Community</div>
          {!stats ? (
            <div className="dashboard-empty-card" style={{ padding: "1rem 0" }}>
              <div className="dashboard-empty-icon">&#128064;</div>
              <p className="dashboard-empty-text">No brackets submitted yet. Be the first!</p>
            </div>
          ) : (
            <>
              <div className="dashboard-stats-row">
                <div className="dashboard-stat-pill">
                  <span className="dashboard-stat-num">{stats.totalEntries}</span>
                  <span className="dashboard-stat-txt">entries</span>
                </div>
                {stats.topChampion && (
                  <div className="dashboard-stat-pill">
                    <span className="dashboard-stat-num" style={{ color: stats.topChampion.color }}>{stats.topChampion.pct}%</span>
                    <span className="dashboard-stat-txt">pick <strong>{stats.topChampion.name}</strong> champ</span>
                  </div>
                )}
              </div>
              <div className="dashboard-stats-row">
                {stats.topWestChamp && (
                  <div className="dashboard-stat-pill">
                    <span className="dashboard-stat-num" style={{ color: stats.topWestChamp.color }}>{stats.topWestChamp.pct}%</span>
                    <span className="dashboard-stat-txt">pick <strong>{stats.topWestChamp.name}</strong> West</span>
                  </div>
                )}
                {stats.topEastChamp && (
                  <div className="dashboard-stat-pill">
                    <span className="dashboard-stat-num" style={{ color: stats.topEastChamp.color }}>{stats.topEastChamp.pct}%</span>
                    <span className="dashboard-stat-txt">pick <strong>{stats.topEastChamp.name}</strong> East</span>
                  </div>
                )}
              </div>
              {stats.topMVP && (
                <div className="dashboard-stats-row">
                  <div className="dashboard-stat-pill">
                    <span className="dashboard-stat-num">{stats.topMVP.pct}%</span>
                    <span className="dashboard-stat-txt">pick <strong>{stats.topMVP.name}</strong> MVP</span>
                  </div>
                </div>
              )}
              {stats.topUpsets.length > 0 && (
                <div className="dashboard-upsets">
                  <div className="dashboard-upsets-title">Popular Upsets</div>
                  <div className="dashboard-upsets-list">
                    {stats.topUpsets.map((u) => (
                      <div key={u.abbr} className="dashboard-upset-item">
                        <span className="dashboard-upset-name">{u.name}</span>
                        <div className="dashboard-upset-bar">
                          <div className="dashboard-upset-fill" style={{ width: `${u.pct}%` }} />
                        </div>
                        <span className="dashboard-upset-pct">{u.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

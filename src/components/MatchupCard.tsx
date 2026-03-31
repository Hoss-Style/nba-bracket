"use client";

import { Team, MatchupPick } from "@/lib/types";

interface MatchupCardProps {
  topTeam: Team | null;
  bottomTeam: Team | null;
  pick: MatchupPick | null;
  onPick: (pick: MatchupPick) => void;
  disabled?: boolean;
  compact?: boolean;
}

const GAME_OPTIONS = [4, 5, 6, 7];

export default function MatchupCard({ topTeam, bottomTeam, pick, onPick, disabled, compact }: MatchupCardProps) {
  const handleTeamClick = (team: Team) => {
    if (disabled) return;
    if (pick?.winner === team.abbreviation) return; // already selected
    onPick({ winner: team.abbreviation, games: pick?.games || 6 });
  };

  const handleGamesChange = (games: number) => {
    if (disabled || !pick) return;
    onPick({ ...pick, games });
  };

  const isTopSelected = pick?.winner === topTeam?.abbreviation;
  const isBottomSelected = pick?.winner === bottomTeam?.abbreviation;
  const selectedTeam = isTopSelected ? topTeam : isBottomSelected ? bottomTeam : null;

  // Pick the most visible color for highlights against dark backgrounds
  const getHighlightColor = (team: Team) => {
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

    const primaryBrightness = getBrightness(team.primaryColor);
    const secondaryBrightness = team.secondaryColor ? getBrightness(team.secondaryColor) : 0;

    // If primary is bright enough, use it
    if (primaryBrightness >= 100) return team.primaryColor;
    // If secondary is brighter and visible, use it
    if (secondaryBrightness >= 100) return team.secondaryColor;
    // Otherwise lighten whichever is brighter
    const base = primaryBrightness >= secondaryBrightness ? team.primaryColor : (team.secondaryColor || team.primaryColor);
    return lighten(base, 80);
  };

  return (
    <div
      className={`matchup-card ${compact ? "matchup-compact" : ""} ${selectedTeam ? "matchup-card-selected" : ""}`}
      style={selectedTeam ? {
        borderColor: getHighlightColor(selectedTeam),
        boxShadow: `0 0 12px ${getHighlightColor(selectedTeam)}40, inset 0 0 12px ${getHighlightColor(selectedTeam)}08`,
      } : {}}
    >
      {/* Top Team */}
      <button
        onClick={() => topTeam && handleTeamClick(topTeam)}
        disabled={disabled || !topTeam}
        className={`matchup-team ${isTopSelected ? "matchup-team-selected" : ""} matchup-team-top`}
        style={isTopSelected && topTeam ? { borderColor: getHighlightColor(topTeam), background: `${getHighlightColor(topTeam)}18` } : {}}
      >
        {topTeam ? (
          <>
            <span className="matchup-seed" style={isTopSelected ? { background: getHighlightColor(topTeam), color: "#fff" } : {}}>{topTeam.seed}</span>
            <span className="matchup-name">{topTeam.name}</span>
            {isTopSelected && <span className="matchup-check">&#10003;</span>}
          </>
        ) : (
          <span className="matchup-tbd">TBD</span>
        )}
      </button>

      {/* Bottom Team */}
      <button
        onClick={() => bottomTeam && handleTeamClick(bottomTeam)}
        disabled={disabled || !bottomTeam}
        className={`matchup-team ${isBottomSelected ? "matchup-team-selected" : ""} matchup-team-bottom`}
        style={isBottomSelected && bottomTeam ? { borderColor: getHighlightColor(bottomTeam), background: `${getHighlightColor(bottomTeam)}18` } : {}}
      >
        {bottomTeam ? (
          <>
            <span className="matchup-seed" style={isBottomSelected ? { background: getHighlightColor(bottomTeam), color: "#fff" } : {}}>{bottomTeam.seed}</span>
            <span className="matchup-name">{bottomTeam.name}</span>
            {isBottomSelected && <span className="matchup-check">&#10003;</span>}
          </>
        ) : (
          <span className="matchup-tbd">TBD</span>
        )}
      </button>

      {/* Games Selector */}
      {pick && (
        <div className="games-selector">
          <span className="games-label">in</span>
          {GAME_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => handleGamesChange(g)}
              disabled={disabled}
              className={`games-btn ${pick.games === g ? "games-btn-active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

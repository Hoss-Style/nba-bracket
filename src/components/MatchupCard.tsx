"use client";

import { Team, MatchupPick } from "@/lib/types";

interface MatchupCardProps {
  topTeam: Team | null;
  bottomTeam: Team | null;
  pick: MatchupPick | null;
  onPick: (pick: MatchupPick) => void;
  disabled?: boolean;
  compact?: boolean;
  resultStatus?: { winnerCorrect: boolean; gamesCorrect: boolean };
  eliminatedTeams?: Set<string>;
}

const GAME_OPTIONS = [4, 5, 6, 7];

export default function MatchupCard({ topTeam, bottomTeam, pick, onPick, disabled, compact, resultStatus, eliminatedTeams }: MatchupCardProps) {
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

  // Check if picked team was eliminated in a prior round
  const isPickEliminated = selectedTeam && eliminatedTeams?.has(selectedTeam.abbreviation) && !resultStatus;

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

  // Determine result-aware colors
  const getResultColor = (isSelected: boolean) => {
    if (!isSelected) return null;
    if (isPickEliminated) return "var(--accent-red)";
    if (!resultStatus) return null;
    return resultStatus.winnerCorrect ? "var(--accent-green)" : "var(--accent-red)";
  };

  const getTeamStyle = (isSelected: boolean, team: Team | null) => {
    if (!isSelected || !team) return {};
    const color = getResultColor(isSelected);
    if (color) {
      return { borderColor: color, background: `${color}18` };
    }
    return { borderColor: getHighlightColor(team), background: `${getHighlightColor(team)}18` };
  };

  const getSeedStyle = (isSelected: boolean, team: Team | null) => {
    if (!isSelected || !team) return {};
    const color = getResultColor(isSelected);
    if (color) {
      return { background: color, color: "#fff" };
    }
    return { background: getHighlightColor(team), color: "#fff" };
  };

  const getCardStyle = () => {
    if (!selectedTeam) return {};
    const color = getResultColor(true);
    if (color) {
      return { borderColor: color, boxShadow: `0 0 12px ${color}40, inset 0 0 12px ${color}08` };
    }
    return {
      borderColor: getHighlightColor(selectedTeam),
      boxShadow: `0 0 12px ${getHighlightColor(selectedTeam)}40, inset 0 0 12px ${getHighlightColor(selectedTeam)}08`,
    };
  };

  return (
    <div
      className={`matchup-card ${compact ? "matchup-compact" : ""} ${selectedTeam ? "matchup-card-selected" : ""}`}
      style={getCardStyle()}
    >
      {/* Top Team */}
      <button
        onClick={() => topTeam && handleTeamClick(topTeam)}
        disabled={disabled || !topTeam}
        className={`matchup-team ${isTopSelected ? "matchup-team-selected" : ""} matchup-team-top ${
          isTopSelected && resultStatus ? (resultStatus.winnerCorrect ? "matchup-team-correct" : "matchup-team-incorrect") : ""
        }`}
        style={getTeamStyle(isTopSelected, topTeam)}
      >
        {topTeam ? (
          <>
            <span className="matchup-seed" style={getSeedStyle(isTopSelected, topTeam)}>{topTeam.seed}</span>
            <span className={`matchup-name ${isTopSelected && ((resultStatus && !resultStatus.winnerCorrect) || isPickEliminated) ? "matchup-name-wrong" : ""}`}>{topTeam.name}</span>
            {isTopSelected && resultStatus && (
              <span className={`matchup-result-icon ${resultStatus.winnerCorrect ? "matchup-result-correct" : "matchup-result-incorrect"}`}>
                {resultStatus.winnerCorrect ? "\u2713" : "\u2717"}
              </span>
            )}
            {isTopSelected && isPickEliminated && (
              <span className="matchup-result-icon matchup-result-incorrect">{"\u2717"}</span>
            )}
          </>
        ) : (
          <span className="matchup-tbd">TBD</span>
        )}
      </button>

      {/* Bottom Team */}
      <button
        onClick={() => bottomTeam && handleTeamClick(bottomTeam)}
        disabled={disabled || !bottomTeam}
        className={`matchup-team ${isBottomSelected ? "matchup-team-selected" : ""} matchup-team-bottom ${
          isBottomSelected && resultStatus ? (resultStatus.winnerCorrect ? "matchup-team-correct" : "matchup-team-incorrect") : ""
        }`}
        style={getTeamStyle(isBottomSelected, bottomTeam)}
      >
        {bottomTeam ? (
          <>
            <span className="matchup-seed" style={getSeedStyle(isBottomSelected, bottomTeam)}>{bottomTeam.seed}</span>
            <span className={`matchup-name ${isBottomSelected && ((resultStatus && !resultStatus.winnerCorrect) || isPickEliminated) ? "matchup-name-wrong" : ""}`}>{bottomTeam.name}</span>
            {isBottomSelected && resultStatus && (
              <span className={`matchup-result-icon ${resultStatus.winnerCorrect ? "matchup-result-correct" : "matchup-result-incorrect"}`}>
                {resultStatus.winnerCorrect ? "\u2713" : "\u2717"}
              </span>
            )}
            {isBottomSelected && isPickEliminated && (
              <span className="matchup-result-icon matchup-result-incorrect">{"\u2717"}</span>
            )}
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
              className={`games-btn ${pick.games === g ? "games-btn-active" : ""} ${
                pick.games === g && resultStatus?.winnerCorrect
                  ? (resultStatus.gamesCorrect ? "games-btn-correct" : "games-btn-incorrect")
                  : ""
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

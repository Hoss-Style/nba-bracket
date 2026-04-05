"use client";

import { useState, useRef, useEffect } from "react";
import { BracketPicks, MatchupPick, MatchupResultStatus, Team } from "@/lib/types";
import { WEST_TEAMS, EAST_TEAMS, getTeamByAbbr } from "@/lib/teams";
import { searchPlayers } from "@/lib/players";

interface MobileBracketProps {
  picks: BracketPicks;
  onPicksChange: (picks: BracketPicks) => void;
  disabled?: boolean;
  finalsMVP: string;
  onFinalsMVPChange: (mvp: string) => void;
  matchupStatuses?: Record<string, MatchupResultStatus> | null;
  mvpCorrect?: boolean | null;
  onStepChange?: (step: number, totalSteps: number) => void;
}

interface MatchupDef {
  key: keyof BracketPicks;
  topTeam: Team | null;
  bottomTeam: Team | null;
  round: string;
  conference: string;
  label: string;
}

function teamFromAbbr(abbr: string | undefined): Team | null {
  if (!abbr) return null;
  return getTeamByAbbr(abbr) || null;
}

function getHighlightColor(team: Team): string {
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

export default function MobileBracket({
  picks,
  onPicksChange,
  disabled,
  finalsMVP,
  onFinalsMVPChange,
  matchupStatuses,
  mvpCorrect,
  onStepChange,
}: MobileBracketProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mvpQuery, setMvpQuery] = useState("");
  const [mvpOpen, setMvpOpen] = useState(false);
  const mvpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mvpRef.current && !mvpRef.current.contains(e.target as Node)) {
        setMvpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep, 7);
  }, [currentStep, onStepChange]);

  const updatePick = (key: keyof BracketPicks, pick: MatchupPick) => {
    if (disabled) return;
    const newPicks = { ...picks, [key]: pick };

    // Clear dependents
    if (key === "westR1_1" || key === "westR1_2") { newPicks.westR2_1 = null; newPicks.westCF = null; newPicks.finals = null; }
    if (key === "westR1_3" || key === "westR1_4") { newPicks.westR2_2 = null; newPicks.westCF = null; newPicks.finals = null; }
    if (key === "eastR1_1" || key === "eastR1_2") { newPicks.eastR2_1 = null; newPicks.eastCF = null; newPicks.finals = null; }
    if (key === "eastR1_3" || key === "eastR1_4") { newPicks.eastR2_2 = null; newPicks.eastCF = null; newPicks.finals = null; }
    if (key === "westR2_1" || key === "westR2_2") { newPicks.westCF = null; newPicks.finals = null; }
    if (key === "eastR2_1" || key === "eastR2_2") { newPicks.eastCF = null; newPicks.finals = null; }
    if (key === "westCF" || key === "eastCF") { newPicks.finals = null; }

    // Clear Finals MVP if finals was cleared or winner changed
    if (newPicks.finals === null || (key === "finals" && pick.winner !== picks.finals?.winner)) {
      onFinalsMVPChange("");
      setMvpQuery("");
    }

    onPicksChange(newPicks);
  };

  // Build all steps
  const westR2_1_top = teamFromAbbr(picks.westR1_1?.winner);
  const westR2_1_bot = teamFromAbbr(picks.westR1_2?.winner);
  const westR2_2_top = teamFromAbbr(picks.westR1_3?.winner);
  const westR2_2_bot = teamFromAbbr(picks.westR1_4?.winner);
  const eastR2_1_top = teamFromAbbr(picks.eastR1_1?.winner);
  const eastR2_1_bot = teamFromAbbr(picks.eastR1_2?.winner);
  const eastR2_2_top = teamFromAbbr(picks.eastR1_3?.winner);
  const eastR2_2_bot = teamFromAbbr(picks.eastR1_4?.winner);
  const westCF_top = teamFromAbbr(picks.westR2_1?.winner);
  const westCF_bot = teamFromAbbr(picks.westR2_2?.winner);
  const eastCF_top = teamFromAbbr(picks.eastR2_1?.winner);
  const eastCF_bot = teamFromAbbr(picks.eastR2_2?.winner);
  const finals_west = teamFromAbbr(picks.westCF?.winner);
  const finals_east = teamFromAbbr(picks.eastCF?.winner);

  type Step = {
    title: string;
    subtitle: string;
    matchups: MatchupDef[];
    type: "matchups";
  } | {
    title: string;
    subtitle: string;
    type: "mvp";
  };

  const steps: Step[] = [
    {
      title: "West First Round",
      subtitle: "Pick the winners of each series",
      type: "matchups",
      matchups: [
        { key: "westR1_1", topTeam: WEST_TEAMS[0], bottomTeam: WEST_TEAMS[7], round: "R1", conference: "WEST", label: "#1 vs #8" },
        { key: "westR1_2", topTeam: WEST_TEAMS[3], bottomTeam: WEST_TEAMS[4], round: "R1", conference: "WEST", label: "#4 vs #5" },
        { key: "westR1_3", topTeam: WEST_TEAMS[2], bottomTeam: WEST_TEAMS[5], round: "R1", conference: "WEST", label: "#3 vs #6" },
        { key: "westR1_4", topTeam: WEST_TEAMS[1], bottomTeam: WEST_TEAMS[6], round: "R1", conference: "WEST", label: "#2 vs #7" },
      ],
    },
    {
      title: "East First Round",
      subtitle: "Pick the winners of each series",
      type: "matchups",
      matchups: [
        { key: "eastR1_1", topTeam: EAST_TEAMS[0], bottomTeam: EAST_TEAMS[7], round: "R1", conference: "EAST", label: "#1 vs #8" },
        { key: "eastR1_2", topTeam: EAST_TEAMS[3], bottomTeam: EAST_TEAMS[4], round: "R1", conference: "EAST", label: "#4 vs #5" },
        { key: "eastR1_3", topTeam: EAST_TEAMS[2], bottomTeam: EAST_TEAMS[5], round: "R1", conference: "EAST", label: "#3 vs #6" },
        { key: "eastR1_4", topTeam: EAST_TEAMS[1], bottomTeam: EAST_TEAMS[6], round: "R1", conference: "EAST", label: "#2 vs #7" },
      ],
    },
    {
      title: "West Conf. Semis",
      subtitle: "Who advances?",
      type: "matchups",
      matchups: [
        { key: "westR2_1", topTeam: westR2_1_top, bottomTeam: westR2_1_bot, round: "R2", conference: "WEST", label: "Semifinal 1" },
        { key: "westR2_2", topTeam: westR2_2_top, bottomTeam: westR2_2_bot, round: "R2", conference: "WEST", label: "Semifinal 2" },
      ],
    },
    {
      title: "East Conf. Semis",
      subtitle: "Who advances?",
      type: "matchups",
      matchups: [
        { key: "eastR2_1", topTeam: eastR2_1_top, bottomTeam: eastR2_1_bot, round: "R2", conference: "EAST", label: "Semifinal 1" },
        { key: "eastR2_2", topTeam: eastR2_2_top, bottomTeam: eastR2_2_bot, round: "R2", conference: "EAST", label: "Semifinal 2" },
      ],
    },
    {
      title: "Conference Finals",
      subtitle: "Pick both conference champions",
      type: "matchups",
      matchups: [
        { key: "westCF", topTeam: westCF_top, bottomTeam: westCF_bot, round: "CF", conference: "WEST", label: "West Finals" },
        { key: "eastCF", topTeam: eastCF_top, bottomTeam: eastCF_bot, round: "CF", conference: "EAST", label: "East Finals" },
      ],
    },
    {
      title: "NBA Finals",
      subtitle: "Who wins it all?",
      type: "matchups",
      matchups: [
        { key: "finals", topTeam: finals_west, bottomTeam: finals_east, round: "Finals", conference: "FINALS", label: "The Finals" },
      ],
    },
    {
      title: "Finals MVP",
      subtitle: "Who takes home the trophy?",
      type: "mvp",
    },
  ];

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const canAdvance = () => {
    if (step.type === "mvp") return finalsMVP.trim() !== "";
    return step.matchups.every((m) => {
      const pick = picks[m.key];
      return pick !== null;
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderTeamButton = (
    team: Team | null,
    matchupKey: keyof BracketPicks,
    isSelected: boolean
  ) => {
    if (!team) {
      return (
        <button disabled className="mobile-team-btn mobile-team-btn-disabled">
          <span className="mobile-team-tbd">Pick previous round first</span>
        </button>
      );
    }

    const status = matchupStatuses?.[matchupKey] ?? undefined;
    const hasResult = isSelected && status;
    const resultColor = hasResult
      ? (status.winnerCorrect ? "var(--accent-green)" : "var(--accent-red)")
      : null;
    const teamColor = getHighlightColor(team);
    const color = resultColor || teamColor;

    return (
      <button
        className={`mobile-team-btn ${isSelected ? "mobile-team-btn-selected" : ""} ${
          hasResult ? (status.winnerCorrect ? "mobile-team-btn-correct" : "mobile-team-btn-incorrect") : ""
        }`}
        style={isSelected ? {
          borderColor: color,
          background: `${color}18`,
          boxShadow: `0 0 16px ${color}30`,
        } : {}}
        onClick={() => {
          if (disabled) return;
          const currentPick = picks[matchupKey] as MatchupPick | null;
          updatePick(matchupKey, {
            winner: team.abbreviation,
            games: currentPick?.games || 6,
          });
        }}
      >
        <span className="mobile-team-seed" style={isSelected ? { background: color, color: "#fff" } : {}}>
          {team.seed}
        </span>
        <span className={`mobile-team-name ${hasResult && !status.winnerCorrect ? "mobile-team-name-wrong" : ""}`}>
          {team.name}
        </span>
        {isSelected && (
          hasResult
            ? <span className={`matchup-result-icon ${status.winnerCorrect ? "matchup-result-correct" : "matchup-result-incorrect"}`}>
                {status.winnerCorrect ? "\u2713" : "\u2717"}
              </span>
            : <span className="mobile-team-check">&#10003;</span>
        )}
      </button>
    );
  };

  const renderGamesSelector = (matchupKey: keyof BracketPicks) => {
    const pick = picks[matchupKey] as MatchupPick | null;
    if (!pick) return null;

    const status = matchupStatuses?.[matchupKey] ?? undefined;

    return (
      <div className="mobile-games">
        <span className="mobile-games-label">Series length:</span>
        <div className="mobile-games-btns">
          {[4, 5, 6, 7].map((g) => (
            <button
              key={g}
              className={`mobile-games-btn ${pick.games === g ? "mobile-games-btn-active" : ""} ${
                pick.games === g && status?.winnerCorrect
                  ? (status.gamesCorrect ? "mobile-games-btn-correct" : "mobile-games-btn-incorrect")
                  : ""
              }`}
              onClick={() => {
                if (disabled) return;
                updatePick(matchupKey, { ...pick, games: g });
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mobile-bracket">
      {/* Progress bar */}
      <div className="mobile-progress">
        <div className="mobile-progress-bar">
          <div
            className="mobile-progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="mobile-progress-text">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Back button above header */}
      {!isFirstStep && (
        <button
          onClick={handlePrev}
          className="btn btn-secondary mobile-back-top"
        >
          &larr; Back
        </button>
      )}

      {/* Step header */}
      <div className="mobile-step-header">
        <h2 className="mobile-step-title">{step.title}</h2>
        <p className="mobile-step-subtitle">{step.subtitle}</p>
      </div>

      {/* Step content */}
      <div className="mobile-step-content">
        {step.type === "matchups" ? (
          step.matchups.map((m) => {
            const pick = picks[m.key] as MatchupPick | null;
            const isTopSelected = pick?.winner === m.topTeam?.abbreviation;
            const isBottomSelected = pick?.winner === m.bottomTeam?.abbreviation;

            return (
              <div key={m.key} className="mobile-matchup">
                <div className="mobile-matchup-label">{m.label}</div>
                <div className="mobile-matchup-teams">
                  {renderTeamButton(m.topTeam, m.key, isTopSelected)}
                  <span className="mobile-vs">VS</span>
                  {renderTeamButton(m.bottomTeam, m.key, isBottomSelected)}
                </div>
                {renderGamesSelector(m.key)}
              </div>
            );
          })
        ) : (
          // MVP step
          <div className="mobile-mvp">
            <div className="mobile-mvp-trophy">&#127942;</div>
            {finalsMVP ? (
              <div className="mobile-mvp-card">
                <div className="mobile-mvp-card-label">Your Finals MVP</div>
                <div className="mobile-mvp-player">
                  <span>{finalsMVP}</span>
                  {mvpCorrect !== null && mvpCorrect !== undefined && (
                    <span className={`matchup-result-icon ${mvpCorrect ? "matchup-result-correct" : "matchup-result-incorrect"}`}>
                      {mvpCorrect ? "\u2713" : "\u2717"}
                    </span>
                  )}
                  {!disabled && (
                    <button
                      className="mobile-mvp-player-clear"
                      onClick={() => { onFinalsMVPChange(""); setMvpQuery(""); }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mobile-mvp-search" ref={mvpRef}>
                <span className="mobile-mvp-search-icon">&#128269;</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search player..."
                  value={mvpQuery}
                  onChange={(e) => {
                    setMvpQuery(e.target.value);
                    setMvpOpen(true);
                  }}
                  onFocus={() => mvpQuery.length > 0 && setMvpOpen(true)}
                />
                {mvpOpen && mvpQuery.length > 0 && (() => {
                  const finalsTeams = [
                    picks.finals?.winner,
                    finals_west?.abbreviation === picks.finals?.winner
                      ? finals_east?.abbreviation
                      : finals_west?.abbreviation,
                  ].filter(Boolean) as string[];
                  const results = searchPlayers(mvpQuery, finalsTeams);
                  if (results.length === 0) return null;
                  return (
                    <div className="mvp-dropdown">
                      {results.map((player) => (
                        <button
                          key={player}
                          className="mvp-dropdown-item"
                          onClick={() => {
                            onFinalsMVPChange(player);
                            setMvpQuery(player);
                            setMvpOpen(false);
                          }}
                        >
                          {player}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div className="mobile-mvp-hint">Pick from either Finals team</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      {!isLastStep && (
        <div className="mobile-nav-btns">
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className={`btn mobile-nav-btn mobile-nav-btn-full ${canAdvance() ? "btn-primary" : "btn-secondary"}`}
            style={{ opacity: canAdvance() ? 1 : 0.4 }}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

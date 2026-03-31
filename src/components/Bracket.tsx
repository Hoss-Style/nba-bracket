"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { BracketPicks, MatchupPick } from "@/lib/types";
import { WEST_TEAMS, EAST_TEAMS, getTeamByAbbr } from "@/lib/teams";
import { Team } from "@/lib/types";
import { searchPlayers, getPlayersForTeams } from "@/lib/players";
import MatchupCard from "./MatchupCard";

interface BracketProps {
  picks: BracketPicks;
  onPicksChange: (picks: BracketPicks) => void;
  disabled?: boolean;
  finalsMVP: string;
  onFinalsMVPChange: (mvp: string) => void;
}

// Helper to get team from abbreviation
function teamFromAbbr(abbr: string | undefined): Team | null {
  if (!abbr) return null;
  return getTeamByAbbr(abbr) || null;
}

export default function Bracket({ picks, onPicksChange, disabled, finalsMVP, onFinalsMVPChange }: BracketProps) {
  const [mvpQuery, setMvpQuery] = useState("");
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mvpActiveIndex, setMvpActiveIndex] = useState(0);
  const mvpRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mvpRef.current && !mvpRef.current.contains(e.target as Node)) {
        setMvpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const updatePick = useCallback(
    (key: keyof BracketPicks, pick: MatchupPick) => {
      const newPicks = { ...picks, [key]: pick };

      // When a round 1 pick changes, clear dependent later-round picks
      const clearDependents = (changedKey: string) => {
        // R1 -> R2 dependencies
        if (changedKey === "westR1_1" || changedKey === "westR1_2") {
          newPicks.westR2_1 = null;
          newPicks.westCF = null;
          newPicks.finals = null;
        }
        if (changedKey === "westR1_3" || changedKey === "westR1_4") {
          newPicks.westR2_2 = null;
          newPicks.westCF = null;
          newPicks.finals = null;
        }
        if (changedKey === "eastR1_1" || changedKey === "eastR1_2") {
          newPicks.eastR2_1 = null;
          newPicks.eastCF = null;
          newPicks.finals = null;
        }
        if (changedKey === "eastR1_3" || changedKey === "eastR1_4") {
          newPicks.eastR2_2 = null;
          newPicks.eastCF = null;
          newPicks.finals = null;
        }
        // R2 -> CF dependencies
        if (changedKey === "westR2_1" || changedKey === "westR2_2") {
          newPicks.westCF = null;
          newPicks.finals = null;
        }
        if (changedKey === "eastR2_1" || changedKey === "eastR2_2") {
          newPicks.eastCF = null;
          newPicks.finals = null;
        }
        // CF -> Finals
        if (changedKey === "westCF" || changedKey === "eastCF") {
          newPicks.finals = null;
        }
      };

      clearDependents(key);

      // Clear Finals MVP if finals was cleared or winner changed
      if (newPicks.finals === null || (key === "finals" && pick.winner !== picks.finals?.winner)) {
        onFinalsMVPChange("");
        setMvpQuery("");
      }

      onPicksChange(newPicks);
    },
    [picks, onPicksChange, onFinalsMVPChange]
  );

  // Derive teams for later rounds based on picks
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

  const champion = teamFromAbbr(picks.finals?.winner);

  return (
    <div className="bracket-container">
      {/* WESTERN CONFERENCE */}
      <div className="bracket-conference bracket-west">
        <h2 className="conference-title conference-title-west">Western Conference</h2>

        <div className="bracket-rounds">
          {/* Round 1 */}
          <div className="bracket-round">
            <div className="round-label">First Round</div>
            <div className="round-matchups">
              <MatchupCard
                topTeam={WEST_TEAMS[0]}
                bottomTeam={WEST_TEAMS[7]}
                pick={picks.westR1_1}
                onPick={(p) => updatePick("westR1_1", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={WEST_TEAMS[3]}
                bottomTeam={WEST_TEAMS[4]}
                pick={picks.westR1_2}
                onPick={(p) => updatePick("westR1_2", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={WEST_TEAMS[2]}
                bottomTeam={WEST_TEAMS[5]}
                pick={picks.westR1_3}
                onPick={(p) => updatePick("westR1_3", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={WEST_TEAMS[1]}
                bottomTeam={WEST_TEAMS[6]}
                pick={picks.westR1_4}
                onPick={(p) => updatePick("westR1_4", p)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Conf Semis */}
          <div className="bracket-round">
            <div className="round-label">Conf. Semis</div>
            <div className="round-matchups round-matchups-spaced">
              <MatchupCard
                topTeam={westR2_1_top}
                bottomTeam={westR2_1_bot}
                pick={picks.westR2_1}
                onPick={(p) => updatePick("westR2_1", p)}
                disabled={disabled || !westR2_1_top || !westR2_1_bot}
                compact
              />
              <MatchupCard
                topTeam={westR2_2_top}
                bottomTeam={westR2_2_bot}
                pick={picks.westR2_2}
                onPick={(p) => updatePick("westR2_2", p)}
                disabled={disabled || !westR2_2_top || !westR2_2_bot}
                compact
              />
            </div>
          </div>

          {/* Conf Finals */}
          <div className="bracket-round">
            <div className="round-label">Conf. Finals</div>
            <div className="round-matchups round-matchups-centered">
              <MatchupCard
                topTeam={westCF_top}
                bottomTeam={westCF_bot}
                pick={picks.westCF}
                onPick={(p) => updatePick("westCF", p)}
                disabled={disabled || !westCF_top || !westCF_bot}
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* NBA FINALS - CENTER */}
      <div className="bracket-finals">
        <div className="finals-trophy">&#127942;</div>
        <h2 className="finals-title">NBA Finals</h2>
        <MatchupCard
          topTeam={finals_west}
          bottomTeam={finals_east}
          pick={picks.finals}
          onPick={(p) => updatePick("finals", p)}
          disabled={disabled || !finals_west || !finals_east}
        />
        {champion && (() => {
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
          const pb = getBrightness(champion.primaryColor);
          const sb = champion.secondaryColor ? getBrightness(champion.secondaryColor) : 0;
          const displayColor = pb >= 100 ? champion.primaryColor : sb >= 100 ? champion.secondaryColor : lighten(pb >= sb ? champion.primaryColor : (champion.secondaryColor || champion.primaryColor), 80);
          return (
            <div className="champion-display" style={{ borderColor: displayColor }}>
              <div className="champion-label">Champion</div>
              <div className="champion-team" style={{ color: displayColor }}>
                {champion.name}
              </div>
              {picks.finals && <div className="champion-games">in {picks.finals.games}</div>}
            </div>
          );
        })()}

        {/* Finals MVP - shown after Finals matchup is picked */}
        {picks.finals && (
          <div className="mvp-section" style={{ marginTop: "0.5rem", width: "100%" }}>
            <h3>Finals MVP</h3>
            {finalsMVP ? (
              <div>
                <div className="mvp-selected">
                  <span>{finalsMVP}</span>
                  {!disabled && (
                    <button
                      className="mvp-selected-clear"
                      onClick={() => { onFinalsMVPChange(""); setMvpQuery(""); }}
                      title="Change pick"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mvp-autocomplete" ref={mvpRef}>
                <span className="mvp-search-icon">&#128269;</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search player..."
                  value={mvpQuery}
                  onChange={(e) => {
                    setMvpQuery(e.target.value);
                    setMvpOpen(true);
                    setMvpActiveIndex(0);
                  }}
                  onFocus={() => mvpQuery.length > 0 && setMvpOpen(true)}
                  onKeyDown={(e) => {
                    const finalsTeams = [
                      picks.finals?.winner,
                      finals_west?.abbreviation === picks.finals?.winner
                        ? finals_east?.abbreviation
                        : finals_west?.abbreviation,
                    ].filter(Boolean) as string[];
                    const results = searchPlayers(mvpQuery, finalsTeams);
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMvpActiveIndex((i) => Math.min(i + 1, results.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMvpActiveIndex((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter" && results[mvpActiveIndex]) {
                      e.preventDefault();
                      onFinalsMVPChange(results[mvpActiveIndex]);
                      setMvpQuery(results[mvpActiveIndex]);
                      setMvpOpen(false);
                    }
                  }}
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
                      {results.map((player, idx) => (
                        <button
                          key={player}
                          className={`mvp-dropdown-item ${idx === mvpActiveIndex ? "mvp-dropdown-item-active" : ""}`}
                          onClick={() => {
                            onFinalsMVPChange(player);
                            setMvpQuery(player);
                            setMvpOpen(false);
                          }}
                          onMouseEnter={() => setMvpActiveIndex(idx)}
                        >
                          {player}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div className="mvp-hint">
                  Pick from either Finals team
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EASTERN CONFERENCE */}
      <div className="bracket-conference bracket-east">
        <h2 className="conference-title conference-title-east">Eastern Conference</h2>

        <div className="bracket-rounds bracket-rounds-reverse">
          {/* Round 1 */}
          <div className="bracket-round">
            <div className="round-label">First Round</div>
            <div className="round-matchups">
              <MatchupCard
                topTeam={EAST_TEAMS[0]}
                bottomTeam={EAST_TEAMS[7]}
                pick={picks.eastR1_1}
                onPick={(p) => updatePick("eastR1_1", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={EAST_TEAMS[3]}
                bottomTeam={EAST_TEAMS[4]}
                pick={picks.eastR1_2}
                onPick={(p) => updatePick("eastR1_2", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={EAST_TEAMS[2]}
                bottomTeam={EAST_TEAMS[5]}
                pick={picks.eastR1_3}
                onPick={(p) => updatePick("eastR1_3", p)}
                disabled={disabled}
              />
              <MatchupCard
                topTeam={EAST_TEAMS[1]}
                bottomTeam={EAST_TEAMS[6]}
                pick={picks.eastR1_4}
                onPick={(p) => updatePick("eastR1_4", p)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Conf Semis */}
          <div className="bracket-round">
            <div className="round-label">Conf. Semis</div>
            <div className="round-matchups round-matchups-spaced">
              <MatchupCard
                topTeam={eastR2_1_top}
                bottomTeam={eastR2_1_bot}
                pick={picks.eastR2_1}
                onPick={(p) => updatePick("eastR2_1", p)}
                disabled={disabled || !eastR2_1_top || !eastR2_1_bot}
                compact
              />
              <MatchupCard
                topTeam={eastR2_2_top}
                bottomTeam={eastR2_2_bot}
                pick={picks.eastR2_2}
                onPick={(p) => updatePick("eastR2_2", p)}
                disabled={disabled || !eastR2_2_top || !eastR2_2_bot}
                compact
              />
            </div>
          </div>

          {/* Conf Finals */}
          <div className="bracket-round">
            <div className="round-label">Conf. Finals</div>
            <div className="round-matchups round-matchups-centered">
              <MatchupCard
                topTeam={eastCF_top}
                bottomTeam={eastCF_bot}
                pick={picks.eastCF}
                onPick={(p) => updatePick("eastCF", p)}
                disabled={disabled || !eastCF_top || !eastCF_bot}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

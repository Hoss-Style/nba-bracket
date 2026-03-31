import { Team } from "./types";

// 2026 NBA Playoff Teams - Updated March 30, 2026
// Based on current standings (regular season ends April 12)
export const WEST_TEAMS: Team[] = [
  { seed: 1, name: "Thunder", abbreviation: "OKC", conference: "WEST", primaryColor: "#007AC1", secondaryColor: "#EF6100" },
  { seed: 2, name: "Spurs", abbreviation: "SAS", conference: "WEST", primaryColor: "#C4CED4", secondaryColor: "#000000" },
  { seed: 3, name: "Lakers", abbreviation: "LAL", conference: "WEST", primaryColor: "#552583", secondaryColor: "#FDB927" },
  { seed: 4, name: "Nuggets", abbreviation: "DEN", conference: "WEST", primaryColor: "#0E2240", secondaryColor: "#FEC524" },
  { seed: 5, name: "Timberwolves", abbreviation: "MIN", conference: "WEST", primaryColor: "#0C2340", secondaryColor: "#236192" },
  { seed: 6, name: "Rockets", abbreviation: "HOU", conference: "WEST", primaryColor: "#CE1141", secondaryColor: "#000000" },
  { seed: 7, name: "Suns", abbreviation: "PHX", conference: "WEST", primaryColor: "#1D1160", secondaryColor: "#E56020" },
  { seed: 8, name: "Clippers", abbreviation: "LAC", conference: "WEST", primaryColor: "#C8102E", secondaryColor: "#1D428A" },
];

export const EAST_TEAMS: Team[] = [
  { seed: 1, name: "Pistons", abbreviation: "DET", conference: "EAST", primaryColor: "#C8102E", secondaryColor: "#1D42BA" },
  { seed: 2, name: "Celtics", abbreviation: "BOS", conference: "EAST", primaryColor: "#007A33", secondaryColor: "#BA9653" },
  { seed: 3, name: "Knicks", abbreviation: "NYK", conference: "EAST", primaryColor: "#006BB6", secondaryColor: "#F58426" },
  { seed: 4, name: "Cavaliers", abbreviation: "CLE", conference: "EAST", primaryColor: "#860038", secondaryColor: "#041E42" },
  { seed: 5, name: "Raptors", abbreviation: "TOR", conference: "EAST", primaryColor: "#CE1141", secondaryColor: "#000000" },
  { seed: 6, name: "Hawks", abbreviation: "ATL", conference: "EAST", primaryColor: "#E03A3E", secondaryColor: "#C1D32F" },
  { seed: 7, name: "76ers", abbreviation: "PHI", conference: "EAST", primaryColor: "#006BB6", secondaryColor: "#ED174C" },
  { seed: 8, name: "Magic", abbreviation: "ORL", conference: "EAST", primaryColor: "#0077C0", secondaryColor: "#C4CED4" },
];

export const ALL_TEAMS = [...WEST_TEAMS, ...EAST_TEAMS];

export function getTeamByAbbr(abbr: string): Team | undefined {
  return ALL_TEAMS.find((t) => t.abbreviation === abbr);
}

// Round 1 matchups: 1v8, 4v5, 3v6, 2v7
export interface Matchup {
  id: string;
  topTeam: Team;
  bottomTeam: Team;
  round: "R1" | "R2" | "CF" | "Finals";
  conference: "WEST" | "EAST" | "FINALS";
}

export function getFirstRoundMatchups(): { west: Matchup[]; east: Matchup[] } {
  return {
    west: [
      { id: "westR1_1", topTeam: WEST_TEAMS[0], bottomTeam: WEST_TEAMS[7], round: "R1", conference: "WEST" },
      { id: "westR1_2", topTeam: WEST_TEAMS[3], bottomTeam: WEST_TEAMS[4], round: "R1", conference: "WEST" },
      { id: "westR1_3", topTeam: WEST_TEAMS[2], bottomTeam: WEST_TEAMS[5], round: "R1", conference: "WEST" },
      { id: "westR1_4", topTeam: WEST_TEAMS[1], bottomTeam: WEST_TEAMS[6], round: "R1", conference: "WEST" },
    ],
    east: [
      { id: "eastR1_1", topTeam: EAST_TEAMS[0], bottomTeam: EAST_TEAMS[7], round: "R1", conference: "EAST" },
      { id: "eastR1_2", topTeam: EAST_TEAMS[3], bottomTeam: EAST_TEAMS[4], round: "R1", conference: "EAST" },
      { id: "eastR1_3", topTeam: EAST_TEAMS[2], bottomTeam: EAST_TEAMS[5], round: "R1", conference: "EAST" },
      { id: "eastR1_4", topTeam: EAST_TEAMS[1], bottomTeam: EAST_TEAMS[6], round: "R1", conference: "EAST" },
    ],
  };
}

export function isUpset(winnerSeed: number, loserSeed: number): boolean {
  return winnerSeed > loserSeed;
}

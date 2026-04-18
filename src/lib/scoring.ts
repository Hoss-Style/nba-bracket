import { BracketPicks, MatchupPick, MatchupResultStatus, ScoreBreakdown, ROUND_POINTS, FINALS_MVP_POINTS, RoundName } from "./types";
import { getTeamByAbbr, isUpset, WEST_TEAMS, EAST_TEAMS } from "./teams";

const MATCHUP_ROUNDS: Record<string, RoundName> = {
  westR1_1: "R1", westR1_2: "R1", westR1_3: "R1", westR1_4: "R1",
  eastR1_1: "R1", eastR1_2: "R1", eastR1_3: "R1", eastR1_4: "R1",
  westR2_1: "R2", westR2_2: "R2", eastR2_1: "R2", eastR2_2: "R2",
  westCF: "CF", eastCF: "CF",
  finals: "Finals",
};

// Map matchup IDs to the two seeds that face off in round 1
const R1_SEEDS: Record<string, [number, number]> = {
  westR1_1: [1, 8], westR1_2: [4, 5], westR1_3: [3, 6], westR1_4: [2, 7],
  eastR1_1: [1, 8], eastR1_2: [4, 5], eastR1_3: [3, 6], eastR1_4: [2, 7],
};

function getTeamSeed(abbr: string): number {
  const team = getTeamByAbbr(abbr);
  return team ? team.seed : 0;
}

function getOpponentSeed(matchupId: string, winnerAbbr: string, actualResults: BracketPicks): number {
  // For R1, we know the seeds from the bracket structure
  if (matchupId in R1_SEEDS) {
    const winnerSeed = getTeamSeed(winnerAbbr);
    const [s1, s2] = R1_SEEDS[matchupId];
    return winnerSeed === s1 ? s2 : s1;
  }
  // For later rounds, find the opponent from the actual results
  // The two teams in any later-round matchup are the winners of the feeder matchups
  const feederMap: Record<string, [string, string]> = {
    westR2_1: ["westR1_1", "westR1_2"],
    westR2_2: ["westR1_3", "westR1_4"],
    eastR2_1: ["eastR1_1", "eastR1_2"],
    eastR2_2: ["eastR1_3", "eastR1_4"],
    westCF: ["westR2_1", "westR2_2"],
    eastCF: ["eastR2_1", "eastR2_2"],
    finals: ["westCF", "eastCF"],
  };
  const feeders = feederMap[matchupId];
  if (!feeders) return 0;
  const [f1, f2] = feeders;
  const team1 = (actualResults[f1 as keyof BracketPicks] as MatchupPick | null)?.winner;
  const team2 = (actualResults[f2 as keyof BracketPicks] as MatchupPick | null)?.winner;
  if (team1 && team2) {
    const opponent = winnerAbbr === team1 ? team2 : team1;
    return getTeamSeed(opponent);
  }
  return 0;
}

// Get all teams that have been eliminated (lost a series) based on actual results
export function getEliminatedTeams(actualResults: BracketPicks): Set<string> {
  const eliminated = new Set<string>();
  const matchupIds = Object.keys(MATCHUP_ROUNDS);

  for (const matchupId of matchupIds) {
    const result = actualResults[matchupId as keyof BracketPicks] as MatchupPick | null;
    if (!result) continue;

    // The winner is known — figure out who lost
    const round = MATCHUP_ROUNDS[matchupId];
    if (round === "R1") {
      // In R1, we know both teams from the bracket structure
      const seeds = R1_SEEDS[matchupId];
      if (seeds) {
        const [s1, s2] = seeds;
        const conf = matchupId.startsWith("west") ? "west" : "east";
        const teams = conf === "west"
          ? [WEST_TEAMS[0], WEST_TEAMS[1], WEST_TEAMS[2], WEST_TEAMS[3], WEST_TEAMS[4], WEST_TEAMS[5], WEST_TEAMS[6], WEST_TEAMS[7]]
          : [EAST_TEAMS[0], EAST_TEAMS[1], EAST_TEAMS[2], EAST_TEAMS[3], EAST_TEAMS[4], EAST_TEAMS[5], EAST_TEAMS[6], EAST_TEAMS[7]];
        const topTeam = teams.find(t => t.seed === s1);
        const botTeam = teams.find(t => t.seed === s2);
        if (topTeam && topTeam.abbreviation !== result.winner) eliminated.add(topTeam.abbreviation);
        if (botTeam && botTeam.abbreviation !== result.winner) eliminated.add(botTeam.abbreviation);
      }
    } else {
      // For later rounds, the loser is the other feeder's winner
      const feederMap: Record<string, [string, string]> = {
        westR2_1: ["westR1_1", "westR1_2"],
        westR2_2: ["westR1_3", "westR1_4"],
        eastR2_1: ["eastR1_1", "eastR1_2"],
        eastR2_2: ["eastR1_3", "eastR1_4"],
        westCF: ["westR2_1", "westR2_2"],
        eastCF: ["eastR2_1", "eastR2_2"],
        finals: ["westCF", "eastCF"],
      };
      const feeders = feederMap[matchupId];
      if (feeders) {
        const [f1, f2] = feeders;
        const team1 = (actualResults[f1 as keyof BracketPicks] as MatchupPick | null)?.winner;
        const team2 = (actualResults[f2 as keyof BracketPicks] as MatchupPick | null)?.winner;
        if (team1 && team1 !== result.winner) eliminated.add(team1);
        if (team2 && team2 !== result.winner) eliminated.add(team2);
      }
    }
  }

  return eliminated;
}

export function getMatchupStatuses(
  playerPicks: BracketPicks,
  actualResults: BracketPicks
): Record<string, MatchupResultStatus> {
  const statuses: Record<string, MatchupResultStatus> = {};
  const matchupIds = Object.keys(MATCHUP_ROUNDS);

  for (const matchupId of matchupIds) {
    const playerPick = playerPicks[matchupId as keyof BracketPicks] as MatchupPick | null;
    const actualResult = actualResults[matchupId as keyof BracketPicks] as MatchupPick | null;

    if (!actualResult || !playerPick) {
      statuses[matchupId] = null;
      continue;
    }

    statuses[matchupId] = {
      winnerCorrect: playerPick.winner === actualResult.winner,
      gamesCorrect: playerPick.games === actualResult.games,
    };
  }

  return statuses;
}

export function calculateMaxPotential(
  playerPicks: BracketPicks,
  actualResults: BracketPicks,
  actualMVP: string
): number {
  // Start with current score
  const current = calculateScore(playerPicks, actualResults, actualMVP);
  let maxRemaining = current.total;

  const matchupIds = Object.keys(MATCHUP_ROUNDS) as (keyof BracketPicks)[];

  for (const matchupId of matchupIds) {
    const playerPick = playerPicks[matchupId] as MatchupPick | null;
    const actualResult = actualResults[matchupId] as MatchupPick | null;

    // Only count undecided matchups where the player made a pick
    if (!playerPick || actualResult) continue;

    const round = MATCHUP_ROUNDS[matchupId];
    const points = ROUND_POINTS[round];

    // Best case: winner correct + games correct
    maxRemaining += points.winner + points.games;

    // Upset bonus if their pick would be an upset
    const winnerSeed = getTeamSeed(playerPick.winner);
    const opponentSeed = getOpponentSeed(matchupId, playerPick.winner, playerPicks);
    if (opponentSeed > 0 && isUpset(winnerSeed, opponentSeed)) {
      maxRemaining += points.upset;
    }
  }

  // Finals MVP if not yet decided
  if (playerPicks.finalsMVP && !actualMVP) {
    maxRemaining += FINALS_MVP_POINTS;
  }

  return maxRemaining;
}

export function calculateMatchupPoints(
  matchupId: keyof BracketPicks,
  playerPick: MatchupPick | null,
  actualResults: BracketPicks
): { winner: number; games: number; upset: number; total: number } | null {
  const actualResult = actualResults[matchupId] as MatchupPick | null;
  if (!playerPick || !actualResult) return null;

  const round = MATCHUP_ROUNDS[matchupId as string];
  const points = ROUND_POINTS[round];
  let winner = 0, games = 0, upset = 0;

  if (playerPick.winner === actualResult.winner) {
    winner = points.winner;
    if (playerPick.games === actualResult.games) games = points.games;
    const winnerSeed = getTeamSeed(playerPick.winner);
    const loserSeed = getOpponentSeed(matchupId as string, playerPick.winner, actualResults);
    if (loserSeed > 0 && isUpset(winnerSeed, loserSeed)) upset = points.upset;
  }
  return { winner, games, upset, total: winner + games + upset };
}

export function calculateAllMatchupPoints(
  playerPicks: BracketPicks,
  actualResults: BracketPicks
): Record<string, number> {
  const out: Record<string, number> = {};
  const matchupIds = Object.keys(MATCHUP_ROUNDS) as (keyof BracketPicks)[];
  for (const matchupId of matchupIds) {
    const playerPick = playerPicks[matchupId] as MatchupPick | null;
    const result = calculateMatchupPoints(matchupId, playerPick, actualResults);
    if (result) out[matchupId as string] = result.total;
  }
  return out;
}

export function calculateScore(
  playerPicks: BracketPicks,
  actualResults: BracketPicks,
  actualMVP: string
): ScoreBreakdown {
  let correctWinners = 0;
  let correctGames = 0;
  let upsetBonuses = 0;
  let finalsMVP = 0;

  const matchupIds = Object.keys(MATCHUP_ROUNDS) as (keyof BracketPicks)[];

  for (const matchupId of matchupIds) {
    const playerPick = playerPicks[matchupId] as MatchupPick | null;
    const result = calculateMatchupPoints(matchupId, playerPick, actualResults);
    if (!result) continue;
    correctWinners += result.winner;
    correctGames += result.games;
    upsetBonuses += result.upset;
  }

  // Finals MVP
  if (playerPicks.finalsMVP && actualMVP && playerPicks.finalsMVP.toLowerCase() === actualMVP.toLowerCase()) {
    finalsMVP = FINALS_MVP_POINTS;
  }

  return {
    correctWinners,
    correctGames,
    upsetBonuses,
    finalsMVP,
    total: correctWinners + correctGames + upsetBonuses + finalsMVP,
  };
}

import { BracketPicks, MatchupPick, ScoreBreakdown, ROUND_POINTS, FINALS_MVP_POINTS, RoundName } from "./types";
import { getTeamByAbbr, isUpset } from "./teams";

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

function getOpponentSeedInMatchup(matchupId: string, winnerAbbr: string): number {
  // For R1, we know the seeds from the bracket structure
  if (matchupId in R1_SEEDS) {
    const winnerSeed = getTeamSeed(winnerAbbr);
    const [s1, s2] = R1_SEEDS[matchupId];
    return winnerSeed === s1 ? s2 : s1;
  }
  // For later rounds, we'd need to trace back - simplified: use seed comparison
  return 0;
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
    const actualResult = actualResults[matchupId] as MatchupPick | null;

    if (!playerPick || !actualResult) continue;

    const round = MATCHUP_ROUNDS[matchupId];
    const points = ROUND_POINTS[round];

    // Correct winner
    if (playerPick.winner === actualResult.winner) {
      correctWinners += points.winner;

      // Correct number of games (only if winner is correct)
      if (playerPick.games === actualResult.games) {
        correctGames += points.games;
      }

      // Upset bonus
      const winnerSeed = getTeamSeed(playerPick.winner);
      const loserSeed = getOpponentSeedInMatchup(matchupId, playerPick.winner);
      if (loserSeed > 0 && isUpset(winnerSeed, loserSeed)) {
        upsetBonuses += points.upset;
      }
    }
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

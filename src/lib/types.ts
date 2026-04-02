export interface Team {
  seed: number;
  name: string;
  abbreviation: string;
  conference: "WEST" | "EAST";
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
}

export interface MatchupPick {
  winner: string; // team abbreviation
  games: number; // 4, 5, 6, or 7
}

export interface BracketPicks {
  // Round 1 (8 matchups)
  westR1_1: MatchupPick | null; // 1v8
  westR1_2: MatchupPick | null; // 4v5
  westR1_3: MatchupPick | null; // 3v6
  westR1_4: MatchupPick | null; // 2v7
  eastR1_1: MatchupPick | null; // 1v8
  eastR1_2: MatchupPick | null; // 4v5
  eastR1_3: MatchupPick | null; // 3v6
  eastR1_4: MatchupPick | null; // 2v7
  // Conference Semis (4 matchups)
  westR2_1: MatchupPick | null; // winner R1_1 vs winner R1_2
  westR2_2: MatchupPick | null; // winner R1_3 vs winner R1_4
  eastR2_1: MatchupPick | null;
  eastR2_2: MatchupPick | null;
  // Conference Finals (2 matchups)
  westCF: MatchupPick | null;
  eastCF: MatchupPick | null;
  // NBA Finals
  finals: MatchupPick | null;
  // Finals MVP
  finalsMVP: string;
}

export interface Entry {
  id?: string;
  name: string;
  email: string;
  phone: string;
  pin: string;
  picks: BracketPicks;
  submittedAt: string;
}

export interface ActualResults {
  picks: BracketPicks;
  finalsMVP: string;
  completedRounds: number; // 0-4 (0 = nothing yet, 4 = finals done)
}

export interface ScoreBreakdown {
  correctWinners: number;
  correctGames: number;
  upsetBonuses: number;
  finalsMVP: number;
  total: number;
}

export interface LeaderboardEntry {
  name: string;
  email: string;
  score: ScoreBreakdown;
  rank: number;
}

export type MatchupResultStatus = {
  winnerCorrect: boolean;
  gamesCorrect: boolean;
} | null;

export type RoundName = "R1" | "R2" | "CF" | "Finals";

export const ROUND_POINTS: Record<RoundName, { winner: number; games: number; upset: number }> = {
  R1: { winner: 1, games: 1, upset: 1 },
  R2: { winner: 3, games: 2, upset: 3 },
  CF: { winner: 6, games: 3, upset: 6 },
  Finals: { winner: 12, games: 5, upset: 12 },
};

export const FINALS_MVP_POINTS = 15;

export interface Reaction {
  id?: string;
  entryId: string;
  commentId?: string;
  emoji: string;
  userName: string;
  createdAt: string;
}

export interface Comment {
  id?: string;
  entryId: string;
  userName: string;
  text: string;
  createdAt: string;
}

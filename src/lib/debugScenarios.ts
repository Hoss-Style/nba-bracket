import { BracketPicks, MatchupPick, Entry } from "./types";
import { WEST_TEAMS, EAST_TEAMS } from "./teams";
import { TEAM_PLAYERS } from "./players";
import { createEmptyPicks } from "./emptyPicks";

// Helper: build a MatchupPick
function mp(winner: string, games: number): MatchupPick {
  return { winner, games };
}

function randomGames(): number {
  return Math.floor(Math.random() * 4) + 4; // 4-7
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Team abbreviations by seed index for quick lookup
// R1 matchups: [0]=1v8, [1]=4v5, [2]=3v6, [3]=2v7
const WEST_R1 = [
  { higher: WEST_TEAMS[0], lower: WEST_TEAMS[7] }, // 1v8: OKC vs LAC
  { higher: WEST_TEAMS[3], lower: WEST_TEAMS[4] }, // 4v5: DEN vs MIN
  { higher: WEST_TEAMS[2], lower: WEST_TEAMS[5] }, // 3v6: LAL vs HOU
  { higher: WEST_TEAMS[1], lower: WEST_TEAMS[6] }, // 2v7: SAS vs PHX
];
const EAST_R1 = [
  { higher: EAST_TEAMS[0], lower: EAST_TEAMS[7] }, // 1v8: DET vs ORL
  { higher: EAST_TEAMS[3], lower: EAST_TEAMS[4] }, // 4v5: CLE vs TOR
  { higher: EAST_TEAMS[2], lower: EAST_TEAMS[5] }, // 3v6: NYK vs ATL
  { higher: EAST_TEAMS[1], lower: EAST_TEAMS[6] }, // 2v7: BOS vs PHI
];

// ============ SCENARIO 1: All Higher Seeds Win (Sweeps) ============
export function generateHigherSeedsWin(): { picks: BracketPicks; finalsMVP: string } {
  const picks: BracketPicks = {
    // R1: higher seeds win in 4
    westR1_1: mp(WEST_R1[0].higher.abbreviation, 4), // OKC
    westR1_2: mp(WEST_R1[1].higher.abbreviation, 4), // DEN
    westR1_3: mp(WEST_R1[2].higher.abbreviation, 4), // LAL
    westR1_4: mp(WEST_R1[3].higher.abbreviation, 4), // SAS
    eastR1_1: mp(EAST_R1[0].higher.abbreviation, 4), // DET
    eastR1_2: mp(EAST_R1[1].higher.abbreviation, 4), // CLE
    eastR1_3: mp(EAST_R1[2].higher.abbreviation, 4), // NYK
    eastR1_4: mp(EAST_R1[3].higher.abbreviation, 4), // BOS
    // R2: 1-seed over 4-seed, 2-seed over 3-seed
    westR2_1: mp("OKC", 4), // OKC(1) over DEN(4)
    westR2_2: mp("SAS", 4), // SAS(2) over LAL(3)
    eastR2_1: mp("DET", 4), // DET(1) over CLE(4)
    eastR2_2: mp("BOS", 4), // BOS(2) over NYK(3)
    // CF: 1-seed over 2-seed
    westCF: mp("OKC", 4), // OKC(1) over SAS(2)
    eastCF: mp("DET", 4), // DET(1) over BOS(2)
    // Finals: West 1-seed wins
    finals: mp("OKC", 4),
    finalsMVP: "Shai Gilgeous-Alexander",
  };
  return { picks, finalsMVP: "Shai Gilgeous-Alexander" };
}

// ============ SCENARIO 2: All Upsets (7 Games) ============
export function generateAllUpsets(): { picks: BracketPicks; finalsMVP: string } {
  const picks: BracketPicks = {
    // R1: lower seeds win in 7
    westR1_1: mp(WEST_R1[0].lower.abbreviation, 7), // LAC(8)
    westR1_2: mp(WEST_R1[1].lower.abbreviation, 7), // MIN(5)
    westR1_3: mp(WEST_R1[2].lower.abbreviation, 7), // HOU(6)
    westR1_4: mp(WEST_R1[3].lower.abbreviation, 7), // PHX(7)
    eastR1_1: mp(EAST_R1[0].lower.abbreviation, 7), // ORL(8)
    eastR1_2: mp(EAST_R1[1].lower.abbreviation, 7), // TOR(5)
    eastR1_3: mp(EAST_R1[2].lower.abbreviation, 7), // ATL(6)
    eastR1_4: mp(EAST_R1[3].lower.abbreviation, 7), // PHI(7)
    // R2: 8-seed over 5-seed, 7-seed over 6-seed (more upsets)
    westR2_1: mp("LAC", 7), // LAC(8) over MIN(5)
    westR2_2: mp("PHX", 7), // PHX(7) over HOU(6)
    eastR2_1: mp("ORL", 7), // ORL(8) over TOR(5)
    eastR2_2: mp("PHI", 7), // PHI(7) over ATL(6)
    // CF: 8-seed over 7-seed
    westCF: mp("LAC", 7), // LAC(8) over PHX(7)
    eastCF: mp("ORL", 7), // ORL(8) over PHI(7)
    // Finals: East 8-seed wins
    finals: mp("ORL", 7),
    finalsMVP: "Paolo Banchero",
  };
  return { picks, finalsMVP: "Paolo Banchero" };
}

// ============ SCENARIO 3: Random Results ============
export function generateRandomResults(): { picks: BracketPicks; finalsMVP: string } {
  // R1
  const wr1 = WEST_R1.map((m) => randomFrom([m.higher, m.lower]).abbreviation);
  const er1 = EAST_R1.map((m) => randomFrom([m.higher, m.lower]).abbreviation);

  // R2: winners of R1_1 vs R1_2, and R1_3 vs R1_4
  const wr2_1 = randomFrom([wr1[0], wr1[1]]);
  const wr2_2 = randomFrom([wr1[2], wr1[3]]);
  const er2_1 = randomFrom([er1[0], er1[1]]);
  const er2_2 = randomFrom([er1[2], er1[3]]);

  // CF
  const wcf = randomFrom([wr2_1, wr2_2]);
  const ecf = randomFrom([er2_1, er2_2]);

  // Finals
  const champion = randomFrom([wcf, ecf]);
  const mvp = TEAM_PLAYERS[champion]?.[0] || "Unknown";

  const picks: BracketPicks = {
    westR1_1: mp(wr1[0], randomGames()),
    westR1_2: mp(wr1[1], randomGames()),
    westR1_3: mp(wr1[2], randomGames()),
    westR1_4: mp(wr1[3], randomGames()),
    eastR1_1: mp(er1[0], randomGames()),
    eastR1_2: mp(er1[1], randomGames()),
    eastR1_3: mp(er1[2], randomGames()),
    eastR1_4: mp(er1[3], randomGames()),
    westR2_1: mp(wr2_1, randomGames()),
    westR2_2: mp(wr2_2, randomGames()),
    eastR2_1: mp(er2_1, randomGames()),
    eastR2_2: mp(er2_2, randomGames()),
    westCF: mp(wcf, randomGames()),
    eastCF: mp(ecf, randomGames()),
    finals: mp(champion, randomGames()),
    finalsMVP: mvp,
  };
  return { picks, finalsMVP: mvp };
}

// ============ SCENARIO 4: Partial Results (higher seeds through round N) ============
export function generatePartialResults(throughRound: 1 | 2 | 3): { picks: BracketPicks; finalsMVP: string } {
  const full = generateHigherSeedsWin();
  const picks = { ...full.picks };

  if (throughRound < 2) {
    picks.westR2_1 = null;
    picks.westR2_2 = null;
    picks.eastR2_1 = null;
    picks.eastR2_2 = null;
  }
  if (throughRound < 3) {
    picks.westCF = null;
    picks.eastCF = null;
  }
  // Always clear finals for partial
  picks.finals = null;
  picks.finalsMVP = "";

  return { picks, finalsMVP: "" };
}

// ============ SCENARIO 5: Clear All ============
export function generateClearResults(): { picks: BracketPicks; finalsMVP: string } {
  return { picks: createEmptyPicks(), finalsMVP: "" };
}

// ============ TEST ENTRIES ============
export function generateTestEntries(): Omit<Entry, "id">[] {
  const higherSeeds = generateHigherSeedsWin();
  const upsets = generateAllUpsets();
  const random = generateRandomResults();

  return [
    {
      name: "Perfect Pete",
      email: "pete@test.com",
      phone: "555-0001",
      pin: "1234",
      picks: higherSeeds.picks,
      submittedAt: new Date().toISOString(),
    },
    {
      name: "Upset Ursula",
      email: "ursula@test.com",
      phone: "555-0002",
      pin: "1234",
      picks: upsets.picks,
      submittedAt: new Date().toISOString(),
    },
    {
      name: "Random Randy",
      email: "randy@test.com",
      phone: "555-0003",
      pin: "1234",
      picks: random.picks,
      submittedAt: new Date().toISOString(),
    },
  ];
}

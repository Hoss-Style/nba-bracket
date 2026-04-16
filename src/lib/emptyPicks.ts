import { BracketPicks } from "./types";
import { WEST_TEAMS, EAST_TEAMS } from "./teams";

// Matchup keys where an 8-seed (possibly TBD) is involved
const TBD_MATCHUP_KEYS: (keyof BracketPicks)[] = ["westR1_1", "eastR1_1"];

/** Check if a matchup key involves a TBD team */
function isTbdMatchup(key: keyof BracketPicks): boolean {
  if (!TBD_MATCHUP_KEYS.includes(key)) return false;
  if (key === "westR1_1") return WEST_TEAMS[7]?.tbd === true;
  if (key === "eastR1_1") return EAST_TEAMS[7]?.tbd === true;
  return false;
}

export function createEmptyPicks(): BracketPicks {
  return {
    westR1_1: null,
    westR1_2: null,
    westR1_3: null,
    westR1_4: null,
    eastR1_1: null,
    eastR1_2: null,
    eastR1_3: null,
    eastR1_4: null,
    westR2_1: null,
    westR2_2: null,
    eastR2_1: null,
    eastR2_2: null,
    westCF: null,
    eastCF: null,
    finals: null,
    finalsMVP: "",
  };
}

export function isPicksComplete(picks: BracketPicks): boolean {
  const r1Keys: (keyof BracketPicks)[] = [
    "westR1_1", "westR1_2", "westR1_3", "westR1_4",
    "eastR1_1", "eastR1_2", "eastR1_3", "eastR1_4",
  ];
  for (const key of r1Keys) {
    if (picks[key] === null && !isTbdMatchup(key)) return false;
  }

  // Later rounds: if a feeder is TBD, the downstream pick is also skippable
  const westR1_1Tbd = isTbdMatchup("westR1_1");
  const eastR1_1Tbd = isTbdMatchup("eastR1_1");

  // R2: westR2_1 depends on westR1_1, eastR2_1 depends on eastR1_1
  if (picks.westR2_1 === null && !westR1_1Tbd) return false;
  if (picks.westR2_2 === null) return false;
  if (picks.eastR2_1 === null && !eastR1_1Tbd) return false;
  if (picks.eastR2_2 === null) return false;

  // CF: westCF depends on westR2_1 (which depends on westR1_1)
  if (picks.westCF === null && !westR1_1Tbd) return false;
  if (picks.eastCF === null && !eastR1_1Tbd) return false;

  // Finals & MVP: skippable only if user hasn't been able to pick both conf champs
  const canPickFinals = picks.westCF !== null && picks.eastCF !== null;
  if (picks.finals === null && canPickFinals) return false;
  if (picks.finalsMVP.trim() === "" && (canPickFinals || picks.finals !== null)) return false;

  return true;
}

export function countCompletedPicks(picks: BracketPicks): number {
  let count = 0;
  const keys: (keyof BracketPicks)[] = [
    "westR1_1", "westR1_2", "westR1_3", "westR1_4",
    "eastR1_1", "eastR1_2", "eastR1_3", "eastR1_4",
    "westR2_1", "westR2_2", "eastR2_1", "eastR2_2",
    "westCF", "eastCF", "finals",
  ];
  for (const key of keys) {
    if (picks[key] !== null) count++;
  }
  if (picks.finalsMVP.trim() !== "") count++;
  return count;
}

/** Total number of pickable matchups (excludes TBD-blocked slots) */
export function totalPickableSlots(): number {
  let total = 16; // 15 matchups + MVP
  // For each TBD 8-seed, subtract the 1v8 matchup and its downstream slots
  if (WEST_TEAMS[7]?.tbd) total -= 1; // westR1_1 (downstream westR2_1, westCF, finals, MVP are shared)
  if (EAST_TEAMS[7]?.tbd) total -= 1; // eastR1_1
  return total;
}

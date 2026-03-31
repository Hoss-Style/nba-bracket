import { BracketPicks } from "./types";

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
  return (
    picks.westR1_1 !== null &&
    picks.westR1_2 !== null &&
    picks.westR1_3 !== null &&
    picks.westR1_4 !== null &&
    picks.eastR1_1 !== null &&
    picks.eastR1_2 !== null &&
    picks.eastR1_3 !== null &&
    picks.eastR1_4 !== null &&
    picks.westR2_1 !== null &&
    picks.westR2_2 !== null &&
    picks.eastR2_1 !== null &&
    picks.eastR2_2 !== null &&
    picks.westCF !== null &&
    picks.eastCF !== null &&
    picks.finals !== null &&
    picks.finalsMVP.trim() !== ""
  );
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

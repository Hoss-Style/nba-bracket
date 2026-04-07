/** Prize split for top 3 (percent of total pool). */
export const PAYOUT_SPLITS = [
  { place: "1st", pct: 65 },
  { place: "2nd", pct: 25 },
  { place: "3rd", pct: 10 },
] as const;

export const VENMO_USERNAME = "Mike-Lewis-3";

/** Public Venmo profile / pay link */
export const VENMO_URL = `https://venmo.com/${VENMO_USERNAME}`;

/**
 * Optional: set NEXT_PUBLIC_ENTRY_FEE_DOLLARS in .env.local to show estimated
 * pool (bracket count × fee) and dollar payouts. If unset or 0, only % is shown.
 */
export function getEntryFeeDollars(): number {
  const raw = process.env.NEXT_PUBLIC_ENTRY_FEE_DOLLARS;
  if (raw === undefined || raw === "") return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

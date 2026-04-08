/** Prize split for top 3 (percent of total pool). */
export const PAYOUT_SPLITS = [
  { place: "1st", pct: 65 },
  { place: "2nd", pct: 25 },
  { place: "3rd", pct: 10 },
] as const;

export const VENMO_USERNAME = "Mike-Lewis-3";

/** Public Venmo profile / pay link */
export const VENMO_URL = `https://venmo.com/${VENMO_USERNAME}`;

/** Default entry fee (USD) when env is not set — used for pool and payout estimates. */
export const DEFAULT_ENTRY_FEE_DOLLARS = 50;

/**
 * Per-bracket entry fee for prize math. Defaults to {@link DEFAULT_ENTRY_FEE_DOLLARS}.
 * Set `NEXT_PUBLIC_ENTRY_FEE_DOLLARS` in `.env.local` to override (use `0` to show only %).
 */
export function getEntryFeeDollars(): number {
  const raw = process.env.NEXT_PUBLIC_ENTRY_FEE_DOLLARS;
  if (raw === undefined || raw === "") return DEFAULT_ENTRY_FEE_DOLLARS;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_ENTRY_FEE_DOLLARS;
}

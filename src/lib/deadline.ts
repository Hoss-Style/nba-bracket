// Playoff deadline configuration
// UPDATE THIS: Set to the tip-off time of the first playoff game
// Format: ISO 8601 string in UTC
// Example: April 19, 2026 at 12:30 PM PST = 7:30 PM UTC
export const PLAYOFF_DEADLINE = "2026-04-19T19:30:00Z";

// Human-readable display
export const DEADLINE_DISPLAY = "Saturday, April 19th at 12:30 PM PST";

export function isBeforeDeadline(): boolean {
  return new Date() < new Date(PLAYOFF_DEADLINE);
}

export function getTimeUntilDeadline(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const now = new Date().getTime();
  const deadline = new Date(PLAYOFF_DEADLINE).getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}

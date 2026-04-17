// Playoff deadline configuration
// UPDATE THIS: Set to the tip-off time of the first playoff game
// Format: ISO 8601 string in UTC
// April 18, 2026 at 10:00 AM PDT = 5:00 PM UTC
export const PLAYOFF_DEADLINE = "2026-04-18T17:00:00Z";

// Human-readable display
export const DEADLINE_DISPLAY = "Saturday, April 18th at 10:00 AM PT";

export function isBeforeDeadline(): boolean {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("debug_deadline_override");
    if (override === "locked") return false;
    if (override === "open") return true;
  }
  return new Date() < new Date(PLAYOFF_DEADLINE);
}

export function getTimeUntilDeadline(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("debug_deadline_override");
    if (override === "locked") return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    if (override === "open") return { days: 14, hours: 0, minutes: 0, seconds: 0, expired: false };
  }

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

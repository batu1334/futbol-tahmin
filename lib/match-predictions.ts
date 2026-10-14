const PREDICTABLE_MATCH_STATUSES = new Set([
  "SCHEDULED",
  "NS",
  "TBD",
  "PRE",
  "UPCOMING",
  "NOT STARTED",
  "NOT_STARTED",
]);

export function isMatchStatusPredictable(status: string | null | undefined) {
  return PREDICTABLE_MATCH_STATUSES.has(String(status ?? "").trim().toUpperCase());
}

export function isPredictionWindowOpen(
  kickoff: string | null | undefined,
  now = Date.now(),
) {
  if (!kickoff) return false;

  const kickoffTime = new Date(kickoff).getTime();
  if (!Number.isFinite(kickoffTime)) return false;

  const closeTime = kickoffTime - 10 * 60 * 1000;
  return now < closeTime;
}

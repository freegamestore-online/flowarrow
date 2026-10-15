import { utcDateKey } from "./daily";
import { MAX_MISTAKES } from "./game";

// Daily leaderboard for Flowarrow. Calls the leaderboard endpoint directly, as the sibling
// games do. Set VITE_LEADERBOARD_URL to enable it; without it every call is a silent no-op.

export const GAME_ID = "flowarrow";

/** Time used in scores is capped at a day, so every solve fits below the mistake weight. */
const DAY_CAP_MS = 24 * 60 * 60 * 1000;
/** Each mistake is worth more than any time difference, so fewer mistakes always ranks higher. */
const MISTAKE_WEIGHT = 1_000_000_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export interface DailyScore {
  /** The UTC day the board belongs to, as "YYYY-MM-DD". */
  date: string;
  mistakes: number;
  timeMs: number;
}

export interface LeaderboardEntry {
  player_name: string;
  score: number;
  created_at: string;
}

/**
 * Board score for a win. Fewer mistakes ranks higher, and among equal mistakes a faster solve
 * ranks higher. Returns null for a result that cannot be a win.
 */
export function scoreFor(result: { mistakes: number; timeMs: number }): number | null {
  const { mistakes, timeMs } = result;
  if (!Number.isInteger(mistakes) || mistakes < 0 || mistakes >= MAX_MISTAKES) return null;
  if (!Number.isFinite(timeMs) || timeMs < 0) return null;
  return (MAX_MISTAKES - mistakes) * MISTAKE_WEIGHT + Math.max(0, Math.round(DAY_CAP_MS - timeMs));
}

/** Configured endpoint base URL, or null when the leaderboard is not enabled. */
export function leaderboardBase(): string | null {
  const url = import.meta.env.VITE_LEADERBOARD_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

/**
 * Post a daily win. Returns { ok: false } quietly on every failure: no endpoint configured,
 * an invalid score, an unpublished game ("Invalid game"), signed-out users (401), rate limits,
 * or a network error. The game never shows these.
 */
export async function submitScore(
  score: DailyScore,
  fetchImpl: FetchLike = defaultFetch,
): Promise<{ ok: boolean; rank?: number }> {
  const base = leaderboardBase();
  if (!base || !DATE_KEY.test(score.date)) return { ok: false };
  const value = scoreFor(score);
  if (value === null) return { ok: false };

  try {
    const res = await fetchImpl(`${base}/api/scores`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: GAME_ID, score: value, period: score.date }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok?: boolean; rank?: number };
    if (data.ok === false) return { ok: false };
    return data.rank === undefined ? { ok: true } : { ok: true, rank: data.rank };
  } catch {
    return { ok: false };
  }
}

/** Top scores for a UTC day (default: today). Returns [] on any failure or when disabled. */
export async function fetchLeaderboard(
  date: string = utcDateKey(),
  fetchImpl: FetchLike = defaultFetch,
): Promise<LeaderboardEntry[]> {
  const base = leaderboardBase();
  if (!base || !DATE_KEY.test(date)) return [];

  try {
    const res = await fetchImpl(`${base}/api/leaderboard/${GAME_ID}?limit=50&period=${date}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { scores?: LeaderboardEntry[] };
    return Array.isArray(data.scores) ? data.scores : [];
  } catch {
    return [];
  }
}

import { generateLevel, type GeneratedLevel } from "./generator";

/** Difficulty for the daily level. Everyone who plays on a given UTC day gets the same board. */
export const DAILY_DIFFICULTY = 5;

/** "YYYY-MM-DD" for the UTC calendar day of `date`. The daily rollover is UTC midnight. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** FNV-1a hash of the date key. Same key, same seed, on every client. */
export function seedForDate(dateKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export interface DailyLevel extends GeneratedLevel {
  /** The UTC day this board belongs to, as "YYYY-MM-DD". */
  date: string;
}

const cache = new Map<string, DailyLevel>();

/** The daily board for the UTC day of `date` (default: now). Cached per day. */
export function getDailyLevel(date: Date = new Date()): DailyLevel {
  const key = utcDateKey(date);
  const cached = cache.get(key);
  if (cached) return cached;

  const level = { date: key, ...generateLevel(DAILY_DIFFICULTY, seedForDate(key)) };
  cache.set(key, level);
  return level;
}

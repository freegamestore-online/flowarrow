/** Best result for one level, kept across sessions in localStorage. */
export interface LevelProgress {
  solved: boolean;
  /** 0 when unsolved, otherwise 1..3. */
  stars: 0 | 1 | 2 | 3;
  bestMistakes: number | null;
  bestTimeMs: number | null;
}

/** One finished win. Losses are not saved. */
export interface LevelResult {
  mistakes: number;
  timeMs: number;
}

/** Solves at or under this time, with no mistakes, earn the third star. */
export const THREE_STAR_TIME_MS = 3 * 60 * 1000;

const KEY_PREFIX = "flowarrow:progress:v1:";

/**
 * Stars for a win. Three stars: no mistakes and within THREE_STAR_TIME_MS. Two stars: at most
 * one mistake. One star: any other win. Invalid input earns 0 stars.
 */
export function getStarRating(mistakes: number, timeMs: number): 0 | 1 | 2 | 3 {
  if (!Number.isInteger(mistakes) || mistakes < 0 || !Number.isFinite(timeMs) || timeMs < 0) return 0;
  if (mistakes === 0 && timeMs <= THREE_STAR_TIME_MS) return 3;
  if (mistakes <= 1) return 2;
  return 1;
}

/**
 * Record a win and merge it into the saved best. Stars and the best mistake count and time
 * only improve, so a worse replay never lowers them. Returns the merged record.
 */
export function saveProgress(levelId: string | number, result: LevelResult): LevelProgress {
  const previous = loadProgress(levelId);
  const stars = getStarRating(result.mistakes, result.timeMs);
  const merged: LevelProgress = {
    solved: true,
    stars: Math.max(previous?.stars ?? 0, stars) as LevelProgress["stars"],
    bestMistakes: minOrSelf(previous?.bestMistakes ?? null, result.mistakes),
    bestTimeMs: minOrSelf(previous?.bestTimeMs ?? null, result.timeMs),
  };
  writeStorage(levelId, merged);
  return merged;
}

/** Saved progress for a level, or null when none exists or the stored value is unreadable. */
export function loadProgress(levelId: string | number): LevelProgress | null {
  const raw = readStorage(levelId);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LevelProgress>;
    if (typeof parsed.solved !== "boolean" || !isStars(parsed.stars)) return null;
    return {
      solved: parsed.solved,
      stars: parsed.stars,
      bestMistakes: typeof parsed.bestMistakes === "number" ? parsed.bestMistakes : null,
      bestTimeMs: typeof parsed.bestTimeMs === "number" ? parsed.bestTimeMs : null,
    };
  } catch {
    return null;
  }
}

function minOrSelf(current: number | null, next: number): number {
  return current === null ? next : Math.min(current, next);
}

function isStars(value: unknown): value is LevelProgress["stars"] {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** Storage can be missing or throw (private mode, disabled cookies). Progress is then not kept. */
function readStorage(levelId: string | number): string | null {
  try {
    return globalThis.localStorage?.getItem(KEY_PREFIX + String(levelId)) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(levelId: string | number, progress: LevelProgress): void {
  try {
    globalThis.localStorage?.setItem(KEY_PREFIX + String(levelId), JSON.stringify(progress));
  } catch {
    // Not kept this session. The game keeps running.
  }
}

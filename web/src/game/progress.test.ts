import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStarRating, loadProgress, saveProgress, THREE_STAR_TIME_MS } from "./progress";

describe("getStarRating", () => {
  it("gives three stars for a clean, fast win", () => {
    expect(getStarRating(0, 60_000)).toBe(3);
    expect(getStarRating(0, THREE_STAR_TIME_MS)).toBe(3);
  });

  it("gives two stars for one mistake, or a clean but slow win", () => {
    expect(getStarRating(1, 10_000)).toBe(2);
    expect(getStarRating(0, THREE_STAR_TIME_MS + 1)).toBe(2);
  });

  it("gives one star for two mistakes", () => {
    expect(getStarRating(2, 10_000)).toBe(1);
  });

  it("gives no stars for invalid input", () => {
    expect(getStarRating(-1, 1000)).toBe(0);
    expect(getStarRating(1.5, 1000)).toBe(0);
    expect(getStarRating(0, Number.NaN)).toBe(0);
  });
});

describe("saveProgress and loadProgress", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns null for a level with no saved progress", () => {
    expect(loadProgress("nope")).toBeNull();
  });

  it("saves a win and reads it back", () => {
    const saved = saveProgress(7, { mistakes: 1, timeMs: 90_000 });
    expect(saved).toEqual({ solved: true, stars: 2, bestMistakes: 1, bestTimeMs: 90_000 });
    expect(loadProgress(7)).toEqual(saved);
  });

  it("keeps the best stars, mistakes and time across replays", () => {
    saveProgress("lvl", { mistakes: 2, timeMs: 30_000 });
    const merged = saveProgress("lvl", { mistakes: 0, timeMs: 200_000 });
    expect(merged.stars).toBe(2);
    expect(merged.bestMistakes).toBe(0);
    expect(merged.bestTimeMs).toBe(30_000);
  });

  it("never lowers stars on a worse replay", () => {
    saveProgress("lvl", { mistakes: 0, timeMs: 1000 });
    expect(saveProgress("lvl", { mistakes: 2, timeMs: 1000 }).stars).toBe(3);
  });

  it("ignores a corrupt stored value", () => {
    localStorage.setItem("flowarrow:progress:v1:bad", "{not json");
    expect(loadProgress("bad")).toBeNull();
    localStorage.setItem("flowarrow:progress:v1:bad", JSON.stringify({ solved: true, stars: 9 }));
    expect(loadProgress("bad")).toBeNull();
  });

  it("keeps the game running when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadProgress(1)).toBeNull();
    expect(() => saveProgress(1, { mistakes: 0, timeMs: 1000 })).not.toThrow();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAME_ID, fetchLeaderboard, leaderboardBase, scoreFor, submitScore } from "./leaderboard";

const WIN = { date: "2026-10-16", mistakes: 0, timeMs: 60_000 };
const BASE = "https://leaderboard.example.test/v1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("scoreFor", () => {
  it("ranks fewer mistakes above any time advantage", () => {
    const oneMistakeFast = scoreFor({ mistakes: 1, timeMs: 1_000 })!;
    const noMistakesSlow = scoreFor({ mistakes: 0, timeMs: 23 * 60 * 60 * 1000 })!;
    expect(noMistakesSlow).toBeGreaterThan(oneMistakeFast);
  });

  it("ranks a faster solve higher when mistakes are equal", () => {
    expect(scoreFor({ mistakes: 0, timeMs: 30_000 })!).toBeGreaterThan(scoreFor({ mistakes: 0, timeMs: 90_000 })!);
  });

  it("returns null for results that cannot be a win", () => {
    expect(scoreFor({ mistakes: 3, timeMs: 1000 })).toBeNull();
    expect(scoreFor({ mistakes: -1, timeMs: 1000 })).toBeNull();
    expect(scoreFor({ mistakes: 0, timeMs: Number.NaN })).toBeNull();
  });
});

describe("leaderboard disabled (no VITE_LEADERBOARD_URL)", () => {
  beforeEach(() => vi.stubEnv("VITE_LEADERBOARD_URL", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("is a no-op: submitScore does not call the network", async () => {
    const fetchSpy = vi.fn();
    expect(leaderboardBase()).toBeNull();
    expect(await submitScore(WIN, fetchSpy)).toEqual({ ok: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op: fetchLeaderboard returns an empty list", async () => {
    const fetchSpy = vi.fn();
    expect(await fetchLeaderboard("2026-10-16", fetchSpy)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("leaderboard enabled", () => {
  beforeEach(() => vi.stubEnv("VITE_LEADERBOARD_URL", `${BASE}/`));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("strips a trailing slash from the configured base", () => {
    expect(leaderboardBase()).toBe(BASE);
  });

  it("posts the score for the game and day", async () => {
    const fetchSpy = vi.fn(async (_input: string, _init?: RequestInit) => json({ ok: true, rank: 4 }));
    const result = await submitScore(WIN, fetchSpy);

    expect(result).toEqual({ ok: true, rank: 4 });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/scores`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      game: GAME_ID,
      score: scoreFor(WIN),
      period: "2026-10-16",
    });
  });

  it("returns ok without a rank when the server omits one", async () => {
    expect(await submitScore(WIN, async () => json({ ok: true }))).toEqual({ ok: true });
  });

  it("handles an 'Invalid game' reply quietly, with no error logged or thrown", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const warns = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = async () => json({ error: "Invalid game" }, 400);

    await expect(submitScore(WIN, fetchImpl)).resolves.toEqual({ ok: false });
    expect(errors).not.toHaveBeenCalled();
    expect(warns).not.toHaveBeenCalled();
  });

  it("treats a 200 body with ok:false as a failed submit", async () => {
    expect(await submitScore(WIN, async () => json({ ok: false }))).toEqual({ ok: false });
  });

  it("treats a network error as a failed submit", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    await expect(submitScore(WIN, fetchImpl)).resolves.toEqual({ ok: false });
  });

  it("rejects a malformed date or result without calling the network", async () => {
    const fetchSpy = vi.fn(async (_input: string, _init?: RequestInit) => json({ ok: true }));
    expect(await submitScore({ ...WIN, date: "16/10/2026" }, fetchSpy)).toEqual({ ok: false });
    expect(await submitScore({ ...WIN, mistakes: 3 }, fetchSpy)).toEqual({ ok: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches the day's scores", async () => {
    const scores = [{ player_name: "ada", score: 3_000_000_000, created_at: "2026-10-16T10:00:00Z" }];
    const fetchSpy = vi.fn(async (_input: string, _init?: RequestInit) => json({ scores }));
    expect(await fetchLeaderboard("2026-10-16", fetchSpy)).toEqual(scores);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`/api/leaderboard/${GAME_ID}`);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("period=2026-10-16");
  });

  it("returns an empty list when the fetch fails or the body is unexpected", async () => {
    expect(await fetchLeaderboard("2026-10-16", async () => json({}, 500))).toEqual([]);
    expect(await fetchLeaderboard("2026-10-16", async () => json({ scores: "nope" }))).toEqual([]);
    expect(
      await fetchLeaderboard("2026-10-16", async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).toEqual([]);
  });
});

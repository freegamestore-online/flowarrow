import { describe, expect, it } from "vitest";
import { canSlide, clearArrow, isBoardCleared, parseBoard, type Board } from "./board";
import { getDailyLevel, seedForDate, utcDateKey } from "./daily";
import { solve } from "./solver";

function replaysToCleared(board: Board, moves: readonly { row: number; col: number }[]): boolean {
  let current = board;
  for (const pos of moves) {
    if (!canSlide(current, pos)) return false;
    current = clearArrow(current, pos);
  }
  return isBoardCleared(current);
}

describe("utcDateKey", () => {
  it("uses the UTC calendar day, not the local one", () => {
    // 23:30 at UTC-5 is 04:30 the next day in UTC.
    expect(utcDateKey(new Date("2026-10-16T23:30:00-05:00"))).toBe("2026-10-17");
    expect(utcDateKey(new Date("2026-10-16T00:00:00Z"))).toBe("2026-10-16");
  });
});

describe("seedForDate", () => {
  it("is stable for a key and differs between days", () => {
    expect(seedForDate("2026-10-16")).toBe(seedForDate("2026-10-16"));
    expect(seedForDate("2026-10-16")).not.toBe(seedForDate("2026-10-17"));
  });
});

describe("getDailyLevel", () => {
  it("gives the same board to everyone on the same UTC day", () => {
    const morning = getDailyLevel(new Date("2026-10-16T01:00:00Z"));
    const evening = getDailyLevel(new Date("2026-10-16T23:59:00Z"));
    expect(evening.date).toBe("2026-10-16");
    expect(evening.rows).toEqual(morning.rows);
  });

  it("gives a different board on a different day", () => {
    const today = getDailyLevel(new Date("2026-10-16T12:00:00Z"));
    const tomorrow = getDailyLevel(new Date("2026-10-17T12:00:00Z"));
    expect(tomorrow.rows).not.toEqual(today.rows);
  });

  it("is solver-verified for each of several days", () => {
    for (const day of ["2026-10-16", "2026-10-17", "2026-10-18", "2027-01-01", "2028-02-29"]) {
      const level = getDailyLevel(new Date(`${day}T12:00:00Z`));
      const board = parseBoard(level.rows);
      const solution = solve(board);
      expect(solution, `${day} has no solution`).not.toBeNull();
      expect(replaysToCleared(board, solution ?? [])).toBe(true);
      expect(replaysToCleared(board, level.solution)).toBe(true);
    }
  });
});

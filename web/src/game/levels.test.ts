import { describe, expect, it } from "vitest";
import { parseBoard, remainingArrows } from "./board";
import { LEVELS } from "./levels";
import { solve } from "./solver";

describe("bundled level pack", () => {
  it("ships about 60 levels with unique ids", () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
  });

  it("grows board size from the first level to the last", () => {
    const sides = LEVELS.map((level) => level.rows.length);
    for (let i = 1; i < sides.length; i++) expect(sides[i]).toBeGreaterThanOrEqual(sides[i - 1] ?? 0);
    expect(sides[sides.length - 1]).toBeGreaterThan(sides[0] ?? 0);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))("level %i parses and is solvable", (_id, level) => {
    const board = parseBoard(level.rows);
    expect(remainingArrows(board)).toBeGreaterThan(0);
    expect(solve(board), `level ${level.id} has no solution`).not.toBeNull();
  });
});

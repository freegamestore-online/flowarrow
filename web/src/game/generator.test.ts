import { describe, expect, it } from "vitest";
import { blockersOf, canSlide, clearArrow, isBoardCleared, tileAt, type Board, type Position } from "./board";
import { generateLevel, mulberry32, resolveDifficulty, shapeFor, type Difficulty } from "./generator";
import { solve } from "./solver";

/** Replays a slide order on the engine and reports whether every move was legal and the board ends cleared. */
function replaysToCleared(board: Board, moves: readonly { row: number; col: number }[]): boolean {
  let current = board;
  for (const pos of moves) {
    if (!canSlide(current, pos)) return false;
    current = clearArrow(current, pos);
  }
  return isBoardCleared(current);
}

function positionsOf(board: Board): Position[] {
  const found: Position[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (tileAt(board, { row, col })) found.push({ row, col });
    }
  }
  return found;
}

describe("resolveDifficulty", () => {
  it("maps named difficulties onto the numeric scale", () => {
    expect(resolveDifficulty("easy")).toBeLessThan(resolveDifficulty("medium"));
    expect(resolveDifficulty("medium")).toBeLessThan(resolveDifficulty("hard"));
  });

  it("clamps numeric levels into 1..10 and rounds them", () => {
    expect(resolveDifficulty(0)).toBe(1);
    expect(resolveDifficulty(99)).toBe(10);
    expect(resolveDifficulty(4.6)).toBe(5);
  });

  it("rejects values that are not numbers", () => {
    expect(() => resolveDifficulty(Number.NaN)).toThrow(/Unknown difficulty/);
    expect(() => resolveDifficulty("impossible" as Difficulty)).toThrow(/Unknown difficulty/);
  });
});

describe("shapeFor", () => {
  it("grows board side, density and blockers with the level", () => {
    for (let level = 2; level <= 10; level++) {
      const prev = shapeFor(level - 1);
      const next = shapeFor(level);
      expect(next.side).toBeGreaterThanOrEqual(prev.side);
      expect(next.density).toBeGreaterThanOrEqual(prev.density);
      expect(next.minBlocked).toBeGreaterThanOrEqual(prev.minBlocked);
    }
    expect(shapeFor(1).side).toBe(4);
    expect(shapeFor(10).side).toBe(10);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect(c()).not.toBe(seqA[0]);
  });
});

describe("generateLevel", () => {
  it("returns the same level for the same difficulty and seed", () => {
    const first = generateLevel("medium", 12345);
    const second = generateLevel("medium", 12345);
    expect(second.rows).toEqual(first.rows);
  });

  it("returns different levels for different seeds", () => {
    expect(generateLevel("medium", 1).rows).not.toEqual(generateLevel("medium", 2).rows);
  });

  it("produces boards of the requested side", () => {
    const level = generateLevel(3, 99);
    const side = shapeFor(3).side;
    expect(level.rows).toHaveLength(side);
    for (const row of level.rows) expect(row).toHaveLength(side);
  });

  const difficulties: Difficulty[] = ["easy", "medium", "hard", 1, 10];
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];

  for (const difficulty of difficulties) {
    it(`solver-verifies every generated level at difficulty ${String(difficulty)}`, () => {
      for (const seed of seeds) {
        const level = generateLevel(difficulty, seed);
        const shape = shapeFor(resolveDifficulty(difficulty));

        // The solver must find a slide order that clears the board, and the engine must accept it.
        const solution = solve(level.board);
        expect(solution, `seed ${seed} has no solution`).not.toBeNull();
        expect(replaysToCleared(level.board, solution ?? [])).toBe(true);

        // The generator's own answer must match the solver's.
        expect(replaysToCleared(level.board, level.solution)).toBe(true);

        // Enough arrows start blocked, so the level is not free to clear.
        const arrows = positionsOf(level.board);
        const blocked = arrows.filter((pos) => blockersOf(level.board, pos).length > 0).length;
        expect(blocked).toBeGreaterThanOrEqual(shape.minBlocked);
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import { canSlide, clearArrow, isBoardCleared, parseBoard, type Board } from "./board";
import { isSolvable, solve } from "./solver";

/** Replays a solver's moves and reports whether each one was legal and the board ends cleared. */
function replay(board: Board, moves: { row: number; col: number }[]): boolean {
  let current = board;
  for (const pos of moves) {
    if (!canSlide(current, pos)) return false;
    current = clearArrow(current, pos);
  }
  return isBoardCleared(current);
}

describe("solver: solvable boards", () => {
  it("solves an empty board with no moves", () => {
    expect(solve(parseBoard([".."]))).toEqual([]);
  });

  it("solves a single unblocked arrow", () => {
    expect(solve(parseBoard(["U"]))).toEqual([{ row: 0, col: 0 }]);
  });

  it("finds an order that clears a chain of blocked arrows", () => {
    // The U at the far right clears first, then the R, then the L's path is open.
    const board = parseBoard(["RRU"]);
    const moves = solve(board);
    expect(moves).not.toBeNull();
    expect(replay(board, moves ?? [])).toBe(true);
  });

  it("returns moves that are each legal and clear the board", () => {
    const board = parseBoard(["LUUU.U.LRU", "L..D....D.", "L...LUU..D", ".U...U...R", "L...L.L.RR", "LUU..DRRR.", "LD....RD.R", "LDUD.RR.R.", "UDD.D.D.DD"]);
    const moves = solve(board);
    expect(moves).not.toBeNull();
    expect(replay(board, moves ?? [])).toBe(true);
  });

  it("reports solvable boards via isSolvable", () => {
    expect(isSolvable(parseBoard(["R.U"]))).toBe(true);
  });
});

describe("solver: unsolvable boards", () => {
  it("rejects two arrows pointing at each other", () => {
    // Each arrow's path holds the other, so neither can leave first.
    const board = parseBoard(["RL"]);
    expect(solve(board)).toBeNull();
    expect(isSolvable(board)).toBe(false);
  });

  it("rejects a four-arrow pinwheel where every arrow blocks the next", () => {
    const board = parseBoard(["RD", "UL"]);
    expect(solve(board)).toBeNull();
  });

  it("rejects a board where one arrow can never reach the edge", () => {
    // The R at the left is stuck behind the L on its right, and that L is stuck behind it.
    const board = parseBoard(["R.L.", "....", "...."]);
    expect(isSolvable(board)).toBe(false);
  });
});

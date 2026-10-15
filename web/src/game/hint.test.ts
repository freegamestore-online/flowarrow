import { describe, expect, it } from "vitest";
import { canSlide, parseBoard, type Position } from "./board";
import { MAX_MISTAKES, findHint, newGame, tap, spendHint, type GameState } from "./game";
import { solve } from "./solver";

const at = (row: number, col: number) => ({ row, col });

describe("findHint: the next free arrow", () => {
  it("returns an arrow that can slide right now", () => {
    const state = newGame(parseBoard(["R.U", "..."]));
    const hint = findHint(state);
    expect(hint).toEqual(at(0, 2));
    expect(canSlide(state.board, hint as Position)).toBe(true);
  });

  it("returns the first free arrow in reading order", () => {
    // The R at (0,0) is blocked by the U beside it. The U at (0,1) has a clear path up.
    const state = newGame(parseBoard(["RU", "DL"]));
    expect(findHint(state)).toEqual(at(0, 1));
  });

  it("returns only one arrow, not a sequence of moves", () => {
    const state = newGame(parseBoard(["R..", "..U", "..L"]));
    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(Array.isArray(hint)).toBe(false);
  });

  it("always names an unsolved arrow that can slide", () => {
    // Walk a whole level, asking for a hint at each step; each one must be a legal, unsolved arrow.
    let state: GameState = newGame(parseBoard(["LUUU.U.LRU", "L..D....D.", "L...LUU..D", ".U...U...R", "L...L.L.RR", "LUU..DRRR.", "LD....RD.R", "LDUD.RR.R.", "UDD.D.D.DD"]));
    while (state.status === "playing") {
      const hint = findHint(state);
      expect(hint).not.toBeNull();
      const tile = state.board.cells[hint!.row]?.[hint!.col];
      expect(tile && !tile.cleared).toBe(true);
      expect(canSlide(state.board, hint!)).toBe(true);
      state = tap(state, hint!).state;
    }
    expect(state.status).toBe("won");
  });

  it("returns null when no arrow is free", () => {
    // Two arrows pointing at each other: neither can leave.
    expect(findHint(newGame(parseBoard(["RL"])))).toBeNull();
  });

  it("returns null when the level is no longer playing", () => {
    const won = tap(newGame(parseBoard(["R."])), at(0, 0)).state;
    expect(findHint(won)).toBeNull();
  });

  it("points at a cell the solver can clear first", () => {
    const board = parseBoard(["R..", "..U", "..L"]);
    const hint = findHint(newGame(board));
    expect(hint).not.toBeNull();
    expect(solve(board)?.[0]).toEqual(hint);
  });
});

describe("spendHint: one hint per level", () => {
  it("spends the hint and returns the position", () => {
    const state = newGame(parseBoard(["R.U", "..."]));
    const { state: next, hint } = spendHint(state);
    expect(hint).toEqual(at(0, 2));
    expect(next.hintUsed).toBe(true);
    expect(next.board).toBe(state.board);
  });

  it("gives no second hint on the same level", () => {
    const first = spendHint(newGame(parseBoard(["R.U", "..."])));
    const second = spendHint(first.state);
    expect(second.hint).toBeNull();
    expect(second.state).toBe(first.state);
  });

  it("does not spend the hint when none is available", () => {
    const state = newGame(parseBoard(["RL"]));
    const { state: next, hint } = spendHint(state);
    expect(hint).toBeNull();
    expect(next.hintUsed).toBe(false);
  });

  it("is restored by restart, and the moves before it are forgotten", () => {
    const { state } = spendHint(newGame(parseBoard(["R..", "..U"])));
    expect(state.hintUsed).toBe(true);
    const fresh = newGame(state.initial);
    expect(fresh.hintUsed).toBe(false);
    expect(spendHint(fresh).hint).not.toBeNull();
  });

  it("does not change the mistake limit", () => {
    let state = newGame(parseBoard(["R.U", "..."]));
    for (let i = 0; i < MAX_MISTAKES - 1; i++) state = tap(state, at(0, 0)).state;
    state = spendHint(state).state;
    expect(state.mistakes).toBe(MAX_MISTAKES - 1);
    expect(state.status).toBe("playing");
  });
});

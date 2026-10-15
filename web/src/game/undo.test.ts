import { describe, expect, it } from "vitest";
import { parseBoard } from "./board";
import { MAX_MISTAKES, newGame, restart, tap, undo, type GameState } from "./game";

const at = (row: number, col: number) => ({ row, col });

describe("undo round-trips", () => {
  it("restores the board after a successful slide", () => {
    const initial = parseBoard(["R..", "..U"]);
    const start = newGame(initial);
    const slid = tap(start, at(0, 0)).state;
    expect(slid.board).not.toEqual(initial);

    const back = undo(slid);
    expect(back.board).toEqual(initial);
    expect(back.moves).toEqual([]);
    expect(back.status).toBe("playing");
  });

  it("undoes several slides in reverse order back to the start", () => {
    // The R at (0,0) stays on the board, so the level is still playing after each slide.
    const initial = parseBoard(["R..", "..U", "..L"]);
    let state: GameState = newGame(initial);
    const path = [at(2, 2), at(1, 2)];
    for (const pos of path) state = tap(state, pos).state;
    expect(state.moves).toEqual(path);

    for (let i = 0; i < path.length; i++) state = undo(state);
    expect(state.board).toEqual(initial);
    expect(state.moves).toEqual([]);
  });

  it("can redo a slide by tapping it again after undo", () => {
    const state = tap(newGame(parseBoard(["R..", "..U"])), at(0, 0)).state;
    const again = tap(undo(state), at(0, 0));
    expect(again.result).toBe("slid");
    expect(again.state.moves).toEqual([at(0, 0)]);
  });

  it("does nothing when there is no move to undo", () => {
    const state = newGame(parseBoard(["R."]));
    expect(undo(state)).toBe(state);
  });

  it("does not undo once the level is won", () => {
    const won = tap(newGame(parseBoard(["R."])), at(0, 0)).state;
    expect(won.status).toBe("won");
    expect(undo(won)).toBe(won);
  });

  it("does not mutate the state it was given", () => {
    const slid = tap(newGame(parseBoard(["R..", "..U"])), at(0, 0)).state;
    const snapshot = slid.moves.slice();
    undo(slid);
    expect(slid.moves).toEqual(snapshot);
  });
});

describe("mistake count and undo", () => {
  it("does not decrement the mistake counter on undo", () => {
    // The R is blocked by the U (one bump). The D at (1,0) has a clear path, so it slides.
    let state = newGame(parseBoard(["R.U", "D.."]));
    state = tap(state, at(0, 0)).state;
    expect(state.mistakes).toBe(1);
    state = tap(state, at(1, 0)).state;
    expect(state.status).toBe("playing");
    state = undo(state);
    expect(state.mistakes).toBe(1);
    expect(state.moves).toEqual([]);
  });

  it("keeps the mistake limit in force after an undo", () => {
    let state = newGame(parseBoard(["R.U", "..."]));
    for (let i = 0; i < MAX_MISTAKES - 1; i++) state = tap(state, at(0, 0)).state;
    expect(state.status).toBe("playing");
    // Slide the U, then undo it. The bumps already made must still count.
    state = undo(tap(state, at(0, 2)).state);
    expect(state.mistakes).toBe(MAX_MISTAKES - 1);
    const last = tap(state, at(0, 0));
    expect(last.result).toBe("bumped");
    expect(last.state.status).toBe("lost");
  });

  it("restart clears the move stack and the hint", () => {
    let state = tap(newGame(parseBoard(["R..", "..U"])), at(0, 0)).state;
    state = restart(state);
    expect(state.moves).toEqual([]);
    expect(state.hintUsed).toBe(false);
  });
});

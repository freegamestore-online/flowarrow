import { describe, expect, it } from "vitest";
import { parseBoard } from "./board";
import { MAX_MISTAKES, newGame, restart, tap } from "./game";

describe("tap: slides and bumps", () => {
  it("clears an unblocked arrow", () => {
    const state = newGame(parseBoard(["R."]));
    const { state: next, result } = tap(state, { row: 0, col: 0 });
    expect(result).toBe("slid");
    expect(next.status).toBe("won");
    expect(next.mistakes).toBe(0);
  });

  it("bumps a blocked arrow and counts a mistake", () => {
    const state = newGame(parseBoard(["R.U"]));
    const { state: next, result } = tap(state, { row: 0, col: 0 });
    expect(result).toBe("bumped");
    expect(next.mistakes).toBe(1);
    expect(next.status).toBe("playing");
    expect(next.board.cells[0]?.[0]).toEqual({ dir: "R", cleared: false });
  });

  it("ignores empty cells and cleared arrows without a mistake", () => {
    const state = newGame(parseBoard(["R.U"]));
    expect(tap(state, { row: 0, col: 1 })).toEqual({ state, result: "ignored", bumpShake: false });

    const cleared = tap(state, { row: 0, col: 2 }).state;
    const again = tap(cleared, { row: 0, col: 2 });
    expect(again.result).toBe("ignored");
    expect(again.state.mistakes).toBe(0);
  });

  it("wins when the last arrow slides off", () => {
    let state = newGame(parseBoard(["RU"]));
    state = tap(state, { row: 0, col: 1 }).state;
    expect(state.status).toBe("playing");
    state = tap(state, { row: 0, col: 0 }).state;
    expect(state.status).toBe("won");
  });

  it("does not mutate the state it was given", () => {
    const state = newGame(parseBoard(["R.U"]));
    tap(state, { row: 0, col: 0 });
    expect(state.mistakes).toBe(0);
  });
});

describe("mistake limit", () => {
  it("loses the level on the third bump", () => {
    expect(MAX_MISTAKES).toBe(3);
    let state = newGame(parseBoard(["R.U"]));
    for (let i = 0; i < MAX_MISTAKES - 1; i++) {
      state = tap(state, { row: 0, col: 0 }).state;
      expect(state.status).toBe("playing");
    }
    const last = tap(state, { row: 0, col: 0 });
    expect(last.result).toBe("bumped");
    expect(last.state.mistakes).toBe(MAX_MISTAKES);
    expect(last.state.status).toBe("lost");
  });

  it("ignores taps once the level is lost", () => {
    let state = newGame(parseBoard(["R.U", "..."]));
    for (let i = 0; i < MAX_MISTAKES; i++) state = tap(state, { row: 0, col: 0 }).state;
    expect(state.status).toBe("lost");
    const after = tap(state, { row: 0, col: 2 });
    expect(after.result).toBe("ignored");
    expect(after.state.board.cells[0]?.[2]).toEqual({ dir: "U", cleared: false });
  });

  it("ignores taps once the level is won", () => {
    let state = newGame(parseBoard(["R."]));
    state = tap(state, { row: 0, col: 0 }).state;
    expect(tap(state, { row: 0, col: 0 }).result).toBe("ignored");
  });
});

describe("restart", () => {
  it("returns to the initial board with no mistakes", () => {
    const initial = parseBoard(["R.U"]);
    let state = newGame(initial);
    state = tap(state, { row: 0, col: 0 }).state;
    state = tap(state, { row: 0, col: 2 }).state;
    expect(state.board).not.toBe(initial);

    const fresh = restart(state);
    expect(fresh.board).toBe(initial);
    expect(fresh.mistakes).toBe(0);
    expect(fresh.status).toBe("playing");
  });

  it("restarts a lost level so play can continue", () => {
    let state = newGame(parseBoard(["R.U"]));
    for (let i = 0; i < MAX_MISTAKES; i++) state = tap(state, { row: 0, col: 0 }).state;
    expect(state.status).toBe("lost");
    expect(tap(restart(state), { row: 0, col: 2 }).result).toBe("slid");
  });
});

describe("bump-shake feedback", () => {
  it("is set on a blocked tap and not on a slide", () => {
    const blocked = tap(newGame(parseBoard(["R.U"])), { row: 0, col: 0 });
    expect(blocked.result).toBe("bumped");
    expect(blocked.bumpShake).toBe(true);

    const slid = tap(newGame(parseBoard(["R."])), { row: 0, col: 0 });
    expect(slid.bumpShake).toBe(false);
  });
});

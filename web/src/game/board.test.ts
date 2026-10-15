import { describe, expect, it } from "vitest";
import { blockersOf, canSlide, clearArrow, isBoardCleared, parseBoard, remainingArrows } from "./board";

describe("parseBoard", () => {
  it("reads arrows and empty cells", () => {
    const board = parseBoard(["R.", ".U"]);
    expect(board.rows).toBe(2);
    expect(board.cols).toBe(2);
    expect(board.cells[0]?.[0]).toEqual({ dir: "R", cleared: false });
    expect(board.cells[0]?.[1]).toBeNull();
    expect(board.cells[1]?.[1]).toEqual({ dir: "U", cleared: false });
  });

  it("rejects ragged rows and unknown characters", () => {
    expect(() => parseBoard(["R.", "R"])).toThrow(/expected 2/);
    expect(() => parseBoard(["X."])).toThrow(/Unknown tile/);
    expect(() => parseBoard([])).toThrow();
  });
});

describe("slide rule: path to the edge", () => {
  it("lets an arrow slide when nothing lies in its direction", () => {
    const board = parseBoard(["R.."]);
    expect(canSlide(board, { row: 0, col: 0 })).toBe(true);
  });

  it("lets an arrow slide when its path crosses only empty cells", () => {
    const board = parseBoard(["U..", "...", "..R"]);
    expect(canSlide(board, { row: 0, col: 0 })).toBe(true);
    expect(canSlide(board, { row: 2, col: 2 })).toBe(true);
  });

  it("blocks an arrow whose path holds an uncleared arrow", () => {
    const board = parseBoard(["R.U"]);
    expect(canSlide(board, { row: 0, col: 0 })).toBe(false);
    expect(blockersOf(board, { row: 0, col: 0 })).toEqual([{ row: 0, col: 2 }]);
  });

  it("lists every blocker along the path, nearest first", () => {
    const board = parseBoard(["D", "U", "U"]);
    expect(blockersOf(board, { row: 0, col: 0 })).toEqual([
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
  });

  it("does not treat an arrow as blocking itself", () => {
    const board = parseBoard(["R"]);
    expect(canSlide(board, { row: 0, col: 0 })).toBe(true);
  });

  it("does not allow empty cells or off-board positions to slide", () => {
    const board = parseBoard(["R."]);
    expect(canSlide(board, { row: 0, col: 1 })).toBe(false);
    expect(canSlide(board, { row: 5, col: 5 })).toBe(false);
  });
});

describe("block rule: cleared arrows", () => {
  it("stops blocking once cleared", () => {
    const board = parseBoard(["R.U"]);
    expect(canSlide(board, { row: 0, col: 0 })).toBe(false);

    const next = clearArrow(board, { row: 0, col: 2 });
    expect(canSlide(next, { row: 0, col: 0 })).toBe(true);
  });

  it("refuses to clear an empty or already cleared cell", () => {
    const board = parseBoard(["R."]);
    expect(() => clearArrow(board, { row: 0, col: 1 })).toThrow();
    expect(() => clearArrow(clearArrow(board, { row: 0, col: 0 }), { row: 0, col: 0 })).toThrow();
  });

  it("does not mutate the original board", () => {
    const board = parseBoard(["R."]);
    clearArrow(board, { row: 0, col: 0 });
    expect(board.cells[0]?.[0]).toEqual({ dir: "R", cleared: false });
  });

  it("counts remaining arrows and detects a cleared board", () => {
    const board = parseBoard(["RU"]);
    expect(remainingArrows(board)).toBe(2);
    expect(isBoardCleared(board)).toBe(false);

    const done = clearArrow(clearArrow(board, { row: 0, col: 0 }), { row: 0, col: 1 });
    expect(remainingArrows(done)).toBe(0);
    expect(isBoardCleared(done)).toBe(true);
  });
});

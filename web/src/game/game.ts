import { canSlide, clearArrow, isBoardCleared, tileAt, type Board, type Position } from "./board";

/** Bumps allowed before the level is lost. */
export const MAX_MISTAKES = 3;

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  /** The board as it was when the level started. Restart returns to this. */
  readonly initial: Board;
  readonly board: Board;
  readonly mistakes: number;
  readonly status: GameStatus;
}

/**
 * What a tap did. `slid` clears the arrow, `bumped` counts a mistake, and `ignored`
 * covers empty cells, cleared arrows, and taps after the level has ended.
 */
export type TapResult = "slid" | "bumped" | "ignored";

export function newGame(initial: Board): GameState {
  return { initial, board: initial, mistakes: 0, status: "playing" };
}

/** Apply a tap at `pos`. Returns the next state and what the tap did. Never mutates `state`. */
export function tap(state: GameState, pos: Position): { state: GameState; result: TapResult } {
  if (state.status !== "playing") return { state, result: "ignored" };

  const tile = tileAt(state.board, pos);
  if (!tile || tile.cleared) return { state, result: "ignored" };

  if (!canSlide(state.board, pos)) {
    const mistakes = state.mistakes + 1;
    const status = mistakes >= MAX_MISTAKES ? "lost" : "playing";
    return { state: { ...state, mistakes, status }, result: "bumped" };
  }

  const board = clearArrow(state.board, pos);
  const status = isBoardCleared(board) ? "won" : "playing";
  return { state: { ...state, board, status }, result: "slid" };
}

/** Instant restart: back to the initial board with no mistakes. */
export function restart(state: GameState): GameState {
  return newGame(state.initial);
}

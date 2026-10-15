import { canSlide, clearArrow, isBoardCleared, restoreArrow, tileAt, type Board, type Position } from "./board";

/** Bumps allowed before the level is lost. */
export const MAX_MISTAKES = 3;

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  /** The board as it was when the level started. Restart returns to this. */
  readonly initial: Board;
  readonly board: Board;
  readonly mistakes: number;
  readonly status: GameStatus;
  /** Successful slides so far, oldest first. Undo pops the last one. Bumps are not recorded. */
  readonly moves: readonly Position[];
  /** True once this level's single hint has been spent. */
  readonly hintUsed: boolean;
}

/**
 * What a tap did. `slid` clears the arrow, `bumped` counts a mistake, and `ignored`
 * covers empty cells, cleared arrows, and taps after the level has ended.
 */
export type TapResult = "slid" | "bumped" | "ignored";

export interface TapOutcome {
  state: GameState;
  result: TapResult;
  /** True when the tap was blocked, so the board should play its bump-shake. */
  bumpShake: boolean;
}

export function newGame(initial: Board): GameState {
  return { initial, board: initial, mistakes: 0, status: "playing", moves: [], hintUsed: false };
}

/** Apply a tap at `pos`. Returns the next state and what the tap did. Never mutates `state`. */
export function tap(state: GameState, pos: Position): TapOutcome {
  if (state.status !== "playing") return { state, result: "ignored", bumpShake: false };

  const tile = tileAt(state.board, pos);
  if (!tile || tile.cleared) return { state, result: "ignored", bumpShake: false };

  if (!canSlide(state.board, pos)) {
    const mistakes = state.mistakes + 1;
    const status = mistakes >= MAX_MISTAKES ? "lost" : "playing";
    return { state: { ...state, mistakes, status }, result: "bumped", bumpShake: true };
  }

  const board = clearArrow(state.board, pos);
  const status = isBoardCleared(board) ? "won" : "playing";
  const moves = [...state.moves, pos];
  return { state: { ...state, board, status, moves }, result: "slid", bumpShake: false };
}

/**
 * Undo the last successful slide. The arrow goes back on the board. The mistake count is
 * kept, so an undo never forgives a bump. Only allowed while the level is playing; otherwise
 * the state comes back unchanged.
 */
export function undo(state: GameState): GameState {
  if (state.status !== "playing" || state.moves.length === 0) return state;

  const last = state.moves[state.moves.length - 1];
  if (!last) return state;
  return {
    ...state,
    board: restoreArrow(state.board, last),
    moves: state.moves.slice(0, -1),
  };
}

/**
 * The position to highlight as the next free arrow: the first arrow in reading order whose
 * path is clear. It names one arrow and no move sequence, so the full solution stays hidden.
 * Null when the level is not playing or no arrow is free.
 */
export function findHint(state: GameState): Position | null {
  if (state.status !== "playing") return null;
  for (let row = 0; row < state.board.rows; row++) {
    for (let col = 0; col < state.board.cols; col++) {
      const pos = { row, col };
      if (canSlide(state.board, pos)) return pos;
    }
  }
  return null;
}

/**
 * Spend the level's one hint. Returns the state with the hint marked used, and the position to
 * highlight. If the hint is already spent, or no hint is available, the state comes back
 * unchanged with a null hint.
 */
export function spendHint(state: GameState): { state: GameState; hint: Position | null } {
  if (state.hintUsed) return { state, hint: null };

  const hint = findHint(state);
  if (!hint) return { state, hint: null };
  return { state: { ...state, hintUsed: true }, hint };
}

/** Instant restart: back to the initial board with no mistakes, no moves, and the hint restored. */
export function restart(state: GameState): GameState {
  return newGame(state.initial);
}

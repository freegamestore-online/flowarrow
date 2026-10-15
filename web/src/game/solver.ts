import { blockersOf, clearArrow, isBoardCleared, type Board, type Position } from "./board";

/**
 * Find a sequence of slides that clears the whole board, or null when none exists.
 *
 * Recursive depth-first search over the set of cleared arrows. Clearing an arrow never
 * blocks another one, so the search seldom backtracks on solvable boards. States already
 * explored are remembered, so a dead end is not re-searched.
 */
export function solve(board: Board): Position[] | null {
  const moves: Position[] = [];
  const explored = new Set<string>();

  function search(current: Board): boolean {
    if (isBoardCleared(current)) return true;

    const key = stateKey(current);
    if (explored.has(key)) return false;
    explored.add(key);

    for (let row = 0; row < current.rows; row++) {
      for (let col = 0; col < current.cols; col++) {
        const pos = { row, col };
        if (blockersOf(current, pos).length > 0) continue;
        const tile = current.cells[row]?.[col];
        if (!tile || tile.cleared) continue;

        moves.push(pos);
        if (search(clearArrow(current, pos))) return true;
        moves.pop();
      }
    }
    return false;
  }

  return search(board) ? moves : null;
}

/** True when the board can be cleared with slides alone (no bumps). */
export function isSolvable(board: Board): boolean {
  return solve(board) !== null;
}

/** Compact fingerprint of which arrows remain. Two boards with the same key play identically. */
function stateKey(board: Board): string {
  let key = "";
  for (const line of board.cells) {
    for (const cell of line) key += cell === null ? "." : cell.cleared ? "x" : cell.dir;
  }
  return key;
}

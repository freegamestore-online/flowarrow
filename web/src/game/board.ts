/** The four directions an arrow can point. */
export type Direction = "U" | "D" | "L" | "R";

/** One arrow on the board. `cleared` arrows have left the board and no longer block anything. */
export interface ArrowTile {
  dir: Direction;
  cleared: boolean;
}

/** A cell is either empty (null) or holds an arrow tile. */
export type Cell = ArrowTile | null;

/** Immutable grid of cells, indexed as `cells[row][col]`. */
export interface Board {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly (readonly Cell[])[];
}

export interface Position {
  row: number;
  col: number;
}

const STEP: Record<Direction, Position> = {
  U: { row: -1, col: 0 },
  D: { row: 1, col: 0 },
  L: { row: 0, col: -1 },
  R: { row: 0, col: 1 },
};

const DIRECTIONS = new Set<string>(Object.keys(STEP));

/**
 * Build a board from text rows. Letters U, D, L, R are arrows; `.` is an empty cell.
 * Throws on ragged rows or unknown characters so a bad level fails loudly.
 */
export function parseBoard(rows: readonly string[]): Board {
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) throw new Error("Board must have at least one cell");

  const cells = rows.map((text, row) => {
    if (text.length !== cols) throw new Error(`Row ${row} has ${text.length} cells, expected ${cols}`);
    return [...text].map((ch, col): Cell => {
      if (ch === ".") return null;
      if (!DIRECTIONS.has(ch)) throw new Error(`Unknown tile "${ch}" at row ${row}, col ${col}`);
      return { dir: ch as Direction, cleared: false };
    });
  });
  return { rows: rows.length, cols, cells };
}

/** The tile at a position, or null when the position is off the board or empty. */
export function tileAt(board: Board, pos: Position): ArrowTile | null {
  return board.cells[pos.row]?.[pos.col] ?? null;
}

/**
 * Positions of the uncleared arrows between `pos` and the edge in the arrow's direction.
 * Empty when the path is clear, meaning the arrow can slide off.
 */
export function blockersOf(board: Board, pos: Position): Position[] {
  const tile = tileAt(board, pos);
  if (!tile || tile.cleared) return [];

  const step = STEP[tile.dir];
  const blockers: Position[] = [];
  for (let row = pos.row + step.row, col = pos.col + step.col; ; row += step.row, col += step.col) {
    if (row < 0 || col < 0 || row >= board.rows || col >= board.cols) return blockers;
    const cell = tileAt(board, { row, col });
    if (cell && !cell.cleared) blockers.push({ row, col });
  }
}

/** True when an uncleared arrow sits at `pos` and nothing blocks its path to the edge. */
export function canSlide(board: Board, pos: Position): boolean {
  const tile = tileAt(board, pos);
  return tile !== null && !tile.cleared && blockersOf(board, pos).length === 0;
}

/** Return a new board with the arrow at `pos` marked cleared. Does not check the slide rule. */
export function clearArrow(board: Board, pos: Position): Board {
  const tile = tileAt(board, pos);
  if (!tile || tile.cleared) throw new Error(`No uncleared arrow at row ${pos.row}, col ${pos.col}`);

  const cells = board.cells.map((line, row) =>
    row === pos.row ? line.map((cell, col) => (col === pos.col ? { ...tile, cleared: true } : cell)) : line,
  );
  return { ...board, cells };
}

/** Number of arrows still on the board. */
export function remainingArrows(board: Board): number {
  let count = 0;
  for (const line of board.cells) for (const cell of line) if (cell && !cell.cleared) count++;
  return count;
}

/** True once every arrow has slid off. */
export function isBoardCleared(board: Board): boolean {
  return remainingArrows(board) === 0;
}

import { blockersOf, parseBoard, remainingArrows, type Board, type Direction, type Position } from "./board";
import { solve } from "./solver";

/** Named difficulties map to a numeric level; numeric levels run 1 (easiest) to 10 (hardest). */
export type Difficulty = "easy" | "medium" | "hard" | number;

export interface GeneratedLevel {
  rows: string[];
  board: Board;
  /** Slide order that clears the board, checked by the solver before the level is returned. */
  solution: Position[];
}

const NAMED_LEVELS: Record<"easy" | "medium" | "hard", number> = { easy: 2, medium: 5, hard: 9 };
const MIN_LEVEL = 1;
const MAX_LEVEL = 10;
/** Placement attempts per arrow-field draw. The densest 10x10 boards need a few thousand. */
const PLACEMENT_TRIES = 8000;
/** Whole-level retries before giving up. Each retry reseeds from the same stream. */
const LEVEL_TRIES = 200;

const STEP: Record<Direction, [number, number]> = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
const DIRECTIONS: Direction[] = ["U", "D", "L", "R"];

/** Turn a difficulty into a numeric level in 1..10. Throws on NaN. */
export function resolveDifficulty(difficulty: Difficulty): number {
  const level = typeof difficulty === "string" ? NAMED_LEVELS[difficulty] : difficulty;
  if (!Number.isFinite(level)) throw new Error(`Unknown difficulty "${String(difficulty)}"`);
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

/** Board side, arrow density and minimum starting blockers for a numeric level. Each rises with the level. */
export function shapeFor(level: number): { side: number; density: number; minBlocked: number } {
  const t = (resolveDifficulty(level) - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
  return {
    side: Math.round(4 + 6 * t),
    density: 0.35 + 0.3 * t,
    minBlocked: 1 + Math.round(8 * t),
  };
}

/** Seed used when the caller does not pass one. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

/** Small seeded PRNG (mulberry32). The same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a board at the given difficulty. The same difficulty and seed always produce the
 * same level. Every level is solver-checked before it is returned.
 *
 * Construction: arrows are placed one at a time, each only where its path to the edge is free
 * of earlier arrows. Clearing them in reverse placement order never hits a blocker. The solver
 * still runs on the result, so a construction bug fails here instead of shipping an unsolvable level.
 */
export function generateLevel(difficulty: Difficulty, seed: number = randomSeed()): GeneratedLevel {
  const shape = shapeFor(resolveDifficulty(difficulty));
  const rand = mulberry32(seed);

  for (let attempt = 0; attempt < LEVEL_TRIES; attempt++) {
    const density = shape.density + 0.05 * (rand() - 0.5);
    const rows = buildRows(shape.side, Math.round(shape.side * shape.side * density), rand);
    if (!rows) continue;

    const board = parseBoard(rows);
    if (remainingArrows(board) === 0 || blockedArrows(board) < shape.minBlocked) continue;

    const solution = solve(board);
    if (solution) return { rows, board, solution };
  }
  throw new Error(`Could not generate a solvable level (difficulty ${String(difficulty)}, seed ${seed})`);
}

/** Place up to `target` arrows on a square grid. Returns null when the target cannot be reached. */
function buildRows(side: number, target: number, rand: () => number): string[] | null {
  const grid: (Direction | null)[][] = Array.from({ length: side }, () => Array<Direction | null>(side).fill(null));
  let placed = 0;
  for (let attempt = 0; attempt < PLACEMENT_TRIES && placed < target; attempt++) {
    const row = Math.floor(rand() * side);
    const col = Math.floor(rand() * side);
    if (grid[row]?.[col] !== null) continue;
    const dir = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)] as Direction;
    if (!rayFree(grid, row, col, dir)) continue;
    grid[row]![col] = dir;
    placed++;
  }
  if (placed < target) return null;
  return grid.map((line) => line.map((dir) => dir ?? ".").join(""));
}

function rayFree(grid: (Direction | null)[][], row: number, col: number, dir: Direction): boolean {
  const [dr, dc] = STEP[dir];
  for (let r = row + dr, c = col + dc; r >= 0 && c >= 0 && r < grid.length && c < grid.length; r += dr, c += dc) {
    if (grid[r]?.[c]) return false;
  }
  return true;
}

/** Arrows with another uncleared arrow on their path. Measured with the engine's own rule. */
function blockedArrows(board: Board): number {
  let blocked = 0;
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (board.cells[row]?.[col] && blockersOf(board, { row, col }).length > 0) blocked++;
    }
  }
  return blocked;
}

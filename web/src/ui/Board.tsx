import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { type Board as BoardModel, type Direction, type Position } from "../game/board";
import { useShake } from "../feel/useShake";
import { prefersReducedMotion } from "../motion/reducedMotion";

/** Rotation for each arrow glyph. The arrow is drawn pointing right. */
const ROTATION: Record<Direction, number> = { R: 0, D: 90, L: 180, U: 270 };

/** Unit step of each direction, used for the slide-off motion. */
const STEP: Record<Direction, { x: number; y: number }> = {
  R: { x: 1, y: 0 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  U: { x: 0, y: -1 },
};

/** Distance an arrow travels as it leaves, in px. Enough to clear any board. */
const EXIT_PX = 480;
const EXIT_MS = 340;
/** Ease-in: the arrow leaves slowly, then gathers speed off the edge. */
const EXIT_EASING = "cubic-bezier(0.55, 0, 1, 0.45)";

interface TileProps {
  dir: Direction;
  cleared: boolean;
  hint: boolean;
  /** Bumps when this tile was the blocked one. Each change plays one shake. */
  bumpSeq: number;
  label: string;
  onTap: () => void;
}

function Tile({ dir, cleared, hint, bumpSeq, label, onTap }: TileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const wasCleared = useRef(cleared);
  const shake = useShake(ref, { amplitude: 4, duration: 320 });

  // Slide the arrow off the edge once when it clears. Undo puts it back without animation.
  useEffect(() => {
    const element = ref.current;
    if (!element || wasCleared.current === cleared) return;
    wasCleared.current = cleared;
    if (!cleared || typeof element.animate !== "function") return;

    if (prefersReducedMotion()) {
      element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      return;
    }
    const { x, y } = STEP[dir];
    element.animate(
      [
        { transform: "translate(0, 0)", opacity: 1 },
        { transform: `translate(${x * EXIT_PX}px, ${y * EXIT_PX}px)`, opacity: 0 },
      ],
      { duration: EXIT_MS, easing: EXIT_EASING, fill: "forwards" },
    );
  }, [cleared, dir]);

  useEffect(() => {
    if (bumpSeq > 0) shake();
  }, [bumpSeq, shake]);

  return (
    <button
      ref={ref}
      type="button"
      className={`tile${hint ? " is-hint" : ""}${cleared ? " is-cleared" : ""}`}
      aria-label={cleared ? "Cleared" : label}
      disabled={cleared}
      onClick={onTap}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
        <path d="M4 12h12M12 6l6 6-6 6" />
      </svg>
    </button>
  );
}

const DIRECTION_NAME: Record<Direction, string> = { R: "right", D: "down", L: "left", U: "up" };

export interface BoardProps {
  board: BoardModel;
  /** Attached to the board element, so the parent can measure it for confetti. */
  boardRef: RefObject<HTMLDivElement | null>;
  hint: Position | null;
  /** Position of the most recent bump, and a counter that rises on each bump. */
  bump: { pos: Position | null; seq: number };
  onTap: (pos: Position) => void;
}

export function Board({ board, boardRef, hint, bump, onTap }: BoardProps) {
  return (
    <div
      ref={boardRef}
      className="board"
      role="grid"
      aria-label={`${board.rows} by ${board.cols} board`}
      style={{ "--cols": board.cols, "--rows": board.rows } as CSSProperties}
    >
      {board.cells.flatMap((line, row) =>
        line.map((cell, col) => {
          if (!cell) return <div key={`${row}-${col}`} className="cell" aria-hidden="true" />;
          const pos = { row, col };
          const bumped = bump.pos !== null && bump.pos.row === row && bump.pos.col === col;
          const hinted = hint !== null && hint.row === row && hint.col === col;
          return (
            <div key={`${row}-${col}`} className="cell" role="gridcell">
              <Tile
                dir={cell.dir}
                cleared={cell.cleared}
                hint={hinted}
                bumpSeq={bumped ? bump.seq : 0}
                label={`Arrow pointing ${DIRECTION_NAME[cell.dir]}`}
                onTap={() => onTap(pos)}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}

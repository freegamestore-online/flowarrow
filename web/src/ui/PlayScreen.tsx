import { useRef, useState } from "react";
import { useGameSounds } from "@freegamestore/games";
import { parseBoard, type Position } from "../game/board";
import { getStarRating, saveProgress } from "../game/progress";
import { submitScore } from "../game/leaderboard";
import { newGame, restart, spendHint, tap, undo, MAX_MISTAKES, type GameState } from "../game/game";
import { ParticleLayer, type ParticleLayerHandle } from "../feel/ParticleLayer";
import { HAPTICS, vibrate } from "../feel/haptics";
import { Board } from "./Board";

/** A board to play, with the id its progress is saved under. */
export interface PlayTarget {
  id: string | number;
  rows: readonly string[];
  /** Set for the daily board, so a win is posted for that UTC day. */
  date?: string;
}

/** Short pulse for each successful slide. */
const SLIDE_PULSE = 8;
/** Blocked tap: two quick knocks. */
const BUMP_PULSE = [30, 50, 30];
/** Palette for the clear celebration. Fixed values, because canvas cannot read CSS variables. */
const CONFETTI = ["#2563eb", "#f59e0b", "#16a34a", "#e11d48", "#7c3aed"];

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export interface PlayScreenProps {
  target: PlayTarget;
  onMenu: () => void;
  onNext?: () => void;
}

export function PlayScreen({ target, onMenu, onNext }: PlayScreenProps) {
  const [state, setState] = useState<GameState>(() => newGame(parseBoard(target.rows)));
  const [hint, setHint] = useState<Position | null>(null);
  const [bump, setBump] = useState<{ pos: Position | null; seq: number }>({ pos: null, seq: 0 });
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const confetti = useRef<ParticleLayerHandle>(null);
  const sounds = useGameSounds();

  function celebrate() {
    const stage = stageRef.current;
    const board = boardRef.current;
    if (!stage || !board) return;
    const origin = stage.getBoundingClientRect();
    const box = board.getBoundingClientRect();
    const cx = box.left - origin.left + box.width / 2;
    const cy = box.top - origin.top + box.height / 2;
    const options = { count: 48, speed: [220, 520] as const, size: [4, 8] as const, life: 1.2 };
    confetti.current?.burst(cx, cy, CONFETTI, options);
    confetti.current?.burst(cx - box.width / 3, cy, CONFETTI, { ...options, angle: -Math.PI / 2, spread: Math.PI / 2 });
    confetti.current?.burst(cx + box.width / 3, cy, CONFETTI, { ...options, angle: -Math.PI / 2, spread: Math.PI / 2 });
  }

  function handleTap(pos: Position) {
    const outcome = tap(state, pos);
    setHint(null);

    if (outcome.result === "slid") {
      sounds.playMove();
      vibrate(SLIDE_PULSE);
    } else if (outcome.result === "bumped") {
      sounds.playError();
      vibrate(BUMP_PULSE);
      setBump((prev) => ({ pos, seq: prev.seq + 1 }));
    }
    setState(outcome.state);

    if (outcome.state.status === "won" && state.status === "playing") {
      const elapsed = Date.now() - startedAt;
      setTimeMs(elapsed);
      sounds.playClear();
      vibrate(HAPTICS.clear);
      celebrate();
      saveProgress(target.id, { mistakes: outcome.state.mistakes, timeMs: elapsed });
      if (target.date) void submitScore({ date: target.date, mistakes: outcome.state.mistakes, timeMs: elapsed });
    } else if (outcome.state.status === "lost" && state.status === "playing") {
      sounds.playGameOver();
      vibrate(HAPTICS.gameOver);
    }
  }

  function handleUndo() {
    if (state.status !== "playing" || state.moves.length === 0) return;
    sounds.playTick();
    setHint(null);
    setState(undo(state));
  }

  function handleHint() {
    const next = spendHint(state);
    if (!next.hint) return;
    sounds.playTick();
    setState(next.state);
    setHint(next.hint);
  }

  function handleRestart() {
    setHint(null);
    setBump({ pos: null, seq: 0 });
    setTimeMs(null);
    setStartedAt(Date.now());
    setState(restart(state));
  }

  const playing = state.status === "playing";
  const won = state.status === "won";
  const lost = state.status === "lost";
  const stars = won && timeMs !== null ? getStarRating(state.mistakes, timeMs) : 0;

  return (
    <div className="play">
      <p className="play-status" role="status" aria-live="polite">
        {playing && `Mistakes ${state.mistakes} of ${MAX_MISTAKES}`}
        {won && `Cleared in ${formatTime(timeMs ?? 0)}`}
        {lost && "Out of mistakes"}
      </p>

      <div className="play-stage" ref={stageRef}>
        <Board board={state.board} boardRef={boardRef} hint={hint} bump={bump} onTap={handleTap} />
        <ParticleLayer ref={confetti} />

        {(won || lost) && (
          <div className="result">
            <h2 className="result-title">{won ? "Board cleared" : "Level lost"}</h2>
            {won && (
              <p className="result-stars" aria-label={`${stars} of 3 stars`}>
                {[1, 2, 3].map((n) => (n <= stars ? "★" : "☆")).join(" ")}
              </p>
            )}
            <div className="result-actions">
              {won && onNext && (
                <button type="button" className="btn btn-primary" onClick={onNext}>
                  Next level
                </button>
              )}
              {lost && (
                <button type="button" className="btn btn-primary" onClick={handleRestart}>
                  Try again
                </button>
              )}
              <button type="button" className="btn" onClick={onMenu}>
                Levels
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="play-controls">
        <button type="button" className="btn" onClick={onMenu}>
          Levels
        </button>
        <button type="button" className="btn" onClick={handleUndo} disabled={!playing || state.moves.length === 0}>
          Undo
        </button>
        <button type="button" className="btn" onClick={handleHint} disabled={!playing || state.hintUsed}>
          {state.hintUsed ? "Hint used" : "Hint"}
        </button>
        <button type="button" className="btn" onClick={handleRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}

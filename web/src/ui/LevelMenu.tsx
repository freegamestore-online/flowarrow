import { useMemo } from "react";
import { LEVELS } from "../game/levels";
import { getDailyLevel, utcDateKey } from "../game/daily";
import { loadProgress } from "../game/progress";
import type { PlayTarget } from "./PlayScreen";

export interface LevelMenuProps {
  onPlay: (target: PlayTarget) => void;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (n <= count ? "★" : "☆")).join("")}
    </span>
  );
}

export function LevelMenu({ onPlay }: LevelMenuProps) {
  const daily = useMemo(() => getDailyLevel(), []);
  const dailyId = `daily-${utcDateKey()}`;
  const dailyProgress = loadProgress(dailyId);

  return (
    <div className="menu">
      <section className="menu-section" aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="section-title">
          Today&rsquo;s board
        </h2>
        <button
          type="button"
          className="daily-card"
          onClick={() => onPlay({ id: dailyId, rows: daily.rows, date: daily.date })}
        >
          <span className="daily-date">{daily.date}</span>
          <span className="daily-state">{dailyProgress?.solved ? <Stars count={dailyProgress.stars} /> : "Play today"}</span>
        </button>
      </section>

      <section className="menu-section" aria-labelledby="levels-heading">
        <h2 id="levels-heading" className="section-title">
          Levels
        </h2>
        <div className="level-grid">
          {LEVELS.map((level) => {
            const progress = loadProgress(level.id);
            return (
              <button
                key={level.id}
                type="button"
                className="level-button"
                aria-label={`Level ${level.id}, ${level.rows.length} by ${level.rows.length}${progress?.solved ? `, ${progress.stars} stars` : ""}`}
                onClick={() => onPlay({ id: level.id, rows: level.rows })}
              >
                <span className="level-number">{level.id}</span>
                <span className="level-stars">
                  <Stars count={progress?.stars ?? 0} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="fgs-credit">
        Built for <a href="https://freegamestore.online">freegamestore.online</a>
      </p>
    </div>
  );
}

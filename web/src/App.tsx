import { useState } from "react";
import { GameShell, GameTopbar, GameAuth, GameThemeToggle } from "@freegamestore/games";
import { LevelMenu } from "./ui/LevelMenu";
import { PlayScreen, type PlayTarget } from "./ui/PlayScreen";
import { LEVELS } from "./game/levels";

type Screen = { kind: "menu" } | { kind: "play"; target: PlayTarget; levelIndex: number | null };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });

  function playLevel(index: number) {
    const level = LEVELS[index];
    if (!level) return;
    setScreen({ kind: "play", target: { id: level.id, rows: level.rows }, levelIndex: index });
  }

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Flowarrow"
          rules={
            <p>
              Arrows slide off the board when the path ahead is clear. Tap a blocked arrow and it counts as a
              mistake. Three mistakes end the level. Clear every arrow to win.
            </p>
          }
          about={
            <p>
              Flowarrow is free forever, with no ads, purchases or tracking. It collects no personal data. Your
              progress stays on this device. Read the <a href="privacy.html">privacy statement</a>.
            </p>
          }
          actions={
            <>
              <GameThemeToggle />
              <GameAuth />
            </>
          }
        />
      }
    >
      {screen.kind === "menu" ? (
        <LevelMenu onPlay={(target) => setScreen({ kind: "play", target, levelIndex: null })} />
      ) : (
        <PlayScreen
          key={String(screen.target.id)}
          target={screen.target}
          onMenu={() => setScreen({ kind: "menu" })}
          onNext={
            screen.levelIndex !== null && screen.levelIndex + 1 < LEVELS.length
              ? () => playLevel(screen.levelIndex! + 1)
              : undefined
          }
        />
      )}
    </GameShell>
  );
}

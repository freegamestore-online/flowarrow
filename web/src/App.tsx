import { GameShell, GameTopbar, GameAuth, GameThemeToggle } from "@freegamestore/games";

export default function App() {
  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Flowarrow"
          score={0}
          actions={
            <>
              <GameThemeToggle />
              <GameAuth />
            </>
          }
        />
      }
    >
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Flowarrow
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Your game will appear here once it&rsquo;s built.
        </p>
      </div>
    </GameShell>
  );
}

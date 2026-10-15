/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the daily leaderboard API. Unset disables the leaderboard. */
  readonly VITE_LEADERBOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

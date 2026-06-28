// Per-day game state in localStorage. Replaces the server-side game_sessions
// table: guesses, status and hint level now live entirely in the browser.

import type { GameState } from "./engine";

const PREFIX = "fundle_game_";

export function defaultGame(): GameState {
  return { guesses: [], status: "playing", hint_level: 0 };
}

export function loadGame(puzzleDate: string): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + puzzleDate);
    if (!raw) return null;
    return { ...defaultGame(), ...JSON.parse(raw) } as GameState;
  } catch {
    return null;
  }
}

export function saveGame(puzzleDate: string, state: GameState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + puzzleDate, JSON.stringify(state));
}

export function clearGame(puzzleDate: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFIX + puzzleDate);
}

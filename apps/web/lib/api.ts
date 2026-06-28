// Gameplay used to be server calls; now it runs entirely in the browser.
// fetchToday/submitGuess keep the same async signatures so the UI is unchanged,
// but they read the daily puzzle from Supabase and drive a local game engine.

import { computeState, decodeAnswer, evaluateGuess, MAX_GUESSES, type Puzzle } from "./engine";
import { defaultGame, loadGame, saveGame } from "./gameStore";
import { fetchTodayPuzzleRow, recordResult } from "./supabase";
import { getOrCreateSessionId, isDebugFresh } from "./storage";
import type { PuzzleState } from "./types";

let currentPuzzle: Puzzle | null = null;

async function loadPuzzle(): Promise<Puzzle> {
  const row = await fetchTodayPuzzleRow();
  currentPuzzle = {
    puzzle_date: row.puzzle_date,
    puzzle_number: row.puzzle_number,
    payload: row.payload,
    answer_eur: decodeAnswer(row.answer_token),
  };
  return currentPuzzle;
}

export async function fetchToday(): Promise<PuzzleState> {
  const puzzle = await loadPuzzle();
  const game = (!isDebugFresh() && loadGame(puzzle.puzzle_date)) || defaultGame();
  return computeState(puzzle, game, getOrCreateSessionId());
}

export async function submitGuess(amount: number): Promise<PuzzleState> {
  const puzzle = currentPuzzle ?? (await loadPuzzle());
  const sessionId = getOrCreateSessionId();
  const game = loadGame(puzzle.puzzle_date) || defaultGame();

  if (game.status !== "playing") {
    return computeState(puzzle, game, sessionId);
  }

  const { correct, direction } = evaluateGuess(puzzle.answer_eur, amount);
  game.guesses = [...game.guesses, { amount, direction }];

  if (correct) {
    game.status = "won";
    game.hint_level = MAX_GUESSES - 1; // == MAX_HINT_LEVEL (4)
  } else if (game.guesses.length >= MAX_GUESSES) {
    game.status = "lost";
  } else {
    game.hint_level = Math.min(game.hint_level + 1, MAX_GUESSES - 1);
  }
  saveGame(puzzle.puzzle_date, game);

  if (game.status !== "playing" && !game.reported) {
    const bucket = game.status === "won" ? game.guesses.length : 6;
    // Best-effort: never let community-stats reporting break gameplay.
    recordResult(puzzle.puzzle_date, game.status === "won", bucket).catch(() => {});
    game.reported = true;
    saveGame(puzzle.puzzle_date, game);
  }

  return computeState(puzzle, game, sessionId, { correct, direction });
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

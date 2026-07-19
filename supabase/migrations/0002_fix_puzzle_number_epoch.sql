-- One-time fix: puzzle_number was seeded from a hardcoded 2026-01-01 epoch
-- (a placeholder picked when the column was first written), so it drifted
-- into showing what looks like "day of the year" instead of a Wordle-style
-- count since Fundle's actual first daily puzzle.
--
-- Recompute every row using the earliest puzzle_date already in the table as
-- day 1 -- the real day zero, straight from the data instead of a guess. The
-- builder (scripts/build_daily_puzzle.py) now derives new puzzle_number
-- values the same way, so this migration just realigns the existing rows
-- with that logic.
update daily_puzzles
set puzzle_number = (puzzle_date - (select min(puzzle_date) from daily_puzzles)) + 1;

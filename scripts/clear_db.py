#!/usr/bin/env python3
"""Clear all puzzles from database (dev only)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from dotenv import load_dotenv
load_dotenv(API_ROOT / ".env")

from app.database import SessionLocal
from app.models import DailyPuzzle

db = SessionLocal()
count = 0
for puzzle in db.query(DailyPuzzle).all():
    print(f"Deleting puzzle for {puzzle.puzzle_date}: €{puzzle.answer_eur:,}")
    db.delete(puzzle)
    count += 1
db.commit()
db.close()
print(f"\nCleared {count} puzzle(s) ✓")

"""Reversible answer obfuscation shared with the frontend.

Mirrors apps/web/lib/engine.ts (obfuscateAnswer / decodeAnswer). This is NOT
encryption — it only keeps the asking price out of plain sight in the puzzle
JSON. Anyone running the inverse can recover it, which is acceptable for a
casual game (Wordle ships all answers in its bundle too).
"""

from __future__ import annotations

import base64

OBF_K = 7919
OBF_S = 104729


def obfuscate(answer: int) -> str:
    return base64.b64encode(str(answer * OBF_K + OBF_S).encode()).decode()


def deobfuscate(token: str) -> int:
    return round((int(base64.b64decode(token).decode()) - OBF_S) / OBF_K)

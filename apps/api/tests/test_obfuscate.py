"""Round-trip tests for the shared answer obfuscation."""

from app.obfuscate import deobfuscate, obfuscate


def test_round_trip():
    for n in (0, 1000, 149_999, 500_000, 1_234_567, 9_999_999):
        assert deobfuscate(obfuscate(n)) == n


def test_token_is_not_plaintext():
    token = obfuscate(500_000)
    assert "500000" not in token
    assert token != str(500_000)

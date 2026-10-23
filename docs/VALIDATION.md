# v0.2 validation

Checked locally on October 22, 2026 (America/New_York).

- Environment: Windows, Python 3.11; native browser ES modules and SVG, no frontend build step.
- `python -m unittest discover -s tests -v`: **12 tests, 10 passed, 2 skipped**.
- Passed: normalization/precision, candidate bounds and Decimal rounding, ideal/anti-ideal validation, update-count and original-relative bounds, full Python pairings at n=2/20/100/200, P receiving the current proposal/history, timeout/malformed replies, live weight redaction, replay contribution equality, cancellation preserving partial records, and result restoration after restart.
- Skipped: C++ and Julia pairing checks because `g++` and `julia` are not installed here. Their runtime compatibility remains unverified.
- Browser: completed a real two-game pairing; inspected attribute and signed-preference views; moved back a proposal; checked 200-attribute live play, freezing/rejoining live progress and Stop; opened saved standings/history; switched the build guide to C++; exercised Copy email.
- Responsive: checked the actual page at 1536×1024 and 390×844. Mobile uses a compact setup panel, scrollable attribute grid and table containers; the page has no horizontal overflow.
- `docs/screenshots/` contains actual browser captures, not design mockups. Samples can repeat a candidate and produce a flat learning curve; no decorative scores or synthetic progress are inserted.
- Not yet verified: macOS/Linux/crunchy5 execution, final competition runtimes/settings, high-load tournaments and browser file import/export end to end. JSON import/export controls are implemented; automated validation covers saved-result restoration.

This is a tested Python architecture preview. Optional checks automatically run when the additional runtimes are available.

# v0.1 validation

Checked locally on October 22, 2026 (America/New_York).

- Environment: Windows, Python 3.11.
- `python -m unittest discover -s tests -v`: **9 tests, 7 passed, 2 skipped**.
- Passed: preference normalization/precision, candidate bounds and rounding, ideal/anti-ideal validation, update-count and original-relative bounds, full two-role Python pairings at n=2/20/100/200, P receiving the current candidate and prior history, timeout and malformed reply handling.
- Skipped: C++ and Julia pairing checks because `g++` and `julia` are not installed on this host. Those templates are supplied for review; their runtime compatibility is not yet verified.
- Browser: loaded the actual localhost dashboard, ran a pairing, checked both result buttons, opened Game 1, moved the proposal slider to proposal 20 and confirmed the score/candidate text updated. Captured the actual page in `docs/screenshots/dashboard.jpg`.
- Not yet verified: macOS/Linux/crunchy5 execution; final competition runtime availability and settings; high-load tournaments; restart restoration of browser results (not implemented).

This is a tested Python architecture preview, not a claim that all language/host combinations have passed. Optional checks automatically run when their runtimes are available.

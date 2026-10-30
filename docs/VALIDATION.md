# October 30 event configuration verification

- Python suite: 18 tests, 16 passed, 2 skipped because g++ and Julia are unavailable.
- Added regression coverage for saved settings, event policy locks, repeated runs, seeds and persistent exclusions.
- Node checks cover event separation, custom points, mean-score ranking and excluded records.
- Browser smoke test: a separate practice event with two pairings, seed 42, and 5 points per win displayed 10 points for two wins. No existing official records were changed.
- Fixed course constraints remain fixed. Configurable ranking modes are documented in ON_SITE_CONFIG.md; arbitrary formulas and host resource quotas are not implemented.

---

# Validation status

Latest recorded automated run: October 29, 2026. **16 tests: 14 passed, 2 skipped** (g++ and Julia unavailable). Includes saved on-site configuration and explicit P/M selection order. Python was exercised locally on Windows. C++/Julia, macOS/Linux/crunchy5 and final competition settings remain unverified.

The current UI is English-only, with grouped three-metric bars and explicit Person/Matchmaker selectors. Submission instructions live on GitHub. Older UI descriptions below are historical evidence, not instructions for the current interface.

## Historical checks (October 22, 2026)

### v0.3 validation

Checked locally on October 22, 2026 (America/New_York).

- Environment: Windows, Python 3.11; native browser ES modules and SVG, no frontend build step.
- Last referee test run (v0.2; referee unchanged in v0.3): `python -m unittest discover -s tests -v`: **12 tests, 10 passed, 2 skipped**.
- Passed: normalization/precision, candidate bounds and Decimal rounding, ideal/anti-ideal validation, update-count and original-relative bounds, full Python pairings at n=2/20/100/200, P receiving the current proposal/history, timeout/malformed replies, live weight redaction, replay contribution equality, cancellation preserving partial records, and result restoration after restart.
- Skipped: C++ and Julia pairing checks because `g++` and `julia` are not installed here. Their runtime compatibility remains unverified.
- Browser: completed a real two-game pairing; inspected attribute and signed-preference views; moved back a proposal; checked 200-attribute live play, freezing/rejoining live progress and Stop; opened saved standings/history; switched the build guide to C++; exercised Copy email.
- Responsive: checked the actual page at 1536×1024 and 390×844. Mobile uses a compact setup panel, scrollable attribute grid and table containers; the page has no horizontal overflow.
- `docs/screenshots/` contains actual browser captures, not design mockups. Samples can repeat a candidate and produce a flat learning curve; no decorative scores or synthetic progress are inserted.
- Not yet verified: macOS/Linux/crunchy5 execution, final competition runtimes/settings, high-load tournaments and browser file import/export end to end. JSON import/export controls are implemented; automated validation covers saved-result restoration.

This is a tested Python architecture preview. Optional checks automatically run when the additional runtimes are available.

## v0.3 browser review

- Compared the published Evasion, Kelly and No Tipping screenshots directly; retained their dark tournament surface, primary match visualization, adjacent inspector, clocks and replay workflow.
- Full real n=20 pairing completed after the redesign. Verified provisional versus final score comparison, referee-owned winner, contributions hidden during live play, post-game signed contribution bars, zero-value bars, selected-attribute arithmetic and previous-proposal replay.
- How to play dialog opens, switches English/Chinese, describes P/M, scoring flow and two-game victory, and closes through native dialog controls.
- In-app browser checked at 1536×1100 and 390×844. Mobile page and dialog do not overflow horizontally. Browser error log was empty; all dashboard JS modules passed `node --check`.
- Latest native browser captures in screenshots/ include the arena, preferences, contributions, guide and Chinese instructions. Concept-to-render visual inspection used view_image. Full source contains native HTML/CSS/SVG; no generated screenshot substitutes for a working visualization.
- Existing language/host validation limits above remain.

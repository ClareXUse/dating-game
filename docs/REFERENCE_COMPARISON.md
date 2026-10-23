# Architecture references

Reviewed October 22, 2026 using the published GitHub READMEs and their architecture announcements.

| Reference | Pattern retained here |
|---|---|
| [Shela Wu / No Tipping](https://github.com/shela-wu/no_tipping) | Copy whole template; strategy separate from wrapper; complete-folder ZIP; runtime/dependency/setup metadata; early communication test |
| [Swapnil Sapkota / Kelly](https://github.com/swapn1ll/Kelly_game) | Quick-start table and contents; Python/C++/Julia; bots.json; local start.py; two games with roles swapped |
| [Stephen Herbert / Evasion](https://github.com/8steve8/evasion) | Dark navy/teal tournament desk; numbered setup; local roster; clocks; result files; replay inspection; host dependencies explained |

## Intentional Dating Game differences

The two roles are P and M; ranking is lexicographic by M score and proposal count. This is not Kelly capital aggregation or Evasion capture timing. P's informed preference changes, binary initial samples and 200-attribute limit come from the current official Dating Game rules.

v0.2 keeps that local architecture and adds a live tournament desk: attribute and signed-weight views, per-proposal contribution inspection, chart/slider playback, clocks, stop controls, restored standings/history and JSON import/export. The build guide follows the same complete-folder handoff convention. A self-contained HTML replay is not implemented; use JSON with the local dashboard. Private announcements, class mailing lists and received participant strategies are excluded from the public package.

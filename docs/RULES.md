# Rule source and architect decisions

Source: [Dennis Shasha, Dating Game — Fall 2026](https://cs.nyu.edu/courses/fall26/CSCI-GA.2965-001/dating.html), read in the authenticated in-app browser on October 22, 2026. Direct automated HTTP access returned 401; the browser displayed the full official rule page. The historical third-party mirror is not used to override this source.

## October 30 clarification applied

The current referee limits each weight to **±5% of its original value**, following Dennis's October 30 clarification. This supersedes the **20%** amplitude in the rule-page text recorded below. The per-response limit remains floor(n/20) changed coordinates, compared with the previous vector; edits persist. This update does not introduce a requirement that 95% of all coordinates always equal their original values.

Normalization and two-decimal weight precision still apply. For example, an original weight of 0.10 has an allowed interval of 0.095–0.105, so at two-decimal precision it cannot change. Zero weights cannot change either. The sign-preserving bound and exact original-weight success test are unchanged.

New results carry the rule profile `dating-2026-10-30-weight-bound-5pct`. Old records are preserved and are not re-scored. Start a new official event rather than combining old-rule and new-rule results.

## Rule-page text recorded October 22 (before clarification)

- At most **200 attributes**.
- Initial weights: [-1,1], at most two digits after the decimal; positive sum +1 and negative sum -1, with at least one of each sign.
- A proposal has attributes in [0,1], at most four decimal places; score is the dot product.
- **20 initial candidates with binary 0/1 attributes, 0.5 probability each**.
- M then proposes up to **20** candidates interactively.
- **P sees the current and previous candidates** before submitting modifications.
- P may modify 5% of the coordinates per response, bounded by 20% of their **original** weights; normalized sums remain required.
- Architect verifies P's supplied ideal and anti-ideal candidates.
- Scores are reported to four decimal places. Exact success uses pre-modification weights; compare M results by score and then by fewer candidates.

## Explicit v0.1 decisions where the text leaves implementation details open

| Topic | Implemented preview behavior |
|---|---|
| Minimum n | 2; normalization needs both signs |
| 5% when n is not divisible by 20 | floor(n/20); below n=20 no coordinates can change |
| Precision after an update | Two decimals, same as initial weights |
| Which changes count | Coordinates differing from the previous current vector; each remains bounded relative to its original weight |
| Zero weight | Cannot change: its allowed interval is zero |
| Score rounding | Exact Decimal dot product, round half up to four decimals |
| Meaning of pre-modification | The original vector submitted at setup; exact score 1 triggers success, then recorded M score is 1.0000 |
| Comparing non-perfect M scores | Compare the reported four-decimal scores |
| Proposal count | Counts M proposals only; excludes 20 architect-generated examples |
| P's history | Current M candidate plus previous M proposals and their reported scores; no opponent identity or RNG seed |
| Clocks | 120 seconds total per role/game; 30 seconds start/ready; setup charged to P |
| Failure | Failing role loses that game; failure ranks documented in README |
| Process memory | Persists within one game; fresh process for next game; do not carry state through files |
| Host | Local loopback dashboard; no application memory/core quota in this preview |

These are published preview choices, not quotations from Dennis. They should be reviewed before freezing the competition protocol. The exact cutoff, host, final n values, runtime availability and failure policy confirmation remain organizer release items.

## Not interchangeable with older versions

Some earlier descriptions use n≤100, arbitrary random initial attributes and a P that cannot see M's candidates. Those choices do **not** match the current official Fall 2026 page. This architecture uses n≤200, binary initial samples and informed P updates.

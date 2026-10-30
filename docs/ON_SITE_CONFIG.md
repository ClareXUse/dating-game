# On-site competition setup

The professor announces final settings orally on competition day. Enter the announced values in **Match settings** before running the event; preview defaults are not final instructions.

## Configure and save

1. Select **Official** and enter a unique **Event ID** (for example `Final-2026`). Practice and official events have separate standings. Historical records without event metadata remain in Legacy practice. Imported replays have separate event groups.
2. Enter attributes (2–200), the clock per role/game (up to 3600 seconds), and repetitions per pair (1–100).
3. Choose the ranking policy and enter win, tie and loss points. These values affect the leaderboard, not the dot-product score inside a game.
4. Choose **Count role forfeits**, or **Exclude and rerun manually** for failed pairings. The latter preserves failed records but excludes them from standings. It does not start unlimited automatic retries.
5. Optionally enter an integer training seed. Blank generates a random seed for each pairing. Repetition k uses base seed + k − 1 (modulo 2^31). Both role assignments use the same training seed. Bot-internal randomness is not controlled by this seed.
6. Record the professor's instructions and a round label. Notes are metadata, not executable rules.
7. Click **Save settings**, or start a run to save automatically. Configuration survives referee restart in results/settings.json. Each pairing stores its own immutable configuration, actual seed, repetition number and timestamp.
8. Select P and M, then **Start pairing**; roles swap for game 2. **Every pair** runs all roster pairs, repeated the configured number of times. Use separate runs for multiple announced attribute sizes.

After the first record in an event, its ranking and failure policy cannot change. Enter a new Event ID if the professor changes that policy. Attribute count and clock may vary between rounds of one event; record the announced schedule in the notes. Stop ends the run; incomplete pairings do not count. Repetitions start from one on each new run.

## Ranking options

- **Points**: total configured points, then wins, ties, highest valid M score, then name.
- **Wins**: wins, then ties, highest valid M score, then name.
- **Mean best M score**: mean of each counted pairing's M result, then wins, ties, highest valid M score, then name. For counted forfeits this mean uses +1 for a P failure and −1 for an M failure. The Best M score column includes valid games only.

Name ordering is a deterministic display tie-break, not an extra earned point. These are supported organizer policies, not a claim that the professor has selected one. A new formula outside these options needs an implementation change before use.

Each pairing's winner still follows the published game comparison: role failures, best M score, then fewer proposals. Tournament ranking settings do not redefine the game's fixed rules.

## Records and reruns

In **Leaderboard**, select the intended event. History is filtered to that event as well. To discard a run from ranking, click **Exclude**, enter the reason, and run the replacement pairing under the same event. The original JSON and replay remain available with the exclusion reason. Exclusion is permanent through the current UI; the original result is not deleted. Check exclusions before exporting.

**Export results** backs up all loaded records, including configuration and exclusions. Back up the results folder as well. Browser-imported records are replay copies, never merged into host official standings; do not use re-import to register a new official result.

## Fixed rules and host preparation

The verified course rules remain enforced: 20 binary training examples, up to 20 proposals, vector bounds and precision, normalized weights, and bounded preference updates. See [RULES.md](RULES.md). The settings form does not turn arbitrary prose into referee behavior.

Before the event, verify the actual host runtimes and each submitted program in both roles. Python is locally verified; C++ and Julia require their compilers/runtimes and still need host validation. Memory/core/network quotas are not enforced by this local trusted-program runner. Record any announced resource restriction and use a host environment that enforces it before the official run.

Preserve each original submission ZIP and version. Adapt launch commands and serialization in a separate copy without changing the author's strategy. Missing dependencies or unclear interfaces need an author fix; arbitrary code is not automatically compatible.

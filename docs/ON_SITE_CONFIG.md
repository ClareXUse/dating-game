# On-site configuration worksheet

Copy this file into the private `organizer/` folder before filling it in. Blank fields are deliberately unresolved; preview defaults are not final professor instructions.

## Record the instructions

| Item | Fill in on site | Current implementation |
|---|---|---|
| Event / round label | __________ | Match settings → Run label; saved with each pairing |
| Professor's instructions and confirmation time | __________ | Match settings → Professor’s instructions; saved notes, not executable rules |
| Submission cutoff and accepted source versions | __________ | Record manually before scheduling |
| Attribute count(s), n | __________ | Match settings → Attributes per person; one n per run, 2–200 |
| Time budget per role per game | __________ seconds | Match settings → Clock; one budget per run, up to 3600 seconds |
| Entrants and host runtimes | __________ | Private bots.local.json and participant SUBMISSION.md |
| Pairing schedule | __________ | Start pairing: selected pair; Every pair: one round robin |
| Repetitions / seeds | __________ | Repetitions must be scheduled explicitly; no UI seed control |
| Ranking / points / tie-breaks | __________ | Preview is wins, ties, highest M score, then name; a changed policy requires implementation before use |
| Timeout, crash and rerun policy | __________ | Preview failures affect pairing winner; rerun inclusion is not configurable yet |
| Memory / CPU / network limits | __________ | Not enforced by the current runner |
| Results folder / backup location | __________ | Default results/; export a backup after the round |

## What is a setting, and what is a rule?

Changing n or the clock changes the next run. A label or note only records context. Labeling a run “Finals” does **not** isolate it from practice standings. Current standings combine saved/imported pairings. Separate official-event selection and professor-defined ranking still need to be implemented before relying on a final leaderboard.

Rules such as vector bounds, normalization, precision, 20 initial examples, 20 proposals and allowed weight changes are enforced in the referee. See [RULES.md](RULES.md) for official rules versus architect preview decisions. Do not silently reinterpret a new instruction: if it changes an enforced rule or ranking policy, update the implementation and verify it before starting the official round.

Each dashboard pairing now saves `match_configuration`: label, notes, actual n/clock and preview rule/ranking profile identifiers. Downloaded pairing records contain this metadata. Historical and CLI records may not have it. Labels and notes are held for the current server session; after restarting, enter the new run configuration explicitly. Notes do not modify behavior.

## Adapting received programs

1. Preserve the original ZIP and source version privately. Work on a separate adapter copy.
2. Prefer the supplied complete Python, C++ or Julia template. Other launch commands can be registered as argument arrays in bots.local.json if they implement the protocol.
3. Adapt launch/build commands and input/output serialization; preserve the author's strategy and both P/M behaviors. Ask the author to clarify missing behavior rather than invent it.
4. Confirm the runtime, dependencies, resource paths, initialization cost, persistent state and stdout/stderr behavior on the actual host.
5. Run a smoke test for both roles, then validate at the announced n and time budget. Confirm failures are null and save the test record and adapted source version.

A common template does not guarantee arbitrary code will run unchanged. GUI-only programs, missing source/dependencies, incompatible APIs and excessive startup/resource use need separate adaptation or author fixes. C++/Julia and the final host must be tested before the event.

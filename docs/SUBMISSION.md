# Player submission checklist

This is the complete technical handoff checklist for the current architecture preview. Final competition settings and the deadline will be announced separately. You can develop and send a communication-test version now.

## 1. Build both roles

Copy one complete starter folder: [Python](../bots/templates/python), [C++](../bots/templates/cpp), or [Julia](../bots/templates/julia). Implement both Person (P) and Matchmaker (M). One entry command must handle whichever role the referee supplies at startup. You may keep P and M strategies in separate source files, but include both and connect them through the entry program.

Use the [protocol](PROTOCOL.md) for exact messages and [rules](RULES.md) for enforced constraints. The initial 20 examples do not count against M's 20 proposals. P receives the current candidate before responding. Treat n and the remaining clock as inputs, not fixed constants. Keep state within a game; a new process starts for the swapped-role game.

## 2. Package the complete runnable folder

Email **dating-YOUR_NETID.zip** to **zx1946@nyu.edu** with subject **[Dating Game] YOUR_NETID — Bot name**.

```text
dating-YOUR_NETID.zip
└── YOUR_NETID/
    ├── bot.py
    ├── strategy.py           # Python
    │   # OR strategy.cpp + build.py (C++)
    │   # OR strategy.jl (Julia)
    ├── SUBMISSION.md
    └── resources/            # if your code needs them
```

Include all imported local modules, strategy files, wrappers, build scripts, model/data files and dependency manifests needed by your program. Keep resource paths relative to the submitted folder. Do not rely on a file that exists only elsewhere on your laptop. Include source; a platform-specific executable alone is insufficient. Do not include credentials, unrelated files or local match records.

A public GitHub issue or PR is not a submission channel. Send the complete ZIP rather than an inaccessible link. The local dashboard cannot execute code directly from a GitHub page.

## 3. Complete SUBMISSION.md

Fill in the template provided in your starter folder:

- Author(s), NetID(s), contact email and bot name.
- Submission version/date and source commit if available; identify any earlier version this replaces.
- Language, exact runtime/compiler version and tested operating system.
- Exact build and entry commands, run from the submitted folder.
- Dependencies with versions and exact installation commands; write “none” where applicable.
- P and M implementation files, required resources and relative paths.
- Smoke-test commands and results for both roles, including failures if any.
- Expected RAM, threads and startup time; note any external service/network requirement for host review. These declarations do not imply a competition resource allowance.

The supplied launcher is preferred. If you already have a different program, include its complete source and precise interface/startup instructions. Contact the architect for an adapter check before the cutoff. Adaptation is not automatic approval: missing dependencies or unclear strategy behavior must be resolved with the author.

## 4. Test the actual ZIP contents

Extract your ZIP into a clean folder and test that copy. Register it as “My Bot” in a private bots.local.json alongside a sample named “Sample A”; see [README setup](../README.md#3-add-a-local-roster).

```sh
python3 start.py match "My Bot" "Sample A" --bots bots.local.json --n 20
python3 start.py match "My Bot" "Sample A" --bots bots.local.json --n 100
python3 start.py match "My Bot" "Sample A" --bots bots.local.json --n 200
```

On Windows use `python` if needed. Each command runs both role assignments. Inspect both games: `failure` should be `null`. These sizes are compatibility checks, not an announced competition schedule. Retest at the professor's final n and time budget when announced.

Stdout must contain only newline-delimited JSON protocol replies, flushed promptly. Send debug output to stderr; the tournament runner currently discards stderr, so debug with your launcher directly. The protocol specifies startup allowance, message limits and process lifecycle. C++ must compile from source on the tournament host; Julia and other dependencies must be available there.

## 5. Submit revisions clearly

Keep the same email subject and filename convention. Update the version inside SUBMISSION.md and state which earlier version it replaces. Include the complete folder again, not just changed files. An early communication-test submission is encouraged.

The architect distinguishes “ZIP received” from “build and both-role communication test passed.” Keep your original source version so any adapter changes can be checked without altering your strategy.

## Pending professor / host decisions

Deadline, final attribute counts, time budget, host/runtime availability, schedule/repetitions, final ranking and rerun policies are not finalized by this checklist. See [on-site configuration](ON_SITE_CONFIG.md). Python has been tested locally on Windows; C++/Julia and the final host still need verification. Do not assume the preview's settings are the final competition settings.

# Submission and host runbook

## Players: what to submit

Email `dating-YOUR_NETID.zip` to **zx1946@nyu.edu**, subject `[Dating Game] YOUR_NETID — Bot name`. Deadline: to be announced.

The ZIP must contain one complete `YOUR_NETID/` folder: `bot.py`, strategy source, supplied transport/build files, required resources and a completed `SUBMISSION.md`. Implement both P and M. Include NetID, bot name, language/runtime version, dependencies, build/launch commands, source version and test results. Do not send only the strategy file. Keep strategies private; do not upload entries to public issues.

## Architect: receive → register → run

1. Extract folders into `dating-game/bots/aa111/` and `dating-game/bots/bb222/` (replace example NetIDs). Check `bot.py` is directly in each folder. Read `SUBMISSION.md` and prepare declared runtimes/dependencies.
2. Save the following as `bots.local.json` beside `start.py`:

```json
[
  {"name":"aa111","cwd":"bots/aa111","command":["{python}","bot.py"]},
  {"name":"bb222","cwd":"bots/bb222","command":["{python}","bot.py"]}
]
```

Names must be unique. Paths are relative to the roster file. Python and Julia templates use the entry above; C++ additionally needs `"build": ["{python}", "build.py"]` in its entry. Mixed languages are supported. For custom launchers, follow the author's declared command as an argument array.

3. Stop the existing server with Ctrl+C in its terminal. From the repository root:

```sh
python start.py --bots bots.local.json --port 8092
```

Use `python3` on macOS/Linux if needed. Open http://127.0.0.1:8092. Without `--bots`, the default sample roster loads.

4. Arena → choose aa111 in **Person (P)** and bb222 in **Matchmaker (M)** → **Start pairing**. Game 1 uses those exact roles; Game 2 swaps them. Each dropdown lists registered submitted strategies, not only samples. Compare the winner, best scores and proposal counts. Select either game for replay; read the decision strip for a failure reason.
5. To add entries, edit the same roster and use **Match settings → Rescan bot roster** after any running match finishes. Reloading the browser alone does not rescan. **Every pair** runs all roster pairs; Leaderboard shows saved results. Records live in `results/`.

Before the event, test both roles at n=20, 100 and 200:

```sh
python start.py match aa111 bb222 --bots bots.local.json --n 20
```

Both games should have `failure: null`. On failure, check paths, dependencies, entry commands and JSON-only stdout. The host runs local subprocesses; participant folders and the local roster stay private and are ignored by Git by default.


## On-site settings

Use the [on-site configuration worksheet](ON_SITE_CONFIG.md) for professor-provided values and unresolved competition policies. In **Match settings**, enter the run label, instructions, attribute count and clock before starting. Each dashboard pairing saves those values in its JSON record. Notes describe instructions; they do not change rules or isolate standings.

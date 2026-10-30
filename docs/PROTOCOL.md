# Protocol v1

One JSON object per line, UTF-8, flushed after each reply. Keep stdout exclusively for replies. All messages contain `type` and `n`. `start` additionally includes `protocol_version:1` and `role` (`P` or `M`). Reply `{"ready":true}` within the startup allowance. No strategy work should be done before ready.

## Person P

1. `{"type":"preferences","n":20}` → `{"weights":[...],"ideal":[...],"anti_ideal":[...]}`. Each array has n elements. The referee checks normalization, precision and the ideal/anti-ideal dot products.
2. Each M proposal produces a `modify` request:

```json
{
  "type":"modify",
  "n":20,
  "round":1,
  "candidate":[0,1,0,1],
  "history":[],
  "original_weights":[0.5,-0.5,0.5,-0.5],
  "current_weights":[0.5,-0.5,0.5,-0.5],
  "time_remaining":119.8
}
```

The vectors above are abbreviated to four entries for readability; actual messages always have **n** entries. `round` is 1–20. `candidate` is M's current proposal. `history` is the list of previous M proposals, each `{"candidate":[...],"score":"0.1234"}`. It does not include the current proposal's unknown score. Reply `{}` to keep weights, or `{"weights":[...]}` with a full replacement vector. P is not asked to score candidates; the referee computes scores.

## Matchmaker M

`{"type":"candidate","n":20,"round":1,"history":[...],"time_remaining":120.0}` → `{"candidate":[...]}`.

At round 1, history contains 20 architect-generated binary samples. At round r, it contains 20 initial examples plus r−1 scored proposals, in order. Each history object contains a candidate and a four-decimal score **string** (convert to a number in your strategy). M never receives P's weights, ideal vector, anti-ideal vector, opponent identity, random seed or the current candidate's original score. The wrapper has already parsed JSON for you.

Python strategy functions receive the message dictionary unchanged. C++ and Julia receive the same candidate/history/weight information as function arguments; the supplied `bot.py` translates JSON to a private line protocol for the persistent strategy child. Do not edit that transport. P setup in the C++/Julia baseline computes ideal/anti-ideal arrays from the signs of your returned weights.

## Lifecycle and errors

The role process starts once per game and is terminated after completion or failure. Both role processes are fresh for the second game. EOF is the end-of-game signal; there is no final-score callback. The referee caps a reply at 65,536 bytes including its newline, rejects non-object JSON and non-finite values, and charges wall time from the request until the reply arrives. Wrapper/child communication is part of that time. No cross-game disk memory is permitted by the preview rules, though the local runner does not sandbox filesystem access.

For diagnostics, run your strategy manually with stderr visible. The tournament runner discards stderr to prevent output accumulation. Full result files include preference vectors only after the game; do not distribute those records during an ongoing competition without the players' agreement.


## October 30 weight-update bound

Every updated weight must be within 5% of its original magnitude: `abs(new - original) <= 0.05 * abs(original)`. At most `floor(n/20)` coordinates may differ from the previous turn. Normalization and two-decimal precision remain required; `{}` keeps the current vector. See [rule clarification](RULES.md).

"""Two feedback-driven demonstration strategies; standard library only."""
import json
import random
import sys


def preferences(n):
    positions = list(range(n))
    random.shuffle(positions)
    k = min(n // 2, 50)
    w = [0] * n
    for side in range(2):
        for j in range(k):
            w[positions[side*k+j]] = (1 if side == 0 else -1) * (100//k + (j < 100 % k)) / 100
    return {'weights': w, 'ideal': [int(x > 0) for x in w],
            'anti_ideal': [int(x < 0) for x in w]}


def propose(state, method):
    history, n = state['history'], state['n']
    best = max(history, key=lambda h: float(h['score']))
    incumbent = list(best['candidate'])
    if state['round'] == 1:
        return incumbent
    # Only public candidate/score pairs are used. No referee state or files.
    initial = history[:20]
    correlation = [sum(float(h['score']) * (h['candidate'][i] - .5)
                       for h in initial) for i in range(n)]
    if method == 'coordinate':
        # Test uncertain coordinates first; accept changes only when feedback
        # makes them the new best observation. Each coordinate tested once.
        order = sorted(range(n), key=lambda i: abs(correlation[i]))
        i = order[(state['round'] - 2) % n]
        incumbent[i] = 1 - incumbent[i]
        return incumbent
    # Fit a linear preference estimate to ALL feedback using normalized LMS.
    # Centering is valid because legal weights sum to zero.
    estimate = [0.0] * n
    for _ in range(24):
        for h in history:
            x = [v - .5 for v in h['candidate']]
            residual = float(h['score']) - sum(a*b for a,b in zip(x, estimate))
            scale = .55 * residual / max(sum(v*v for v in x), .01)
            estimate = [w + scale*v for w,v in zip(estimate,x)]
    gains = [(estimate[i] * (1 - 2*incumbent[i]), i) for i in range(n)]
    gains.sort(reverse=True)
    visited = {tuple(h['candidate']) for h in history}
    # Try up to three model-supported improvements, then explore one bit.
    positive = [i for gain,i in gains if gain > 0][:3]
    if positive:
        candidate = incumbent.copy()
        for i in positive:
            candidate[i] = 1 - candidate[i]
        if tuple(candidate) not in visited:
            return candidate
    for _,i in gains:
        candidate = incumbent.copy()
        candidate[i] = 1 - candidate[i]
        if tuple(candidate) not in visited:
            return candidate
    return incumbent


def main():
    method = sys.argv[1] if len(sys.argv) > 1 else 'coordinate'
    for line in sys.stdin:
        state = json.loads(line)
        kind = state['type']
        if kind == 'start':
            answer = {'ready': True}
        elif kind == 'preferences':
            answer = preferences(state['n'])
        elif kind == 'modify':
            answer = {}  # Static P is legal, including n < 40.
        elif kind == 'candidate':
            answer = {'candidate': propose(state, method)}
        else:
            raise ValueError('Unknown message')
        print(json.dumps(answer, allow_nan=False), flush=True)

if __name__ == '__main__':
    main()

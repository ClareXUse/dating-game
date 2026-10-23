"""Edit these three functions. Both roles are required."""
import random

def set_preferences(state):
    n = state['n']
    # Valid baseline: shuffled integer cents, +100 and -100 in total.
    w = [0] * n
    positions = list(range(n))
    random.shuffle(positions)
    k = min(n//2, 50)
    for side in range(2):
        for j in range(k):
            w[positions[side*k+j]] = (1 if side == 0 else -1) * (100//k + (j < 100 % k)) / 100
    return {'weights': w, 'ideal': [int(x > 0) for x in w],
            'anti_ideal': [int(x < 0) for x in w]}

def modify_preferences(state):
    # Fall 2026: state includes current candidate, previous proposals/scores,
    # and your original/current weights. Changes are relative to original weights.
    return {}  # keep current weights

def propose_candidate(state):
    # A deliberately simple example; replace with your inference strategy.
    history = state['history']
    n = state['n']
    estimates = [sum((float(h['score'])) * (h['candidate'][i]-.5)
                     for h in history) for i in range(n)]
    return [int(x >= 0) for x in estimates]

"""Protocol wrapper. Leave this file unchanged; edit strategy.py."""
import json
import sys
from strategy import set_preferences, modify_preferences, propose_candidate

for line in sys.stdin:
    s = json.loads(line)
    kind = s['type']
    if kind == 'start':
        answer = {'ready': True}
    elif kind == 'preferences':
        answer = set_preferences(s)
    elif kind == 'modify':
        answer = modify_preferences(s)
    elif kind == 'candidate':
        answer = {'candidate': propose_candidate(s)}
    else:
        raise ValueError('Unknown message: ' + kind)
    print(json.dumps(answer, allow_nan=False), flush=True)

"""Template source copied into C++ / Julia folders; JSON transport is owned here."""
import json
from pathlib import Path
import subprocess
import sys

here = Path(__file__).resolve().parent
if (here/'strategy.cpp').exists():
    command = [str(here/('strategy.exe' if sys.platform=='win32' else 'strategy'))]
else:
    command = ['julia','--startup-file=no',str(here/'strategy.jl')]

child = subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
try:
    for line in sys.stdin:
        s = json.loads(line)
        kind,n = s['type'],s['n']
        if kind == 'start':
            payload = 'START %s %d' % (s['role'],n)
        elif kind == 'preferences':
            payload = 'SET %d' % n
        elif kind == 'modify':
            tokens = ['MODIFY',str(n),str(s['round']),str(s['time_remaining'])]
            for key in ('original_weights','current_weights','candidate'):
                tokens.extend(map(str,s[key]))
            tokens.append(str(len(s['history'])))
            for h in s['history']:
                tokens.extend(map(str,h['candidate']))
                tokens.append(str(h['score']))
            payload = ' '.join(tokens)
        elif kind == 'candidate':
            tokens = ['CANDIDATE',str(n),str(s['round']),str(s['time_remaining']),str(len(s['history']))]
            for h in s['history']:
                tokens.extend(map(str,h['candidate']))
                tokens.append(str(h['score']))
            payload = ' '.join(tokens)
        else:
            raise ValueError('Unknown message')
        child.stdin.write(payload+'\n')
        child.stdin.flush()
        response = child.stdout.readline(65537)
        if not response or len(response)>65536:
            raise ValueError('Strategy exited or sent excessive output')
        parts = response.split()
        if kind == 'start' and parts == ['READY']:
            answer = {'ready':True}
        elif kind == 'preferences' and len(parts)==3*n:
            numbers = [float(x) for x in parts]
            answer = dict(weights=numbers[:n],ideal=numbers[n:2*n],anti_ideal=numbers[2*n:])
        elif kind == 'modify':
            answer = {} if parts == ['KEEP'] else {'weights':[float(x) for x in parts]}
        elif kind == 'candidate':
            answer = {'candidate':[float(x) for x in parts]}
        else:
            raise ValueError('Invalid strategy response')
        print(json.dumps(answer,allow_nan=False),flush=True)
finally:
    child.kill()
    child.wait()

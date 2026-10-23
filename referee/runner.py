"""Local trusted-bot runner. This is not a sandbox for untrusted programs."""
import itertools
import json
import os
from pathlib import Path
import queue
import random
import subprocess
import sys
import threading
import time
from decimal import Decimal
from .engine import candidate, setup, update, dot, display

ROOT = Path(__file__).resolve().parents[1]

class BotError(Exception):
    pass

def load_bots(path='bots.json'):
    source = ROOT / path
    bots = json.loads(source.read_text(encoding='utf-8'))
    if not isinstance(bots, list) or len(bots) < 2:
        raise ValueError('Roster must contain at least two bots')
    names = set()
    for b in bots:
        if not isinstance(b.get('name'), str) or not b['name'].strip() or b['name'] in names:
            raise ValueError('Bot names must be nonempty and unique')
        names.add(b['name'])
        b['cwd'] = str((source.parent / b['cwd']).resolve())
        if not Path(b['cwd']).is_dir():
            raise ValueError('Bot folder does not exist')
        for field in ('command', 'build'):
            if field not in b and field == 'build':
                continue
            if not isinstance(b.get(field), list) or not b[field] or not all(isinstance(a, str) for a in b[field]):
                raise ValueError('command/build must be arrays of arguments')
            b[field] = [sys.executable if a == '{python}' else a for a in b[field]]
    return bots

def build(bots):
    for b in bots:
        if b.get('build'):
            subprocess.run(b['build'], cwd=b['cwd'], check=True, timeout=120)

class Session:
    def __init__(self, bot):
        self.bot = bot
        self.lines = queue.Queue(maxsize=16)
        self.proc = None
        self.used = 0

    def start(self, role, n):
        try:
            self.proc = subprocess.Popen(self.bot['command'], cwd=self.bot['cwd'], stdin=subprocess.PIPE,
                                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                         start_new_session=(os.name != 'nt'))
        except OSError as exc:
            raise BotError('launch failed: ' + str(exc))
        def read():
            while True:
                line = self.proc.stdout.readline(65537)
                if not line:
                    self.lines.put(None)
                    break
                self.lines.put(line)
                if len(line) > 65536 or not line.endswith(b'\n'):
                    break
        threading.Thread(target=read, daemon=True).start()
        reply = self.ask({'type':'start','protocol_version':1,'role':role,'n':n}, 30, timed=False)
        if reply.get('ready') is not True:
            raise BotError('expected ready:true')

    def ask(self, message, budget, timed=True):
        begin = time.monotonic()
        # Writing can block if a bot does not read stdin; include it in the deadline.
        def send():
            try:
                self.proc.stdin.write((json.dumps(message)+'\n').encode())
                self.proc.stdin.flush()
            except (OSError, ValueError):
                try:
                    self.lines.put_nowait(None)
                except queue.Full:
                    pass
        threading.Thread(target=send, daemon=True).start()
        remaining = budget - self.used if timed else budget
        if remaining <= 0:
            raise BotError('thinking clock expired')
        try:
            line = self.lines.get(timeout=remaining)
        except queue.Empty:
            raise BotError('thinking clock expired')
        elapsed = time.monotonic() - begin
        if timed:
            self.used += elapsed
        if elapsed > remaining:
            raise BotError('thinking clock expired')
        if line is None:
            raise BotError('bot exited before replying')
        if len(line) > 65536 or not line.endswith(b'\n'):
            raise BotError('reply exceeds 64 KiB')
        try:
            result = json.loads(line, parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s)))
        except (ValueError, UnicodeError):
            raise BotError('invalid JSON')
        if not isinstance(result, dict):
            raise BotError('reply must be a JSON object')
        return result

    def close(self):
        if self.proc is None:
            return
        if os.name == 'nt':
            subprocess.run(['taskkill','/PID',str(self.proc.pid),'/T','/F'], capture_output=True)
        else:
            import signal
            try:
                os.killpg(self.proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        self.proc.wait()
        self.proc.stdin.close()
        self.proc.stdout.close()

def game(person, matchmaker, n=20, clock=120, seed=None):
    rng = random.Random(seed)
    p, m = Session(person), Session(matchmaker)
    result = {'person':person['name'],'matchmaker':matchmaker['name'],'n':n,
              'history':[], 'best_score':'-1.0000','candidates_used':0,'success':False,
              'failure':None,'rules_status':'Fall 2026 rules / v0.1 architect decisions'}
    active = 'P'
    try:
        p.start('P', n)
        original = setup(p.ask({'type':'preferences','n':n}, clock), n)
        current = original
        active = 'M'
        m.start('M', n)
        history = []
        for _ in range(20):
            c = [Decimal(rng.randrange(2)) for _ in range(n)]
            history.append({'candidate':[float(x) for x in c],'score':display(dot(original,c))})
        result['training'] = list(history)
        best = Decimal('-1')
        for turn in range(1,21):
            active = 'M'
            reply = m.ask({'type':'candidate','n':n,'round':turn,'history':history,
                           'time_remaining':max(0,clock-m.used)}, clock)
            c = candidate(reply.get('candidate'), n)
            active = 'P'
            # Fall 2026: P sees the current candidate and previous proposals before modifying.
            previous = [{'candidate':r['candidate'],'score':r['score']} for r in result['history']]
            current = update(p.ask({'type':'modify','n':n,'round':turn,
                                    'candidate':[float(x) for x in c], 'history':previous,
                                    'original_weights':[float(x) for x in original],
                                    'current_weights':[float(x) for x in current],
                                    'time_remaining':max(0,clock-p.used)}, clock), original, current)
            score = dot(current,c)
            best = max(best, Decimal(display(score)))
            success = dot(original,c) == 1
            row = {'round':turn,'candidate':[float(x) for x in c], 'score':display(score),
                   'original_score':display(dot(original,c)), 'success':success}
            result['history'].append(row)
            history.append({'candidate':row['candidate'],'score':row['score']})
            result.update(best_score='1.0000' if success else display(best), candidates_used=turn, success=success)
            if success:
                break
        result['original_weights'] = [float(x) for x in original]
        result['final_weights'] = [float(x) for x in current]
    except (ValueError, BotError) as exc:
        result['failure'] = {'role':active,'reason':str(exc)}
    finally:
        p.close()
        m.close()
    result['clocks_used'] = {'P':round(p.used,4),'M':round(m.used,4)}
    return result

def pairing(a, b, n=20, clock=120):
    games = [game(a,b,n,clock), game(b,a,n,clock)]
    # Each game contributes a matchmaker result; failures override numeric scores.
    def rank(g):
        fail = g['failure']
        if fail:
            return (2,Decimal(0),0) if fail['role']=='P' else (0,Decimal(0),0)
        return (1,Decimal(g['best_score']),-g['candidates_used'])
    r_b, r_a = map(rank,games)
    return {'bots':[a['name'],b['name']], 'games':games,
            'winner':a['name'] if r_a > r_b else b['name'] if r_b > r_a else 'Tie'}

def tournament(bots, n=20, clock=120):
    return [pairing(a,b,n,clock) for a,b in itertools.combinations(bots,2)]

"""Local tournament state, persistent results, live progress and run controls."""
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import secrets
import threading
import time
from urllib.parse import urlsplit
from .runner import ROOT, load_bots, build, pairing

class TournamentDesk:
    def __init__(self, roster='bots.json', n=20, clock=120, result_dir=None):
        self.roster = roster
        self.bots = load_bots(roster)
        self.folder = result_dir or ROOT/'results'
        self.lock = threading.RLock()
        self.cancel = threading.Event()
        self.status = {'running':False,'stopping':False,'results':[], 'live':None,'active_games':[],
                       'match_configuration':{'label':'','notes':''},'error':None,'pace':.3,'n':n,'clock':clock,'revision':0}
        for path in sorted(self.folder.glob('*.json')):
            try:
                r = json.loads(path.read_text(encoding='utf-8'))
                if isinstance(r,dict) and 'bots' in r and 'games' in r and 'winner' in r:
                    r['id'] = path.stem
                    self.status['results'].append(r)
            except (OSError,ValueError):
                pass

        settings = self.folder/'settings.json'
        if settings.exists():
            try:
                saved=json.loads(settings.read_text(encoding='utf-8'))
                for key in ('match_configuration','n','clock','pace'):
                    if key in saved: self.status[key]=saved[key]
            except (OSError,ValueError): pass

    def save_settings(self):
        self.folder.mkdir(exist_ok=True,parents=True)
        path=self.folder/'settings.json'
        temp=path.with_suffix('.tmp')
        temp.write_text(json.dumps({k:self.status[k] for k in ('match_configuration','n','clock','pace')},indent=2),encoding='utf-8')
        temp.replace(path)

    def exclude(self,data):
        with self.lock:
            result=next((r for r in self.status['results'] if r['id']==data.get('id')),None)
            if result is None: raise ValueError('Saved pairing not found.')
            reason=str(data.get('reason','')).strip()
            if not reason or len(reason)>500: raise ValueError('Enter an exclusion reason (1–500 characters).')
            result.update(excluded=True,exclusion_reason=reason)
            path=self.folder/(result['id']+'.json')
            temp=path.with_suffix('.tmp')
            temp.write_text(json.dumps(result,indent=2),encoding='utf-8')
            temp.replace(path)
            self.status['revision']+=1

    def snapshot(self):
        with self.lock:
            return json.loads(json.dumps(dict(self.status,bots=[b['name'] for b in self.bots])))

    def event(self,event):
        with self.lock:
            if event['game_number']==1 and event['phase']=='starting':
                self.status['active_games'] = [None,None]
            self.status['active_games'][event['game_number']-1] = event['game']
            self.status['live'] = dict(event,received_at=time.time())
            self.status['revision'] += 1

    def start(self,data):
        if isinstance(data['n'],bool) or not float(data['n']).is_integer(): raise ValueError('Attributes must be a whole number.')
        if isinstance(data.get('repetitions',1),bool) or not float(data.get('repetitions',1)).is_integer(): raise ValueError('Repetitions must be a whole number.')
        n,clock = int(data['n']),float(data['clock'])
        pace = float(data.get('pace',.3))
        if not 2 <= n <= 200 or not 0 < clock <= 3600 or not 0 <= pace <= 3:
            raise ValueError('Use 2–200 attributes, a positive clock, and pace between 0 and 3 seconds.')
        configuration = {'label':str(data.get('run_label','')).strip(), 'notes':str(data.get('run_notes','')).strip()}
        if len(configuration['label'])>100 or len(configuration['notes'])>1500:
            raise ValueError('Run label is limited to 100 characters and notes to 1500.')
        configuration.update(mode=data.get('mode','practice'), event=str(data.get('event','Practice')).strip(),
            repetitions=int(data.get('repetitions',1)), seed=data.get('seed'),
            win_points=float(data.get('win_points',3)), tie_points=float(data.get('tie_points',1)), loss_points=float(data.get('loss_points',0)),
            ranking=data.get('ranking','points'), failure_policy=data.get('failure_policy','forfeit'))
        if configuration['mode'] not in ('practice','official') or not configuration['event'] or len(configuration['event'])>100:
            raise ValueError('Choose a mode and enter an event ID (1–100 characters).')
        if not 1 <= configuration['repetitions'] <= 100: raise ValueError('Repetitions must be 1–100.')
        if configuration['seed'] is not None and (type(configuration['seed']) is not int or not 0<=configuration['seed']<=2147483647):
            raise ValueError('Seed must be an integer from 0 to 2147483647 or blank.')
        if any(not math.isfinite(configuration[k]) or not -1000<=configuration[k]<=1000 for k in ('win_points','tie_points','loss_points')):
            raise ValueError('Points must be finite numbers between -1000 and 1000.')
        if configuration['ranking'] not in ('points','wins','score') or configuration['failure_policy'] not in ('forfeit','exclude'):
            raise ValueError('Unsupported ranking or failure policy.')
        with self.lock:
            if self.status['running']:
                raise ValueError('A tournament is already running.')
            if data.get('all'):
                selected = self.bots
            else:
                names = data.get('bots')
                if not isinstance(names,list) or len(names)!=2 or any(not isinstance(name,str) for name in names) or names[0]==names[1]:
                    raise ValueError('Choose different strategies for Person (P) and Matchmaker (M).')
                roster = {b['name']: b for b in self.bots}
                if any(name not in roster for name in names):
                    raise ValueError('A selected strategy is not in the roster. Rescan and select again.')
                # pairing uses its first argument as P in game 1; preserve UI order.
                selected = [roster[name] for name in names]
            if len(selected)<2:
                raise ValueError('Select two different bots.')
            policy_keys=('win_points','tie_points','loss_points','ranking','failure_policy')
            for old in self.status['results']:
                config=old.get('match_configuration',{})
                if config.get('event')==configuration['event'] and config.get('mode')==configuration['mode']:
                    if any(config.get(k)!=configuration[k] for k in policy_keys):
                        raise ValueError('This event already has a different ranking policy. Use a new event ID.')
            self.cancel.clear()
            self.status.update(running=not data.get('save_only',False),stopping=False,error=None,live=None,pace=pace,n=n,clock=clock,match_configuration=configuration)
            self.status['revision'] += 1
            self.save_settings()
        if data.get('save_only'): return
        threading.Thread(target=self.run,args=(selected,n,clock,configuration),daemon=True).start()

    def run(self,selected,n,clock,configuration=None):
        try:
            build(selected)
            configuration = configuration or {}
            jobs=[(a,b,repeat) for repeat in range(configuration.get('repetitions',1)) for i,a in enumerate(selected) for b in selected[i+1:]]
            for a,b,repeat in jobs:
                if self.cancel.is_set():
                    return
                seed = configuration.get('seed')
                seed = secrets.randbelow(2147483648) if seed is None else (seed+repeat)%2147483648
                result = pairing(a,b,n,clock,on_event=self.event,cancel=self.cancel,
                                 pace=lambda:self.status['pace'],seed=seed)
                result['seed'] = seed
                result['repetition'] = repeat+1
                if configuration.get('failure_policy')=='exclude' and any(g.get('failure') for g in result['games']):
                    result['excluded']=True
                    result['exclusion_reason']='Failure policy: exclude failed pairing'
                stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                result['match_configuration'] = dict(configuration or {}, n=n,clock=clock,
                    rule_profile='architecture-preview-v0.3', ranking_profile=configuration.get('ranking','points'))
                result['id'] = stamp
                result['saved_at'] = datetime.now().astimezone().isoformat()
                with self.lock:
                    self.folder.mkdir(exist_ok=True,parents=True)
                    path = self.folder/(stamp+'.json')
                    temporary = path.with_suffix('.tmp')
                    temporary.write_text(json.dumps(result,indent=2),encoding='utf-8')
                    temporary.replace(path)
                    self.status['results'].append(result)
                    self.status['revision'] += 1
        except Exception as exc:
            with self.lock:
                self.status['error'] = str(exc)
        finally:
            with self.lock:
                self.status.update(running=False,stopping=False)
                self.status['revision'] += 1

    def stop(self):
        with self.lock:
            if self.status['running']:
                self.status['stopping'] = True
                self.cancel.set()

    def rescan(self):
        with self.lock:
            if self.status['running']:
                raise ValueError('Wait for the current run to finish before rescanning.')
            self.bots = load_bots(self.roster)
            self.status['revision'] += 1

def serve(roster='bots.json',n=20,clock=120,port=8092):
    desk = TournamentDesk(roster,n,clock)
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):
            super().__init__(*a,directory=str(ROOT/'dashboard'),**kw)

        def log_message(self,*a):
            pass

        def send_json(self,value,code=200):
            data = json.dumps(value).encode()
            self.send_response(code)
            self.send_header('Content-Type','application/json')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if urlsplit(self.path).path == '/api/state':
                return self.send_json(desk.snapshot())
            super().do_GET()

        def do_POST(self):
            if self.headers.get('Origin') not in (None,'http://127.0.0.1:%d'%port,'http://localhost:%d'%port):
                return self.send_json({'error':'Origin refused'},403)
            try:
                length = int(self.headers.get('Content-Length','0'))
                if not 0 < length <= 16384:
                    raise ValueError('Invalid request size')
                data = json.loads(self.rfile.read(length))
                if self.path == '/api/run':
                    desk.start(data)
                elif self.path == '/api/settings':
                    desk.start(dict(data,save_only=True))
                elif self.path == '/api/exclude':
                    desk.exclude(data)
                elif self.path == '/api/stop':
                    desk.stop()
                elif self.path == '/api/pace':
                    pace = float(data['pace'])
                    if not 0 <= pace <= 3:
                        raise ValueError('Invalid watch pace')
                    with desk.lock:
                        desk.status['pace'] = pace
                elif self.path == '/api/rescan':
                    desk.rescan()
                else:
                    return self.send_json({'error':'Not found'},404)
                self.send_json({'ok':True})
            except (ValueError,KeyError,TypeError,OSError) as exc:
                self.send_json({'error':str(exc)},400)
    server = ThreadingHTTPServer(('127.0.0.1',port),Handler)
    print('Dating Game tournament desk: http://127.0.0.1:%d'%port,flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        desk.stop()
    finally:
        server.server_close()

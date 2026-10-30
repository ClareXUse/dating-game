"""Local tournament state, persistent results, live progress and run controls."""
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
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
        n,clock = int(data['n']),float(data['clock'])
        pace = float(data.get('pace',.3))
        if not 2 <= n <= 200 or not 0 < clock <= 3600 or not 0 <= pace <= 3:
            raise ValueError('Use 2–200 attributes, a positive clock, and pace between 0 and 3 seconds.')
        configuration = {'label':str(data.get('run_label','')).strip(), 'notes':str(data.get('run_notes','')).strip()}
        if len(configuration['label'])>100 or len(configuration['notes'])>1500:
            raise ValueError('Run label is limited to 100 characters and notes to 1500.')
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
            self.cancel.clear()
            self.status.update(running=True,stopping=False,error=None,live=None,pace=pace,n=n,clock=clock,match_configuration=configuration)
            self.status['revision'] += 1
        threading.Thread(target=self.run,args=(selected,n,clock,configuration),daemon=True).start()

    def run(self,selected,n,clock,configuration=None):
        try:
            build(selected)
            for i,a in enumerate(selected):
                for b in selected[i+1:]:
                    if self.cancel.is_set():
                        return
                    result = pairing(a,b,n,clock,on_event=self.event,cancel=self.cancel,
                                     pace=lambda:self.status['pace'])
                    stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                    result['match_configuration'] = dict(configuration or {}, n=n,clock=clock,
                        rule_profile='architecture-preview-v0.3', ranking_profile='preview-wins-ties-best')
                    result['id'] = stamp
                    result['saved_at'] = datetime.now().astimezone().isoformat()
                    with self.lock:
                        self.status['results'].append(result)
                        self.status['revision'] += 1
                    self.folder.mkdir(exist_ok=True,parents=True)
                    path = self.folder/(stamp+'.json')
                    temporary = path.with_suffix('.tmp')
                    temporary.write_text(json.dumps(result,indent=2),encoding='utf-8')
                    temporary.replace(path)
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

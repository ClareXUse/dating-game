"""Run the local dashboard or practice tournament with Python 3.8+."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from datetime import datetime
from referee.runner import ROOT, load_bots, build, tournament, pairing

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', nargs='?', choices=['serve','match','tournament'], default='serve')
    parser.add_argument('players', nargs='*')
    parser.add_argument('--bots', default='bots.json')
    parser.add_argument('--n', type=int, default=20)
    parser.add_argument('--clock', type=float, default=120)
    parser.add_argument('--port', type=int, default=8092)
    args = parser.parse_args()
    if not 2 <= args.n <= 200 or not 0 < args.clock <= 3600:
        parser.error('Use 2 <= n <= 200 and 0 < clock <= 3600')
    bots = load_bots(args.bots)
    status = {'running':False,'results':[], 'error':None}
    guard = threading.Lock()
    def run(selected, n, clock):
        try:
            build(selected)
            for i,a in enumerate(selected):
                for b in selected[i+1:]:
                    result = pairing(a,b,n,clock)
                    with guard:
                        status['results'].append(result)
                    folder = ROOT/'results'
                    folder.mkdir(exist_ok=True)
                    stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                    (folder/(stamp+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
        except Exception as exc:
            with guard:
                status['error'] = str(exc)
        finally:
            with guard:
                status['running'] = False
    if args.mode != 'serve':
        selected = bots
        if args.mode == 'match':
            if len(args.players) != 2 or args.players[0] == args.players[1]:
                parser.error('match requires two distinct bot names')
            try:
                selected = [next(b for b in bots if b['name']==name) for name in args.players]
            except StopIteration:
                parser.error('Unknown bot name')
        run(selected,args.n,args.clock)
        print(json.dumps(status,indent=2))
        if status['error']:
            raise SystemExit(1)
        return
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):
            super().__init__(*a,directory=str(ROOT/'dashboard'),**kw)
        def send_json(self,value,code=200):
            data = json.dumps(value).encode()
            self.send_response(code)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        def do_GET(self):
            if self.path == '/api/state':
                with guard:
                    snapshot = dict(status, bots=[b['name'] for b in bots])
                    self.send_json(snapshot)
            else:
                super().do_GET()
        def do_POST(self):
            if self.path != '/api/run':
                return self.send_json({'error':'Not found'},404)
            # Refuse cross-origin browser requests to the local execution endpoint.
            if self.headers.get('Origin') not in (None,'http://127.0.0.1:%d'%args.port,'http://localhost:%d'%args.port):
                return self.send_json({'error':'Origin refused'},403)
            try:
                length = int(self.headers.get('Content-Length','0'))
                if not 0 < length <= 4096:
                    raise ValueError('Invalid request size')
                data = json.loads(self.rfile.read(length))
                n,clock = int(data['n']),float(data['clock'])
                if not 2 <= n <= 200 or not 0 < clock <= 3600:
                    raise ValueError('Invalid n or clock')
                selected = bots if data.get('all') else [b for b in bots if b['name'] in data['bots']]
                if len(selected)<2:
                    raise ValueError('Select two different bots')
                with guard:
                    if status['running']:
                        return self.send_json({'error':'A tournament is already running'},409)
                    status.update(running=True,error=None,results=[])
                threading.Thread(target=run,args=(selected,n,clock),daemon=True).start()
                self.send_json({'started':True})
            except (ValueError,KeyError,TypeError) as exc:
                self.send_json({'error':str(exc)},400)
    server = ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print('Dating Game practice dashboard: http://127.0.0.1:%d'%args.port,flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()

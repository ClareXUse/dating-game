"""Run the Dating Game tournament desk or command-line matches."""
import argparse
from datetime import datetime
import json
from referee.runner import ROOT, load_bots, build, pairing
from referee.server import serve

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
    if args.mode == 'serve':
        return serve(args.bots,args.n,args.clock,args.port)
    bots = load_bots(args.bots)
    if args.mode == 'match':
        if len(args.players) != 2 or args.players[0] == args.players[1]:
            parser.error('match requires two distinct bot names')
        try:
            bots = [next(b for b in bots if b['name']==name) for name in args.players]
        except StopIteration:
            parser.error('Unknown bot name')
    build(bots)
    results = []
    for i,a in enumerate(bots):
        for b in bots[i+1:]:
            result = pairing(a,b,args.n,args.clock)
            folder = ROOT/'results'
            folder.mkdir(exist_ok=True)
            stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            (folder/(stamp+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
            results.append(result)
    print(json.dumps({'results':results},indent=2))

if __name__ == '__main__':
    main()

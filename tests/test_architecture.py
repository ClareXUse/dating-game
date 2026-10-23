import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import time
import unittest
from decimal import Decimal as D

from referee.engine import candidate, weights, setup, update, dot, display
from referee.runner import ROOT, Session, BotError, load_bots, build, game, pairing

class Rules(unittest.TestCase):
    def test_normalization_and_precision(self):
        self.assertEqual(weights([.5,.5,-1],3),[D('.5'),D('.5'),D('-1')])
        for w in ([.5,.4,-1],[1,-.99],[1.001,-1.001],[True,-1]):
            with self.assertRaises(ValueError): weights(w,len(w))

    def test_candidate_limits_and_rounding(self):
        self.assertEqual(candidate([0,.1234,1],3),[D(0),D('.1234'),D(1)])
        for c in ([1.00001,0],[-.0001,1],[float('nan'),0],[float('inf'),0]):
            with self.assertRaises(ValueError): candidate(c,2)
        self.assertEqual(display(D('.12345')),'0.1235')
        self.assertEqual(display(D('-.12345')),'-0.1235')

    def test_ideal_validation(self):
        self.assertEqual(setup({'weights':[1,-1],'ideal':[1,0],'anti_ideal':[0,1]},2),[D(1),D(-1)])
        with self.assertRaises(ValueError):
            setup({'weights':[1,-1],'ideal':[.9,0],'anti_ideal':[0,1]},2)

    def test_modifications_relative_to_original(self):
        original = weights([.5,.5,-.5,-.5]+[0]*36,40)
        valid = [.6,.4,-.5,-.5]+[0]*36
        changed = update({'weights':valid},original,original)
        self.assertEqual(changed[:2],[D('.6'),D('.4')])
        with self.assertRaises(ValueError):
            update({'weights':[.7,.3,-.5,-.5]+[0]*36},original,changed)
        with self.assertRaises(ValueError):
            update({'weights':[.6,.4,-.6,-.4]+[0]*36},original,original)
        with self.assertRaises(ValueError):
            update({'weights':[.99,-.99]},weights([1,-1],2),weights([1,-1],2))

class Integration(unittest.TestCase):
    def test_live_redaction_and_replay_contributions(self):
        events=[]
        a,b=load_bots()
        result=game(a,b,20,5,seed=12,on_event=events.append)
        self.assertIsNone(result['failure'])
        active=[e['game'] for e in events if e['phase']!='finished']
        self.assertTrue(any(g['history'] for g in active))
        for g in active:
            self.assertNotIn('original_weights',g)
            self.assertNotIn('final_weights',g)
            for row in g['history']:
                self.assertNotIn('weights',row)
                self.assertNotIn('original_score',row)
        final=events[-1]['game']
        self.assertEqual(events[-1]['phase'],'finished')
        self.assertEqual(final['original_weights'],result['original_weights'])
        for row in final['history']:
            actual=dot([D(str(w)) for w in row['weights']],[D(str(v)) for v in row['candidate']])
            self.assertEqual(display(actual),row['score'])

    def test_stop_preserves_partial_replay_and_excludes_second_game(self):
        cancel=threading.Event()
        def stop_after_proposal(event):
            if event['phase']=='proposal': cancel.set()
        a,b=load_bots()
        result=pairing(a,b,20,5,on_event=stop_after_proposal,cancel=cancel)
        self.assertTrue(result['cancelled'])
        self.assertEqual(result['winner'],'Stopped')
        self.assertEqual(len(result['games']),1)
        self.assertEqual(len(result['games'][0]['history']),1)

    def test_saved_results_restore_after_restart(self):
        from referee.server import TournamentDesk
        with tempfile.TemporaryDirectory() as tmp:
            desk=TournamentDesk(result_dir=Path(tmp))
            desk.start({'n':20,'clock':5,'pace':0,'bots':['Sample A','Sample B']})
            deadline=time.monotonic()+15
            while desk.snapshot()['running'] and time.monotonic()<deadline: time.sleep(.02)
            self.assertFalse(desk.snapshot()['running'])
            self.assertIsNone(desk.snapshot()['error'])
            restored=TournamentDesk(result_dir=Path(tmp)).snapshot()['results']
            self.assertEqual(len(restored),1)
            self.assertEqual(len(restored[0]['games']),2)
            self.assertEqual(restored[0]['id'],desk.snapshot()['results'][0]['id'])

    def test_samples_both_roles_full_range(self):
        a,b = load_bots()
        for n in (2,20,100,200):
            result = pairing(a,b,n,5)
            self.assertEqual(len(result['games']),2)
            for g in result['games']:
                self.assertIsNone(g['failure'],g['failure'])
                self.assertEqual(len(g['training']),20)
                self.assertTrue(all(set(h['candidate']) <= {0,1} for h in g['training']))
                self.assertTrue(1<=g['candidates_used']<=20)

    def test_p_receives_current_candidate_and_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp,'bot.py').write_text('''import json,sys
for line in sys.stdin:
 s=json.loads(line); t=s['type']; n=s['n']
 if t=='start': a={'ready':True}
 elif t=='preferences': a={'weights':[1,-1]+[0]*(n-2),'ideal':[1,0]+[0]*(n-2),'anti_ideal':[0,1]+[0]*(n-2)}
 elif t=='modify':
  assert len(s['candidate'])==n
  assert len(s['history'])==s['round']-1
  assert len(s['original_weights'])==len(s['current_weights'])==n
  a={}
 else: raise RuntimeError('unexpected')
 print(json.dumps(a),flush=True)
''')
            p={'name':'Inspector','cwd':tmp,'command':[sys.executable,'bot.py']}
            r=game(p,load_bots()[0],200,5,seed=7)
            self.assertIsNone(r['failure'],r['failure'])

    def test_timeout_and_malformed_reply(self):
        for code in ('import time; time.sleep(1)', 'print("not json",flush=True)'):
            with tempfile.TemporaryDirectory() as tmp:
                Path(tmp,'bad.py').write_text(code)
                s=Session({'name':'Bad','cwd':tmp,'command':[sys.executable,'bad.py']})
                # Start the process without the normal 30-second startup allowance.
                import subprocess, threading
                s.proc=subprocess.Popen(s.bot['command'],cwd=tmp,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
                def read(): s.lines.put(s.proc.stdout.readline())
                thread=threading.Thread(target=read,daemon=True);thread.start()
                try:
                    with self.assertRaises(BotError): s.ask({'type':'start','n':2},.1)
                finally: s.close();thread.join(1)

    def optional_language(self,lang):
        required='g++' if lang=='cpp' else 'julia'
        if not shutil.which(required): self.skipTest(required+' not installed')
        b={'name':lang,'cwd':str(ROOT/'bots/templates'/lang),'command':[sys.executable,'bot.py']}
        if lang=='cpp': b['build']=[sys.executable,'build.py']
        build([b])
        r=pairing(b,load_bots()[0],200,15)
        for g in r['games']: self.assertIsNone(g['failure'],g['failure'])

    def test_cpp(self): self.optional_language('cpp')
    def test_julia(self): self.optional_language('julia')

if __name__=='__main__': unittest.main()

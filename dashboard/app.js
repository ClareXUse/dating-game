import {$,element,fmt,initial,copy,download,post,error,toast} from './helpers.js';
import {renderCurve,renderAttributes} from './charts.js';
import {renderComparison,setupHelp} from './match-view.js?v=english-1';
setupHelp();

let state={bots:[],results:[],running:false,live:null,active_games:[]};
let frozen=null,selection=null,step=0,attribute=0,mode='candidate',initialized=false,playing=null,imports=[];
let lastSignature='',lastResults='',lastGameKey='';

function setTab(tab){
  if(!['arena','leaderboard'].includes(tab))tab='arena';
  for(const name of ['arena','leaderboard'])$(name+'-view').hidden=name!==tab;
  for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');}
  if(location.hash!=='#'+tab)history.replaceState(null,'','#'+tab);
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
document.querySelectorAll('[data-link-tab]').forEach(b=>b.onclick=e=>{e.preventDefault();setTab(b.dataset.linkTab);});
window.addEventListener('hashchange',()=>setTab(location.hash.slice(1)));
setTab(location.hash.slice(1)||'arena');

function allResults(){return [...state.results,...imports];}
function current(){
  if($('follow').checked&&state.live&&state.running){
    return {game:state.live.game,pair:{bots:state.live.pairing,games:state.active_games},index:state.live.game_number-1,live:true};
  }
  if(frozen)return frozen;
  if(selection){const pair=allResults().find(r=>r.id===selection.id);if(pair)return {game:pair.games[selection.index],pair,index:selection.index,live:false};}
  const pair=allResults().at(-1);
  if(pair)return {game:pair.games[0],pair,index:0,live:false};
  return {game:null,pair:{bots:[$('bot-a').value||'Sample A',$('bot-b').value||'Sample B'],games:[]},index:0,live:false};
}
function stopPlayback(){if(playing){clearInterval(playing);playing=null;}$('play').textContent='▶ Play';}
function freezeLive(){if(state.running&&state.live)frozen={game:state.live.game,pair:{id:'live',bots:state.live.pairing,games:state.active_games},index:state.live.game_number-1,live:false};}
function selectStep(index){if($('follow').checked)freezeLive();$('follow').checked=false;step=Math.max(0,Math.min(index,(current().game?.history.length||1)-1));renderArena();}
function openGame(pair,index){frozen=null;selection={id:pair.id,index};step=0;attribute=0;$('follow').checked=false;stopPlayback();setTab('arena');renderArena();}

function renderArena(){
  const {game:g,pair,index,live}=current(),h=g?.history||[];
  const key=(g?.person||'')+'|'+(g?.matchmaker||'')+'|'+(g?.n||20)+'|'+(live?'live':pair.id||'');
  if(key!==lastGameKey){step=0;attribute=0;lastGameKey=key;}
  if($('follow').checked&&g)step=Math.max(0,h.length-1);
  step=Math.max(0,Math.min(step,h.length-1));
  const row=h[step],count=row?.round||0;
  const p=g?.person||pair.bots[0],m=g?.matchmaker||pair.bots[1];
  $('p-name').textContent=p;$('m-name').textContent=m;$('p-avatar').textContent=initial(p);$('m-avatar').textContent=initial(m);
  $('game-label').textContent=`GAME ${index+1} OF 2`;
  $('turn-label').textContent=live?state.live.phase==='thinking'?`${state.live.thinking==='P'?'P is considering the proposal':'M is proposing a candidate'}…`:state.live.phase==='starting'?'Starting the bots…':'M is learning from the feedback.':g?.cancelled?'Run stopped.':g?.failure?`${g.failure.role} failed: ${g.failure.reason}`:g?'Replay · preference weights revealed.':'Ready for the first proposal.';
  $('proposal-label').textContent=`Proposal ${String(count).padStart(2,'0')} of 20`;
  $('proposal-counter').textContent=`${count} / 20`;$('progress-fill').style.width=count/20*100+'%';
  $('current-score').textContent=fmt(row?.score);$('current-score').classList.toggle('negative',Number(row?.score)<0);
  $('best-score').textContent=h.length?fmt(Math.max(...h.slice(0,step+1).map(r=>Number(r.score)))):'—';
  const changed=row?.changed||[];$('change-count').textContent=changed.length;
  $('change-text').textContent=changed.length?`P updated ${changed.length} ${changed.length===1?'preference':'preferences'} on this proposal.`:`P kept the current preferences.${g?' Limit: '+Math.floor(g.n/20)+' changes per turn.':''}`;
  $('seek').max=Math.max(1,h.length);$('seek').value=step+1;$('seek').disabled=!h.length;
  $('replay-counter').textContent=h.length?`${step+1} / ${h.length}`:'0 / 0';
  $('previous').disabled=!h.length||step===0;$('next').disabled=!h.length||step===h.length-1;
  $('play').disabled=!h.length;$('download').disabled=!g;
  renderAttributes(g,row,mode,attribute,i=>{attribute=i;renderArena();});
  renderCurve(h,step,i=>{stopPlayback();selectStep(i);});
  renderGameStrip(pair,index,live);
  renderComparison(pair,live);
  $('profile-caption').textContent=`${g?.n||Number($('n').value)||20} attributes · proposal ${count}`;
  $('curve-title').textContent=g?`${m} · score by attempt`:'Score by attempt';
  renderClocks();
}

function renderClocks(){
 const {game:g,live}=current();
 for(const role of ['P','M']){
   const budget=g?.clock||state.clock||120;
   const used=(live?g?.clocks_used||{}:g?.history?.[step]?.clocks_used||g?.clocks_used||{})[role]||0;
   let extra=0;
   if(live&&state.live.thinking===role&&state.live.phase==='thinking')extra=Math.max(0,Date.now()/1000-state.live.received_at);
   const left=Math.max(0,budget-used-extra),id=role.toLowerCase();
   $(id+'-clock').textContent=`${left.toFixed(3)} s left${extra?' · thinking':''}`;
   $(id+'-clock-fill').style.width=Math.max(0,left/budget*100)+'%';
 }
}

function renderGameStrip(pair,index,live){
 const root=$('game-strip');root.replaceChildren();
 for(let i=0;i<2;i++){
   const g=pair.games[i],b=element('button','game-card'+(i===index?' active':''));
   const head=element('div','game-card-head');head.append(element('strong','',`Game ${i+1} · ${g?.matchmaker||pair.bots[i===0?1:0]}`),element('small','',g?g.cancelled?'STOPPED':g.failure?'ROLE FAILURE':live&&i===index&&state.live.phase!=='finished'?'IN PROGRESS':'RECORDED':'WAITING'));
   const metrics=element('div','game-metrics');
   for(const [label,value] of [['Matchmaker',g?.matchmaker||pair.bots[i===0?1:0]],['Best score',g?fmt(g.best_score):'—'],['Proposals',g?.candidates_used??'—']]){
     const item=element('div');item.append(element('small','',label),document.createTextNode(String(value)));metrics.append(item);
   }
   b.append(head,metrics);b.disabled=!g;
   b.onclick=()=>{
     if(live){
       $('follow').checked=false;stopPlayback();frozen={game:g,pair,index:i,live:false};step=0;attribute=0;renderArena();
     }else openGame(pair,i);
   };root.append(b);
 }
}

function renderResults(){
 const results=allResults(),rows=new Map();
 for(const r of results){
  if(r.cancelled||r.winner==='Stopped'||r.games.length!==2)continue;
  for(const name of r.bots){if(!rows.has(name))rows.set(name,{name,played:0,wins:0,ties:0,losses:0,best:-1});const row=rows.get(name);row.played++;if(r.winner===name)row.wins++;else if(r.winner==='Tie')row.ties++;else row.losses++;for(const g of r.games)if(g.matchmaker===name&&!g.failure)row.best=Math.max(row.best,Number(g.best_score));}
 }
 $('standings').replaceChildren();$('standings-empty').hidden=!!rows.size;
 [...rows.values()].sort((a,b)=>b.wins-a.wins||b.ties-a.ties||b.best-a.best||a.name.localeCompare(b.name)).forEach((r,i)=>{
   const tr=element('tr'),rank=element('td','muted',i+1),name=element('td'),nameWrap=element('div','table-name');nameWrap.append(element('span','mini-avatar',initial(r.name)),document.createTextNode(r.name));name.append(nameWrap);tr.append(rank,name);
   for(const v of [r.played,r.wins,r.ties,r.losses,fmt(r.best)])tr.append(element('td','mono',v));$('standings').append(tr);
 });
 $('history').replaceChildren();
 for(const r of [...results].reverse()){
   const tr=element('tr');for(const v of [r.bots.join(' vs '),r.games[0]?.n||'—',r.winner,r.games.map(g=>fmt(g.best_score)).join(' / ')])tr.append(element('td','',v));
   const td=element('td');r.games.forEach((_,i)=>{const b=element('button','',`Game ${i+1}`);b.onclick=()=>openGame(r,i);td.append(b,document.createTextNode(' '));});tr.append(td);$('history').append(tr);
 }
}

async function refresh(){
 try{
   const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw Error('Referee unavailable');const next=await r.json();const wasRunning=state.running;state=next;
   const rosterKey=next.bots.join('|');
   if($('bot-a').dataset.roster!==rosterKey){for(const id of ['bot-a','bot-b']){const old=$(id).value;$(id).replaceChildren();for(const name of next.bots){const o=element('option','',name);o.value=name;$(id).append(o);}if(next.bots.includes(old))$(id).value=old;}if($('bot-b').value===$('bot-a').value)$('bot-b').selectedIndex=1;$('bot-a').dataset.roster=rosterKey;}
   if(!initialized){$('n').value=next.n;$('clock').value=next.clock;$('pace').value=Math.round(next.pace*1000);initialized=true;}
   for(const id of ['start','round-robin','rescan','bot-a','bot-b','n','clock'])$(id).disabled=next.running;
   $('stop').disabled=!next.running||next.stopping;
   $('run-status').classList.toggle('running',next.running);
   $('status-text').textContent=next.stopping?'Stopping…':next.running?'Game in progress':next.results.length?'Ready · replay available':'Ready to play';
   error(next.error);
   const signature=String(next.revision)+'|'+String(selection?.id||'')+'|'+$('follow').checked;
   if(signature!==lastSignature){lastSignature=signature;
     if(wasRunning&&!next.running&&$('follow').checked&&next.results.length&&next.live){const latest=next.results.at(-1);selection={id:latest.id,index:Math.max(0,latest.games.length-1)};}
     renderArena();
   }
   const resultSignature=next.results.map(r=>r.id).join('|')+'|'+imports.length;
   if(resultSignature!==lastResults){lastResults=resultSignature;renderResults();}
 }catch(e){error('Cannot reach the local referee. Start python3 start.py, then reload.');$('status-text').textContent='Disconnected';}
}

async function start(all=false){
 try{error(null);stopPlayback();frozen=null;selection=null;step=0;mode='candidate';for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode===mode);$('follow').checked=true;setTab('arena');await post('run',{all,bots:[$('bot-a').value,$('bot-b').value],n:Number($('n').value),clock:Number($('clock').value),pace:Number($('pace').value)/1000});await refresh();}catch(e){error(e.message);}
}
$('start').onclick=()=>start();$('round-robin').onclick=()=>start(true);
$('stop').onclick=async()=>{try{await post('stop');await refresh();}catch(e){error(e.message);}};
$('rescan').onclick=async()=>{try{await post('rescan');await refresh();toast('Bot roster refreshed');}catch(e){error(e.message);}};
$('pace').onchange=async()=>{try{await post('pace',{pace:Number($('pace').value)/1000});}catch(e){error(e.message);}};
for(const id of ['bot-a','bot-b'])$(id).onchange=()=>{if(!current().game)renderArena();};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;for(const x of document.querySelectorAll('[data-mode]')){x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));}renderArena();});
$('previous').onclick=()=>{stopPlayback();selectStep(step-1);};$('next').onclick=()=>{stopPlayback();selectStep(step+1);};
$('seek').oninput=()=>{stopPlayback();selectStep(Number($('seek').value)-1);};
$('follow').onchange=()=>{stopPlayback();if($('follow').checked)frozen=null;else freezeLive();renderArena();};
$('play').onclick=()=>{if(playing){stopPlayback();return;}if($('follow').checked)freezeLive();$('follow').checked=false;const h=current().game?.history||[];if(step>=h.length-1)step=0;renderArena();$('play').textContent='Ⅱ Pause';playing=setInterval(()=>{const history=current().game?.history||[];if(step>=history.length-1){stopPlayback();return;}step++;renderArena();},500);};
$('download').onclick=()=>{const c=current();if(c.game)download(c.game,'dating-game-replay.json');};
$('export-results').onclick=()=>download({results:allResults()},'dating-game-results.json');
$('import').onclick=()=>$('import-file').click();
function validateGame(g){if(!g||!Number.isInteger(g.n)||g.n<2||g.n>200||typeof g.person!=='string'||typeof g.matchmaker!=='string'||!Array.isArray(g.history)||g.history.length>20)throw Error('Unsupported replay format.');for(const weights of [g.original_weights,g.final_weights])if(weights&&(!Array.isArray(weights)||weights.length!==g.n||weights.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<-1||v>1)))throw Error('Invalid weights in replay.');for(const row of g.history){if(!Array.isArray(row.candidate)||row.candidate.length!==g.n||row.candidate.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||!Number.isFinite(Number(row.score))||Number(row.score)<-1||Number(row.score)>1)throw Error('Invalid candidate or score in replay.');if(row.weights&&(!Array.isArray(row.weights)||row.weights.length!==g.n||row.weights.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<-1||v>1)))throw Error('Invalid weights in replay.');}return g;}
$('import-file').onchange=async()=>{try{const file=$('import-file').files[0];if(!file)return;if(file.size>10000000)throw Error('Replay exceeds 10 MB.');const data=JSON.parse(await file.text());let pairs=data.results||[data];if(!Array.isArray(pairs)||pairs.length>100)throw Error('Unsupported replay format.');pairs=pairs.map((r,i)=>{if(r.games){r.games.forEach(validateGame);if(!Array.isArray(r.bots)||r.bots.length!==2||r.bots.some(x=>typeof x!=='string'))throw Error('Invalid pairing.');return {...r,id:'import-'+Date.now()+'-'+i};}const g=validateGame(r);return {id:'import-'+Date.now()+'-'+i,bots:[g.person,g.matchmaker],games:[g],winner:'Imported replay',cancelled:true};});imports.push(...pairs);renderResults();openGame(pairs[0],0);toast('Replay imported locally');}catch(e){error(e.message);}finally{$('import-file').value='';}};
window.addEventListener('keydown',e=>{if($('play-guide').open||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();selectStep(step-1);}if(e.key==='ArrowRight'){e.preventDefault();selectStep(step+1);}});
refresh();setInterval(refresh,250);setInterval(renderClocks,100);

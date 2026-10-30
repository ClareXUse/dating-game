import {$,element,fmt} from './helpers.js';

const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let signature='';
export function emphasize(node,delay=0){
  if(!node||reduced())return;
  node.animate([{transform:'translateY(5px)',opacity:.45},{transform:'translateY(0)',opacity:1}],
    {duration:360,delay,easing:'cubic-bezier(.2,0,0,1)',fill:'backwards'});
}
const delta=v=>(v>0?'+':'')+fmt(v);
export function renderDecision(game,row,previous,live,event,key){
  const pending=live&&event?.phase==='thinking';
  const nextKey=[key,row?.round,event?.phase,event?.thinking,live,game?.failure?.reason,game?.cancelled].join('|');
  if(nextKey===signature)return;
  signature=nextKey;
  const root=$('decision-flow');root.replaceChildren();
  const label=element('div','decision-caption');
  label.textContent=game?.failure?`Stopped: ${game.failure.role} failed — ${game.failure.reason}`:
    game?.cancelled?'Stopped · partial replay':pending?`Live · proposal ${(game?.history?.length||0)+1}`:
    row?`${live?'Live':'Replay'} · proposal ${row.round}`:'Waiting for the first proposal';
  root.append(label);
  const track=element('div','decision-track');root.append(track);
  const c=pending?game?.pending_candidate:row?.candidate;
  const before=pending?row?.candidate:previous?.candidate;
  const edits=c&&before?c.flatMap((v,i)=>v!==before[i]?[i]:[]):[];
  const score=row?Number(row.score):null;
  const previousBest=game?.history?.filter(h=>h.round<row?.round).reduce((v,h)=>Math.max(v,Number(h.score)),-Infinity);
  const newBest=row&&score>previousBest;
  const stages=[
    ['1 · M proposes',pending&&!c?'Choosing a candidate…':!c?'Waiting':before?`${edits.length} ${edits.length===1?"attribute":"attributes"} changed`:`${c.length} attributes submitted`,
      before?'Compared with the previous proposal.':'The first proposal has no previous proposal.'],
    ['2 · P responds',pending&&c?'Considering the proposal…':pending||!row?'Waiting':row.weights?`${row.changed?.length||0} ${row.changed?.length===1?"preference":"preferences"} changed`:'Private response',
      row?.weights&&!pending?'Compared with weights before this proposal.':'Preference values are hidden during play.'],
    ['3 · Referee scores',pending||!row?'Awaiting score':fmt(score),
      pending||!row?'The referee scores after P responds.':newBest?(previous?'New best · '+delta(score-previousBest):'First recorded score'):
      `Best stays ${fmt(previousBest)}${previous?' · '+delta(score-Number(previous.score))+' vs previous':''}`]
  ];
  stages.forEach(([title,value,note],i)=>{
    const node=element('section','decision-stage'+(i===2&&newBest&&!pending?' improved':''));
    node.title=note;
    node.append(element('small','',title),element('strong','',value),element('p','',note));track.append(node);
    if(pending&&((i===0&&!c)||(i===1&&c)))node.classList.add('thinking');
    emphasize(node,pending?0:i*160);
  });
  const log=$('change-log');log.replaceChildren();
  log.append(element('h3','','This proposal · changes'));
  if(!row){log.append(element('p','','Completed proposals will show their changes here.'));return;}
  const table=element('table'),head=element('thead'),hr=element('tr');
  for(const t of ['Attribute','Candidate','P weight','Score Δ'])hr.append(element('th','',t));
  const caption=element('caption','','Previous → current · score Δ is the effect of P’s weight edit');table.append(caption);head.append(hr);table.append(head);const body=element('tbody');table.append(body);
  const priorWeights=previous?.weights||(row.round===1?game.original_weights:null);
  const indices=row.candidate.flatMap((v,i)=>((previous&&v!==previous.candidate[i])||(row.weights&&priorWeights&&row.weights[i]!==priorWeights[i]))?[i]:[]);
  if(!indices.length)log.append(element('p','',previous?'No visible attribute changes.':'First proposal: no previous candidate to compare.'));
  else{
    for(const i of indices){
      const tr=element('tr');
      for(const v of [String(i+1).padStart(2,'0'),previous?`${fmt(previous.candidate[i])} → ${fmt(row.candidate[i])}`:fmt(row.candidate[i]),
        priorWeights&&row.weights?`${fmt(priorWeights[i])} → ${fmt(row.weights[i])}`:'Hidden / unavailable',
        priorWeights&&row.weights?delta(row.candidate[i]*(row.weights[i]-priorWeights[i])):'—'])tr.append(element('td','',v));
      body.append(tr);
    }
    const scroll=element('div','table-scroll');scroll.append(table);log.append(scroll);
  }
  if(row.weights&&priorWeights){
    const pre=row.candidate.reduce((sum,v,i)=>sum+v*priorWeights[i],0);
    log.append(element('p','weight-impact',`P edit effect: ${delta(score-pre)} · score ${fmt(pre)} → ${fmt(score)}`));
  }else log.append(element('p','','Weight changes are revealed after the game.'));
  const details=element('details','scoring-note');details.append(element('summary','','How to read these changes'),element('p','','Candidate and P weight compare values before and after this proposal. Score Δ holds the current candidate fixed and measures only P’s weight edit. Values are rounded. Submitted actions and referee results are shown; internal bot reasoning is not available.'));log.append(details);
  if(!pending){emphasize($('current-score'),320);if(newBest)emphasize($('best-score'),480);}
}
